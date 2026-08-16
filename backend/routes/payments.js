import express from 'express';
import PaymentTransaction from '../models/PaymentTransaction.js';
import ParkingSpot from '../models/ParkingSpot.js';
import Fine from '../models/Fine.js';
import { authMiddleware } from '../middleware/auth.js';
import { env } from '../config/env.js';
import {
  createRazorpayOrder,
  getProviderOrderId,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature
} from '../services/paymentService.js';

const router = express.Router();

function hasPermission(req, permission) {
  return req.user?.permissions?.includes(permission);
}

function roundToPaise(amount) {
  return Math.round(Number(amount) * 100);
}

async function markTransactionSuccess(transaction, paymentDetails = {}) {
  if (transaction.status === 'success') {
    return transaction;
  }

  transaction.status = 'success';
  transaction.paidAt = new Date();
  transaction.providerPaymentId =
    paymentDetails.providerPaymentId || transaction.providerPaymentId;
  transaction.providerSignature =
    paymentDetails.providerSignature || transaction.providerSignature;
  if (typeof paymentDetails.webhookVerified === 'boolean') {
    transaction.webhookVerified = paymentDetails.webhookVerified;
  }
  await transaction.save();

  if (transaction.transactionType === 'fine') {
    await Fine.findOneAndUpdate(
      { _id: transaction.referenceId, status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          currency: 'INR'
        }
      }
    );
  }

  if (transaction.transactionType === 'parking') {
    await ParkingSpot.findOneAndUpdate(
      {
        spotId: transaction.referenceId,
        'currentBooking.userId': transaction.userId
      },
      {
        $set: {
          'currentBooking.paymentStatus': 'paid',
          'currentBooking.paymentTransactionId': transaction._id
        }
      }
    );
  }

  return transaction;
}

async function resolvePaymentContext(req, transactionType, referenceId) {
  if (transactionType === 'fine') {
    const fine = await Fine.findById(referenceId);
    if (!fine) {
      return { error: 'Fine not found', status: 404 };
    }
    if (fine.status === 'paid') {
      return { error: 'Fine already paid', status: 400 };
    }

    const canPayAny = hasPermission(req, 'fine:pay:any');
    const canPayOwn = hasPermission(req, 'fine:pay:own');
    const ownsFine = fine.userId?.toString() === req.user.userId;

    if (!canPayAny && !(canPayOwn && ownsFine)) {
      return { error: 'Insufficient permissions for fine payment', status: 403 };
    }

    return {
      amount: fine.amount,
      amountPaise: roundToPaise(fine.amount),
      currency: 'INR',
      ownerUserId: fine.userId || req.user.userId,
      metadata: {
        fineId: fine.fineId,
        violationType: fine.violationType
      }
    };
  }

  if (transactionType === 'parking') {
    const spot = await ParkingSpot.findOne({ spotId: referenceId });
    if (!spot || !spot.currentBooking) {
      return { error: 'Parking booking not found', status: 404 };
    }
    if (spot.currentBooking.paymentStatus === 'paid') {
      return { error: 'Parking already paid', status: 400 };
    }

    const canCreateAny = hasPermission(req, 'payment:create:any');
    const canCreateOwn = hasPermission(req, 'payment:create:own');
    const ownsBooking = spot.currentBooking.userId?.toString() === req.user.userId;

    if (!canCreateAny && !(canCreateOwn && ownsBooking)) {
      return { error: 'Insufficient permissions for parking payment', status: 403 };
    }

    const durationMs = new Date(spot.currentBooking.endTime) - new Date(spot.currentBooking.startTime);
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const amount = Number(spot.pricePerHour || 20) * durationHours;

    return {
      amount,
      amountPaise: roundToPaise(amount),
      currency: 'INR',
      ownerUserId: spot.currentBooking.userId,
      metadata: {
        zone: spot.zone,
        durationHours
      }
    };
  }

  return { error: 'Unsupported transaction type', status: 400 };
}

router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const { transactionType, referenceId } = req.body;
    if (!transactionType || !referenceId) {
      return res.status(400).json({ message: 'transactionType and referenceId are required' });
    }

    const canCreateAny = hasPermission(req, 'payment:create:any');
    const canCreateOwn = hasPermission(req, 'payment:create:own');
    if (!canCreateAny && !canCreateOwn) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const context = await resolvePaymentContext(req, transactionType, referenceId);
    if (context.error) {
      return res.status(context.status).json({ message: context.error });
    }

    const provider = env.PAYMENT_PROVIDER;
    const transaction = new PaymentTransaction({
      transactionType,
      referenceId,
      userId: context.ownerUserId || req.user.userId,
      provider,
      amount: context.amount,
      amountPaise: context.amountPaise,
      currency: 'INR',
      metadata: context.metadata
    });

    let providerOrderId = getProviderOrderId(provider);
    let keyId = null;

    if (provider === 'razorpay') {
      const order = await createRazorpayOrder({
        amountPaise: context.amountPaise,
        receipt: `rcpt_${Date.now()}`,
        notes: {
          transactionType,
          referenceId
        }
      });
      providerOrderId = order.id;
      keyId = env.RAZORPAY_KEY_ID;
    }

    transaction.providerOrderId = providerOrderId;
    await transaction.save();

    // Auto-settle in mock mode to keep local flows frictionless.
    if (provider === 'mock') {
      await markTransactionSuccess(transaction, {
        providerPaymentId: `pay_mock_${Date.now()}`
      });
    }

    return res.status(201).json({
      message: provider === 'mock' ? 'Payment completed in mock mode' : 'Payment order created',
      transactionId: transaction._id,
      provider,
      keyId,
      providerOrderId,
      amount: context.amount,
      amountPaise: context.amountPaise,
      currency: 'INR',
      status: transaction.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { providerOrderId, providerPaymentId, providerSignature } = req.body;
    if (!providerOrderId || !providerPaymentId || !providerSignature) {
      return res.status(400).json({ message: 'Missing payment confirmation fields' });
    }

    const transaction = await PaymentTransaction.findOne({ providerOrderId });
    if (!transaction) {
      return res.status(404).json({ message: 'Payment transaction not found' });
    }

    const canViewAny = hasPermission(req, 'payment:view:any');
    const canViewOwn = hasPermission(req, 'payment:view:own');
    if (!canViewAny && !(canViewOwn && transaction.userId.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (transaction.provider !== 'razorpay') {
      return res.status(400).json({ message: 'Manual confirmation is only for Razorpay transactions' });
    }

    const isValid = verifyRazorpayCheckoutSignature(
      providerOrderId,
      providerPaymentId,
      providerSignature
    );

    if (!isValid) {
      transaction.status = 'failed';
      transaction.providerPaymentId = providerPaymentId;
      transaction.providerSignature = providerSignature;
      await transaction.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await markTransactionSuccess(transaction, {
      providerPaymentId,
      providerSignature,
      webhookVerified: true
    });

    return res.json({ message: 'Payment confirmed and verified', status: 'success' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const canViewAny = hasPermission(req, 'payment:view:any');
    const filter = canViewAny ? {} : { userId: req.user.userId };
    const transactions = await PaymentTransaction.find(filter).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export async function razorpayWebhookHandler(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body?.toString('utf8') || '';

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const providerOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (!providerOrderId) {
      return res.status(200).json({ message: 'No order reference in webhook payload' });
    }

    const transaction = await PaymentTransaction.findOne({ providerOrderId });
    if (!transaction) {
      return res.status(200).json({ message: 'Transaction not found; webhook ignored' });
    }

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      await markTransactionSuccess(transaction, {
        providerPaymentId: paymentEntity?.id || transaction.providerPaymentId,
        providerSignature: signature,
        webhookVerified: true
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export default router;

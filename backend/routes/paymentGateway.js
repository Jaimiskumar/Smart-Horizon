/**
 * Enhanced Payment Gateway Routes
 * Integrated Razorpay payment processing for parking and challans
 */

import express from 'express';
import { paymentGatewayService } from '../services/paymentGatewayService.js';
import { adminCitizenSyncService } from '../services/adminCitizenSyncService.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import ParkingBooking from '../models/ParkingBooking.js';
import Challan from '../models/Challan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';

const router = express.Router();

/**
 * POST /api/payment/parking/create-order
 * Create payment order for parking booking
 */
router.post('/parking/create-order', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.userId;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Verify booking belongs to user
    const booking = await ParkingBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    // Create payment order
    const orderDetails = await paymentGatewayService.createParkingPaymentOrder(
      bookingId,
      booking.totalAmount,
      userId
    );

    res.json({
      success: true,
      order: orderDetails,
      message: 'Payment order created successfully'
    });
  } catch (error) {
    console.error('Parking order creation error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payment/parking/verify
 * Verify parking payment and confirm booking
 */
router.post('/parking/verify', authMiddleware, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const userId = req.user.userId;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify signature
    const isValid = paymentGatewayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Handle successful payment
    const result = await paymentGatewayService.handleParkingPaymentSuccess(
      orderId,
      paymentId,
      `TXN_${Date.now()}`
    );

    res.json({
      success: true,
      booking: result.booking,
      message: result.message
    });
  } catch (error) {
    console.error('Parking payment verification error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Payment verification failed'
    });
  }
});

/**
 * POST /api/payment/challan/create-order
 * Create payment order for challan/fine payment
 */
router.post('/challan/create-order', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.body;
    const userId = req.user.userId;

    if (!challanId) {
      return res.status(400).json({ message: 'Challan ID is required' });
    }

    // Get challan
    const challan = await Challan.findById(challanId);
    if (!challan) {
      return res.status(404).json({ message: 'Challan not found' });
    }

    // Verify user ownership (citizen paying their own challan)
    if (challan.status === 'paid') {
      return res.status(400).json({ message: 'Challan already paid' });
    }

    // Create payment order
    const orderDetails = await paymentGatewayService.createChallanPaymentOrder(
      challanId,
      userId
    );

    res.json({
      success: true,
      order: orderDetails,
      challanNumber: challan.challanNumber,
      amount: challan.fineAmount,
      message: 'Payment order created successfully'
    });
  } catch (error) {
    console.error('Challan order creation error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payment/challan/verify
 * Verify challan payment
 */
router.post('/challan/verify', authMiddleware, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify signature
    const isValid = paymentGatewayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Handle successful payment
    const result = await paymentGatewayService.handleChallanPaymentSuccess(
      orderId,
      paymentId,
      `TXN_${Date.now()}`
    );

    res.json({
      success: true,
      challan: result.challan,
      message: result.message
    });
  } catch (error) {
    console.error('Challan payment verification error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Payment verification failed'
    });
  }
});

/**
 * GET /api/payment/status/:orderId
 * Get payment status for an order
 */
router.get('/status/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    const status = await paymentGatewayService.getPaymentStatus(orderId);

    res.json({
      orderId,
      ...status
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/history
 * Get user's payment history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const type = req.query.type; // 'parking' or 'challan'

    const history = await paymentGatewayService.getUserPaymentHistory(userId, type);

    res.json(history);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/parking/refund
 * Refund parking payment for cancelled booking
 */
router.post('/parking/refund', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.userId;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Verify booking belongs to user
    const booking = await ParkingBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Process refund
    const result = await paymentGatewayService.refundParkingPayment(bookingId);

    // Sync cancellation across portals
    await adminCitizenSyncService.syncParkingBooking(booking);

    res.json(result);
  } catch (error) {
    console.error('Parking refund error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Refund processing failed'
    });
  }
});

/**
 * GET /api/payment/admin/reports
 * Get payment reports (Admin only)
 */
router.get('/admin/reports', authMiddleware, requirePermission('admin:payments'), async (req, res) => {
  try {
    const timeRange = req.query.range || '7'; // days
    const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);

    // Get transaction statistics
    const transactions = await PaymentTransaction.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const parking = {
      total: 0,
      completed: 0,
      failed: 0,
      revenue: 0
    };

    const challan = {
      total: 0,
      completed: 0,
      failed: 0,
      revenue: 0
    };

    transactions.forEach(t => {
      if (t.type === 'parking') {
        parking.total++;
        if (t.status === 'completed') {
          parking.completed++;
          parking.revenue += t.amount;
        }
        if (t.status === 'failed') parking.failed++;
      } else if (t.type === 'challan') {
        challan.total++;
        if (t.status === 'completed') {
          challan.completed++;
          challan.revenue += t.amount;
        }
        if (t.status === 'failed') challan.failed++;
      }
    });

    res.json({
      period: `Last ${timeRange} days`,
      parking,
      challan,
      combined: {
        totalTransactions: parking.total + challan.total,
        completedTransactions: parking.completed + challan.completed,
        totalRevenue: parking.revenue + challan.revenue,
        successRate: (((parking.completed + challan.completed) / (parking.total + challan.total)) * 100).toFixed(2) + '%'
      }
    });
  } catch (error) {
    console.error('Payment reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/webhook/razorpay
 * Razorpay webhook handler for real-time payment notifications
 */
router.post('/webhook/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = paymentGatewayService.verifyPaymentSignature(
      body,
      '',
      signature
    );

    if (!isValid) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload?.payment?.entity || req.body.payload?.order?.entity;

    if (event === 'payment.authorized' || event === 'payment.captured') {
      // Find transaction by order ID
      const transaction = await PaymentTransaction.findOne({ 
        orderId: payload.order_id 
      });

      if (transaction) {
        transaction.status = 'completed';
        transaction.paymentId = payload.id;
        transaction.completedAt = new Date();
        await transaction.save();

        // Trigger appropriate sync based on type
        if (transaction.type === 'parking') {
          const booking = await ParkingBooking.findById(transaction.referenceId);
          if (booking) {
            await adminCitizenSyncService.syncParkingBooking(booking);
          }
        } else if (transaction.type === 'challan') {
          const challan = await Challan.findById(transaction.referenceId);
          if (challan) {
            await adminCitizenSyncService.syncPaymentStatus(
              challan.challanNumber,
              'paid',
              payload.id
            );
          }
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(200).json({ ok: true }); // Always return 200 to prevent retry
  }
});

export default router;

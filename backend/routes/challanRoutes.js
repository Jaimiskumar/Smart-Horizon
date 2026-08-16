/**
 * Challan Management Routes
 * Handles fines/tickets/challans with payment management and citizen interaction
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Challan from '../models/Challan.js';

const router = express.Router();

/**
 * GET /api/challans/my-challans
 * Get all challans for current citizen
 */
router.get('/my-challans', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = { 'vehicleOwner.userId': userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [challans, total] = await Promise.all([
      Challan.find(query)
        .sort({ violationDateTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Challan.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        challans: challans.map(c => ({
          challanId: c._id,
          challanNumber: c.challanNumber,
          vehicleNumber: c.vehicleNumber,
          violationType: c.violationType,
          fineAmount: c.fineAmount,
          status: c.status,
          paymentStatus: c.paymentStatus,
          issueDate: c.violationDateTime,
          dueDate: c.challengeDueDate,
          description: c.description
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: challans.length,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('Challans retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/challans/:challanId
 * Get detailed challan information
 */
router.get('/:challanId', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.params;

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    // Check authorization
    if (challan.vehicleOwner?.userId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      data: {
        challanId: challan._id,
        challanNumber: challan.challanNumber,
        vehicleNumber: challan.vehicleNumber,
        violationType: challan.violationType,
        violationDescription: challan.description,
        location: challan.location,
        violationDateTime: challan.violationDateTime,
        evidence: {
          images: challan.evidenceImages || [],
          cameraId: challan.cameraId
        },
        fineAmount: challan.fineAmount,
        status: challan.status,
        paymentStatus: challan.paymentStatus,
        paymentMethods: challan.paymentMethods,
        challenge: {
          status: challan.challenge?.status,
          dueDate: challan.challengeDueDate,
          description: challan.challenge?.description,
          submittedAt: challan.challenge?.submittedAt
        },
        eChallan: challan.eChallanFormat,
        lastUpdated: challan.updatedAt
      }
    });
  } catch (error) {
    console.error('Challan retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challans/:challanId/challenge
 * Challenge/appeal a challan
 */
router.post('/:challanId/challenge', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.params;
    const { description, evidence } = req.body;
    const userId = req.user.id;

    if (!description) {
      return res.status(400).json({
        error: 'Challenge description is required'
      });
    }

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    // Check authorization
    if (challan.vehicleOwner?.userId?.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already challenged
    if (challan.challenge?.status === 'pending') {
      return res.status(400).json({
        error: 'Challenge already pending for this challan'
      });
    }

    // Check if within challenge period (30 days from issue date)
    const daysSinceIssue = Math.floor(
      (Date.now() - challan.violationDateTime) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceIssue > 30) {
      return res.status(400).json({
        error: 'Challenge period (30 days) has expired'
      });
    }

    challan.challenge = {
      status: 'pending',
      description: description,
      evidence: evidence || [],
      submittedAt: new Date(),
      challengedBy: userId
    };

    challan.status = 'challenged';
    await challan.save();

    res.json({
      success: true,
      data: {
        challanId: challanId,
        status: 'challenged',
        challengeStatus: 'pending',
        message: 'Challenge submitted successfully. Awaiting review.'
      }
    });
  } catch (error) {
    console.error('Challenge submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challans/:challanId/pay
 * Pay a challan
 */
router.post('/:challanId/pay', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.params;
    const { paymentMethod, amount, transactionId } = req.body;
    const userId = req.user.id;

    if (!paymentMethod || !amount) {
      return res.status(400).json({
        error: 'Payment method and amount are required'
      });
    }

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    // Check authorization
    if (challan.vehicleOwner?.userId?.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check payment amount
    if (amount < challan.fineAmount) {
      return res.status(400).json({
        error: `Insufficient payment. Required: ₹${challan.fineAmount}, Provided: ₹${amount}`
      });
    }

    // Check if already paid
    if (challan.paymentStatus === 'paid') {
      return res.status(400).json({
        error: 'This challan has already been paid'
      });
    }

    // Record payment
    challan.paymentDetails = {
      method: paymentMethod,  // 'online', 'upi', 'cash', 'card'
      amount: amount,
      transactionId: transactionId,
      paidAt: new Date(),
      paidBy: userId
    };

    challan.paymentStatus = 'paid';
    challan.status = 'resolved';
    await challan.save();

    res.json({
      success: true,
      data: {
        challanId: challanId,
        paymentStatus: 'paid',
        amount: amount,
        transactionId: transactionId,
        message: 'Payment processed successfully'
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/challans/:challanId/payment-options
 * Get available payment options for a challan
 */
router.get('/:challanId/payment-options', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.params;

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    // Check authorization
    if (challan.vehicleOwner?.userId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const paymentOptions = {
      fineAmount: challan.fineAmount,
      discount: {
        earlyPayment: challan.fineAmount * 0.1,  // 10% discount if paid within 7 days
        applicable: Math.floor(
          (Date.now() - challan.violationDateTime) / (1000 * 60 * 60 * 24)
        ) <= 7
      },
      late: {
        penalty: Math.floor(
          (Date.now() - challan.violationDateTime) / (1000 * 60 * 60 * 24)
        ) > 30 ? challan.fineAmount * 0.25 : 0,
        applicable: Math.floor(
          (Date.now() - challan.violationDateTime) / (1000 * 60 * 60 * 24)
        ) > 30
      },
      methods: ['online', 'upi', 'cash', 'card'],
      dueDate: challan.challengeDueDate
    };

    const finalAmount = paymentOptions.discount.applicable
      ? paymentOptions.fineAmount - paymentOptions.discount.earlyPayment
      : paymentOptions.fineAmount + paymentOptions.late.penalty;

    res.json({
      success: true,
      data: {
        challanId: challanId,
        baseAmount: challan.fineAmount,
        discount: paymentOptions.discount.applicable ? paymentOptions.discount.earlyPayment : 0,
        latePenalty: paymentOptions.late.penalty,
        finalAmount: finalAmount,
        paymentMethods: paymentOptions.methods,
        dueDate: paymentOptions.dueDate
      }
    });
  } catch (error) {
    console.error('Payment options error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challans/:challanId/request-extension
 * Request payment extension/deadline extension
 */
router.post('/:challanId/request-extension', authMiddleware, async (req, res) => {
  try {
    const { challanId } = req.params;
    const { reason, requestedDays } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        error: 'Reason for extension is required'
      });
    }

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    // Check authorization
    if (challan.vehicleOwner?.userId?.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already paid
    if (challan.paymentStatus === 'paid') {
      return res.status(400).json({
        error: 'Cannot extend deadline for paid challan'
      });
    }

    // Add extension request
    challan.extensionRequest = {
      status: 'pending',
      reason: reason,
      requestedDays: requestedDays || 15,
      requestedAt: new Date()
    };

    await challan.save();

    res.json({
      success: true,
      data: {
        challanId: challanId,
        extensionStatus: 'pending',
        requestedDays: requestedDays || 15,
        message: 'Extension request submitted. Awaiting approval.'
      }
    });
  } catch (error) {
    console.error('Extension request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/challans/statistics
 * Get challan statistics for current user or admin dashboard
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    let query = {};
    const userId = req.user.id;

    // If not admin, only get user's own statistics
    if (req.user.role !== 'admin') {
      query['vehicleOwner.userId'] = userId;
    }

    const [total, paid, pending, challenged, resolved] = await Promise.all([
      Challan.countDocuments(query),
      Challan.countDocuments({ ...query, paymentStatus: 'paid' }),
      Challan.countDocuments({ ...query, paymentStatus: 'pending' }),
      Challan.countDocuments({ ...query, status: 'challenged' }),
      Challan.countDocuments({ ...query, status: 'resolved' })
    ]);

    // Calculate amounts
    const paidAmount = await Challan.aggregate([
      { $match: { ...query, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } }
    ]);

    const pendingAmount = await Challan.aggregate([
      { $match: { ...query, paymentStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: total,
          paid: paid,
          pending: pending,
          challenged: challenged,
          resolved: resolved
        },
        amounts: {
          paidAmount: (paidAmount[0]?.total || 0),
          pendingAmount: (pendingAmount[0]?.total || 0)
        },
        statistics: {
          paymentRate: total > 0 ? Math.round((paid / total) * 100) : 0,
          challengeRate: total > 0 ? Math.round((challenged / total) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Statistics retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ADMIN ROUTES
 */

/**
 * GET /api/challans/admin/all
 * Get all challans (admin only)
 */
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can access this' });
    }

    const { status, paymentStatus, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;

    const [challans, total] = await Promise.all([
      Challan.find(query)
        .sort({ violationDateTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Challan.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        challans: challans.map(c => ({
          challanId: c._id,
          challanNumber: c.challanNumber,
          vehicleNumber: c.vehicleNumber,
          violationType: c.violationType,
          fineAmount: c.fineAmount,
          status: c.status,
          paymentStatus: c.paymentStatus,
          issueDate: c.violationDateTime
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: challans.length,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('Admin challans retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/challans/:challanId/admin/review-challenge
 * Review and decide on challenge (admin only)
 */
router.patch('/:challanId/admin/review-challenge', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can perform this action' });
    }

    const { challanId } = req.params;
    const { decision, comments } = req.body;  // decision: 'approved', 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: 'Decision must be "approved" or "rejected"'
      });
    }

    const challan = await Challan.findById(challanId);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    if (challan.challenge?.status !== 'pending') {
      return res.status(400).json({
        error: 'No pending challenge for this challan'
      });
    }

    // Update challenge decision
    challan.challenge.decision = decision;
    challan.challenge.decidedAt = new Date();
    challan.challenge.decisionComments = comments;
    challan.challenge.status = 'decided';

    if (decision === 'approved') {
      challan.status = 'challenge_approved';
      challan.paymentStatus = 'waived';
    } else {
      challan.status = 'challenge_rejected';
    }

    await challan.save();

    res.json({
      success: true,
      data: {
        challanId: challanId,
        challengeDecision: decision,
        challanStatus: challan.status,
        message: `Challenge ${decision}`
      }
    });
  } catch (error) {
    console.error('Challenge review error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Citizen Report Routes
 * Handles citizen encroachment reports, evidence, verification, and rewards
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as reportService from '../services/citizenReportVerificationService.js';
import CitizenEncroachmentReport from '../models/CitizenEncroachmentReport.js';

const router = express.Router();

/**
 * POST /api/citizen-reports/encroachment
 * Submit a new encroachment report
 */
router.post('/encroachment', authMiddleware, async (req, res) => {
  try {
    const {
      reportType,
      description,
      location,
      imageUrls,
      vehicleNumber,
      additionalDetails
    } = req.body;
    const reporterId = req.user.id;

    if (!reportType || !description || !location || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({
        error: 'reportType, description, location, and at least one image are required'
      });
    }

    const newReport = new CitizenEncroachmentReport({
      reporterId,
      reportType,
      description,
      location,
      imageUrls,
      vehicleNumber,
      additionalDetails,
      status: 'submitted'
    });

    await newReport.save();

    // Start ML verification process asynchronously
    reportService.processAndVerifyReport(newReport._id).catch(err => {
      console.error('Async verification failed:', err);
    });

    res.status(201).json({
      success: true,
      data: {
        reportId: newReport._id,
        status: newReport.status,
        message: 'Report submitted successfully. ML verification in progress...'
      }
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/citizen-reports/my-reports
 * Get all reports submitted by current user
 */
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = { reporterId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      CitizenEncroachmentReport.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CitizenEncroachmentReport.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports: reports.map(report => ({
          reportId: report._id,
          reportType: report.reportType,
          status: report.status,
          description: report.description,
          location: report.location,
          imageCount: (report.imageUrls || []).length,
          createdAt: report.createdAt,
          mlVerification: {
            verified: report.mlVerification.verified,
            confidence: report.mlVerification.confidence
          },
          reward: report.reward
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: reports.length,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('Reports retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/citizen-reports/:reportId
 * Get detailed information about a specific report
 */
router.get('/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await CitizenEncroachmentReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check authorization - user can only view their own reports unless admin
    if (report.reporterId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json({
      success: true,
      data: {
        reportId: report._id,
        reportType: report.reportType,
        status: report.status,
        description: report.description,
        location: report.location,
        imageUrls: report.imageUrls,
        vehicleNumber: report.vehicleNumber,
        additionalDetails: report.additionalDetails,
        additionalEvidence: report.additionalEvidence,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        mlVerification: {
          verified: report.mlVerification.verified,
          confidence: report.mlVerification.confidence,
          verificationStatus: report.mlVerification.verificationStatus,
          details: report.mlVerification.details,
          rejectionReasons: report.mlVerification.rejectionReasons
        },
        adminReview: {
          status: report.adminReview.status,
          reviewedBy: report.adminReview.reviewedBy,
          decision: report.adminReview.decision,
          comments: report.adminReview.comments
        },
        challanGenerated: report.challanGenerated,
        reward: report.reward,
        feedback: report.feedback,
        qualityScore: reportService.getReportQualityScore(report)
      }
    });
  } catch (error) {
    console.error('Report retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/citizen-reports/:reportId/add-evidence
 * Add additional evidence to a report
 */
router.post('/:reportId/add-evidence', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { type, url, description } = req.body;
    const userId = req.user.id;

    if (!type || !url) {
      return res.status(400).json({
        error: 'Evidence type and URL are required'
      });
    }

    // Verify ownership
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report || report.reporterId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await reportService.addEvidenceToReport(reportId, {
      type,
      url,
      description
    });

    res.json({
      success: true,
      data: result,
      message: 'Evidence added successfully'
    });
  } catch (error) {
    console.error('Evidence addition error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/citizen-reports/:reportId/withdraw
 * Withdraw a report (only if not yet verified/acted upon)
 */
router.patch('/:reportId/withdraw', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await CitizenEncroachmentReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check ownership
    if (report.reporterId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only withdraw if not yet processed
    if (['admin_review', 'action_taken', 'resolved', 'challan_generated'].includes(report.status)) {
      return res.status(400).json({
        error: 'Cannot withdraw report in current status'
      });
    }

    report.status = 'withdrawn';
    report.withdrawnAt = new Date();
    await report.save();

    res.json({
      success: true,
      data: {
        reportId: reportId,
        status: 'withdrawn',
        message: 'Report withdrawn successfully'
      }
    });
  } catch (error) {
    console.error('Report withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/citizen-reports/:reportId/feedback
 * Submit feedback and rating for a report outcome
 */
router.post('/:reportId/feedback', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    const report = await CitizenEncroachmentReport.findById(reportId);

    if (!report || report.reporterId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    report.feedback = {
      rating,
      comments: feedback,
      providedAt: new Date()
    };

    await report.save();

    res.json({
      success: true,
      data: {
        reportId: reportId,
        feedback: report.feedback,
        message: 'Feedback submitted successfully'
      }
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/citizen-reports/rewards/pending
 * Get pending rewards for user
 */
router.get('/rewards/pending', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.id;

    const reports = await CitizenEncroachmentReport.find({
      reporterId,
      'reward.status': 'pending_approval'
    }).select('_id reportType reward mlVerification');

    const totalPoints = reports.reduce((sum, report) => sum + (report.reward?.points || 0), 0);
    const totalAmount = reports.reduce((sum, report) => sum + (report.reward?.amount || 0), 0);

    res.json({
      success: true,
      data: {
        pendingRewards: reports.map(r => ({
          reportId: r._id,
          reportType: r.reportType,
          points: r.reward.points,
          amount: r.reward.amount,
          tier: r.reward.tier
        })),
        summary: {
          count: reports.length,
          totalPoints,
          totalAmount,
          estimatedValue: `₹${totalAmount}`
        }
      }
    });
  } catch (error) {
    console.error('Pending rewards retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/citizen-reports/rewards/earned
 * Get earned/redeemed rewards for user
 */
router.get('/rewards/earned', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.id;

    const reports = await CitizenEncroachmentReport.find({
      reporterId,
      'reward.status': { $in: ['approved', 'redeemed'] }
    }).select('_id reportType reward createdAt');

    const totalPoints = reports.reduce((sum, report) => sum + (report.reward?.points || 0), 0);
    const totalAmount = reports.reduce((sum, report) => sum + (report.reward?.amount || 0), 0);

    res.json({
      success: true,
      data: {
        earnedRewards: reports.map(r => ({
          reportId: r._id,
          reportType: r.reportType,
          points: r.reward.points,
          amount: r.reward.amount,
          tier: r.reward.tier,
          status: r.reward.status,
          earnedDate: r.createdAt
        })),
        summary: {
          count: reports.length,
          totalPoints,
          totalAmount,
          totalValue: `₹${totalAmount}`
        }
      }
    });
  } catch (error) {
    console.error('Earned rewards retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ADMIN ROUTES - Report Management
 */

/**
 * PATCH /api/citizen-reports/:reportId/admin-review
 * Admin review and decision on a report
 */
router.patch('/:reportId/admin-review', authMiddleware, async (req, res) => {
  try {
    // Only admin can perform admin actions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can perform this action' });
    }

    const { reportId } = req.params;
    const { decision, comments } = req.body;

    const report = await CitizenEncroachmentReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.adminReview = {
      status: 'reviewed',
      reviewedBy: req.user.id,
      decision: decision,  // 'approved', 'rejected', 'needs_more_info'
      comments: comments,
      reviewedAt: new Date()
    };

    report.status = report.adminReview.decision === 'approved' ? 'action_taken' : 'admin_review';

    // Generate challan if approved and verified
    if (report.mlVerification.verified && decision === 'approved') {
      await reportService.generateChallanFromReport(reportId);
      await reportService.calculateCitizenReward(reportId);
    }

    await report.save();

    res.json({
      success: true,
      data: {
        reportId: reportId,
        status: report.status,
        adminDecision: decision,
        message: 'Admin review completed'
      }
    });
  } catch (error) {
    console.error('Admin review error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/citizen-reports/:reportId/escalate
 * Escalate report to admin review (by ML verification service)
 */
router.post('/:reportId/escalate', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;

    const result = await reportService.escalateToAdminReview(reportId, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Escalation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/citizen-reports/admin/pending
 * Get all reports pending admin review
 */
router.get('/admin/pending-reviews', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can access this' });
    }

    const reports = await CitizenEncroachmentReport.find({
      status: 'admin_review'
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: {
        count: reports.length,
        reports: reports.map(r => ({
          reportId: r._id,
          reportType: r.reportType,
          status: r.status,
          mlVerified: r.mlVerification.verified,
          mlConfidence: r.mlVerification.confidence,
          submittedAt: r.createdAt,
          escaloationReason: r.adminReview.escalationReason
        }))
      }
    });
  } catch (error) {
    console.error('Pending reviews retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

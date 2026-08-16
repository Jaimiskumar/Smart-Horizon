/**
 * Street Encroachment Routes
 * Handles detection and management of hawkers, vendors, and street blockages
 */

import express from 'express';
import StreetEncroachment from '../models/StreetEncroachment.js';
import { authMiddleware } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

/**
 * POST /api/street-encroachment
 * Create street encroachment record from ML detection
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      encroachmentType,
      location,
      latitude,
      longitude,
      cameraId,
      crowdSize,
      roadBlockagePercentage,
      imageUrl,
      videoUrl,
      severity,
      description,
      notes
    } = req.body;

    if (!encroachmentType || !location || !cameraId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const encroachment = new StreetEncroachment({
      encroachmentType,
      location,
      latitude,
      longitude,
      cameraId,
      crowdSize: crowdSize || 0,
      roadBlockagePercentage: roadBlockagePercentage || 0,
      imageUrl,
      videoUrl,
      timestamp: new Date(),
      severity: severity || 'medium',
      status: roadBlockagePercentage > 60 ? 'reported' : 'detected',
      description,
      notes
    });

    await encroachment.save();

    // Emit real-time alert via WebSocket
    if (roadBlockagePercentage > 60) {
      io.emit('street_encroachment_alert', {
        encroachmentId: encroachment._id,
        location: location,
        severity: encroachment.severity,
        crowdSize: crowdSize,
        blockagePercentage: roadBlockagePercentage,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Street encroachment recorded',
      encroachment
    });
  } catch (error) {
    console.error('Error creating street encroachment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/street-encroachment
 * Get all street encroachments with filtering
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      encroachmentType,
      location,
      status,
      severity,
      cameraId,
      startDate,
      endDate,
      limit = 50,
      page = 1
    } = req.query;

    const filter = {};

    if (encroachmentType) filter.encroachmentType = encroachmentType;
    if (location) filter.location = new RegExp(location, 'i');
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (cameraId) filter.cameraId = cameraId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const encroachments = await StreetEncroachment.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await StreetEncroachment.countDocuments(filter);

    res.json({
      encroachments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching street encroachments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/street-encroachment/:id
 * Get specific encroachment details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const encroachment = await StreetEncroachment.findById(req.params.id);

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    res.json(encroachment);
  } catch (error) {
    console.error('Error fetching encroachment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/street-encroachment/:id
 * Update encroachment status and details
 */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, actionTaken, respondent, notes } = req.body;

    const encroachment = await StreetEncroachment.findById(req.params.id);

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    if (status) encroachment.status = status;
    if (actionTaken) {
      encroachment.actionTaken = actionTaken;
      encroachment.actionDate = new Date();
    }
    if (respondent) encroachment.respondent = respondent;
    if (notes) encroachment.notes = notes;

    await encroachment.save();

    // Emit update via WebSocket
    io.emit('street_encroachment_update', {
      encroachmentId: encroachment._id,
      status: encroachment.status,
      actionTaken: encroachment.actionTaken
    });

    res.json({
      message: 'Encroachment updated',
      encroachment
    });
  } catch (error) {
    console.error('Error updating encroachment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/street-encroachment/:id/send-alert
 * Send immediate alert to authorities
 */
router.post('/:id/send-alert', authMiddleware, async (req, res) => {
  try {
    const encroachment = await StreetEncroachment.findById(req.params.id);

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    encroachment.status = 'reported';
    await encroachment.save();

    // Emit urgent alert
    io.emit('street_encroachment_urgent_alert', {
      encroachmentId: encroachment._id,
      location: encroachment.location,
      encroachmentType: encroachment.encroachmentType,
      crowdSize: encroachment.crowdSize,
      blockagePercentage: encroachment.roadBlockagePercentage,
      imageUrl: encroachment.imageUrl,
      timestamp: new Date(),
      priority: 'high'
    });

    res.json({
      message: 'Alert sent to authorities',
      encroachment
    });
  } catch (error) {
    console.error('Error sending alert:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/street-encroachment/:id/resolve
 * Mark encroachment as resolved/cleared
 */
router.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { actionTaken, respondent } = req.body;

    const encroachment = await StreetEncroachment.findById(req.params.id);

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    encroachment.status = 'cleared';
    encroachment.actionTaken = actionTaken || 'Encroachment cleared';
    encroachment.actionDate = new Date();
    if (respondent) encroachment.respondent = respondent;

    await encroachment.save();

    res.json({
      message: 'Encroachment marked as resolved',
      encroachment
    });
  } catch (error) {
    console.error('Error resolving encroachment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/street-encroachment/stats/summary
 * Get street encroachment statistics
 */
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const total = await StreetEncroachment.countDocuments(filter);
    const byType = await StreetEncroachment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$encroachmentType',
          count: { $sum: 1 }
        }
      }
    ]);

    const bySeverity = await StreetEncroachment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const byStatus = await StreetEncroachment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const avgBlockage = await StreetEncroachment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgBlockage: { $avg: '$roadBlockagePercentage' },
          avgCrowd: { $avg: '$crowdSize' }
        }
      }
    ]);

    res.json({
      total,
      byType,
      bySeverity,
      byStatus,
      averageMetrics: avgBlockage[0] || { avgBlockage: 0, avgCrowd: 0 }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

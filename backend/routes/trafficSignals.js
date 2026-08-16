/**
 * Traffic Signal & Congestion Routes
 * Handles congestion detection, signal timing optimization, and adaptive control
 */

import express from 'express';
import TrafficSignal from '../models/TrafficSignal.js';
import MLDetectionLog from '../models/MLDetectionLog.js';
import { authMiddleware } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

/**
 * GET /api/traffic-signals
 * Get all traffic signals with current status
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { location, status, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (location) filter.location = new RegExp(location, 'i');
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const signals = await TrafficSignal.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await TrafficSignal.countDocuments(filter);

    // Enrich with recent detection data
    const enrichedSignals = await Promise.all(
      signals.map(async (signal) => {
        const recentDetections = await MLDetectionLog.findOne(
          { cameraId: signal.cameraId, detectionType: 'congestion_high' },
          {},
          { sort: { timestamp: -1 } }
        );

        return {
          ...signal.toObject(),
          recentCongestion: recentDetections?.detectionDetails || null
        };
      })
    );

    res.json({
      signals: enrichedSignals,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching traffic signals:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/traffic-signals/:signalId
 * Get specific traffic signal
 */
router.get('/:signalId', authMiddleware, async (req, res) => {
  try {
    const signal = await TrafficSignal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    res.json(signal);
  } catch (error) {
    console.error('Error fetching signal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/traffic-signals/:signalId/status
 * Update signal status (Green, Yellow, Red)
 */
router.patch('/:signalId/status', authMiddleware, async (req, res) => {
  try {
    const { status, duration, controlMode } = req.body;

    if (!['green', 'yellow', 'red'].includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid signal status' });
    }

    const signal = await TrafficSignal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    signal.currentSignal = status.toLowerCase();
    if (duration) signal.greenDuration = duration;
    if (controlMode) signal.controlMode = controlMode;
    signal.lastUpdated = new Date();

    await signal.save();

    // Emit real-time update
    io.emit('signal_status_change', {
      signalId: signal._id,
      location: signal.location,
      status: signal.currentSignal,
      duration: signal.greenDuration,
      timestamp: new Date()
    });

    res.json({
      message: 'Signal status updated',
      signal
    });
  } catch (error) {
    console.error('Error updating signal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/traffic-signals/:signalId/analyze-congestion
 * Analyze congestion and get recommended signal timing
 */
router.post('/:signalId/analyze-congestion', authMiddleware, async (req, res) => {
  try {
    const { vehicleCount, congestionLevel, cameraFeed } = req.body;

    const signal = await TrafficSignal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    // Calculate optimal timing based on congestion
    const recommendedTiming = calculateOptimalTiming(
      vehicleCount,
      congestionLevel,
      signal.defaultGreenDuration
    );

    // Log the detection
    await MLDetectionLog.create({
      cameraId: signal.cameraId,
      detectionType: congestionLevel > 75 ? 'congestion_high' : 'congestion_medium',
      detectionDetails: {
        vehicleCount,
        congestionLevel,
        recommendedDuration: recommendedTiming.duration
      },
      timestamp: new Date(),
      processingStatus: 'completed'
    });

    res.json({
      vehicleCount,
      congestionLevel,
      currentSignalStatus: signal.currentSignal,
      currentGreenDuration: signal.greenDuration,
      recommendedTiming,
      optimizationEnabled: signal.adaptiveControl
    });
  } catch (error) {
    console.error('Error analyzing congestion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/traffic-signals/:signalId/apply-adaptive-timing
 * Apply ML-recommended timing to signal
 */
router.post('/:signalId/apply-adaptive-timing', authMiddleware, async (req, res) => {
  try {
    const { recommendedDuration, congestionLevel } = req.body;

    const signal = await TrafficSignal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    if (!signal.adaptiveControl) {
      return res.status(400).json({ message: 'Adaptive control is not enabled for this signal' });
    }

    // Update timing
    const oldDuration = signal.greenDuration;
    signal.greenDuration = Math.min(
      Math.max(recommendedDuration, signal.minimumGreenTime),
      signal.maximumGreenTime
    );
    signal.lastUpdated = new Date();

    await signal.save();

    // Emit timing change
    io.emit('signal_timing_adjusted', {
      signalId: signal._id,
      location: signal.location,
      oldDuration,
      newDuration: signal.greenDuration,
      congestionLevel,
      timestamp: new Date()
    });

    res.json({
      message: 'Adaptive timing applied',
      signal,
      timingAdjustment: {
        from: oldDuration,
        to: signal.greenDuration,
        change: signal.greenDuration - oldDuration
      }
    });
  } catch (error) {
    console.error('Error applying adaptive timing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/traffic-signals/:signalId/toggle-adaptive-control
 * Enable/disable adaptive control
 */
router.patch('/:signalId/toggle-adaptive-control', authMiddleware, async (req, res) => {
  try {
    const { adaptiveControl } = req.body;

    const signal = await TrafficSignal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    signal.adaptiveControl = adaptiveControl;
    signal.lastUpdated = new Date();

    await signal.save();

    res.json({
      message: `Adaptive control ${adaptiveControl ? 'enabled' : 'disabled'}`,
      signal
    });
  } catch (error) {
    console.error('Error toggling adaptive control:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/traffic-signals/stats/congestion
 * Get congestion statistics
 */
router.get('/stats/congestion', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { detectionType: { $in: ['congestion_high', 'congestion_medium'] } };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const congestionEvents = await MLDetectionLog.find(filter).sort({ timestamp: -1 }).limit(100);

    const avgCongestionByLocation = await MLDetectionLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$cameraId',
          avgCongestion: { $avg: '$detectionDetails.congestionLevel' },
          eventCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      recentEvents: congestionEvents,
      statistics: avgCongestionByLocation
    });
  } catch (error) {
    console.error('Error fetching congestion stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Calculate optimal signal timing based on congestion
 * AI/ML algorithm for adaptive signal timing
 */
function calculateOptimalTiming(vehicleCount, congestionLevel, defaultDuration) {
  let duration = defaultDuration;

  // Increase duration if high congestion
  if (congestionLevel > 85) {
    duration = Math.round(defaultDuration * 1.5);
  } else if (congestionLevel > 70) {
    duration = Math.round(defaultDuration * 1.3);
  } else if (congestionLevel > 50) {
    duration = Math.round(defaultDuration * 1.1);
  } else if (congestionLevel < 20) {
    duration = Math.round(defaultDuration * 0.7);
  }

  // Clamp between reasonable limits (15-90 seconds)
  duration = Math.max(15, Math.min(90, duration));

  return {
    duration,
    confidence: Math.min(0.95, 0.5 + congestionLevel / 200),
    algorithm: 'adaptive_congestion_based',
    vehicleBasedAdjustment: calculateVehicleBasedFactor(vehicleCount)
  };
}

/**
 * Calculate timing factor based on vehicle count
 */
function calculateVehicleBasedFactor(vehicleCount) {
  if (vehicleCount > 1000) return 1.5;
  if (vehicleCount > 800) return 1.3;
  if (vehicleCount > 600) return 1.1;
  if (vehicleCount < 100) return 0.7;
  return 1.0;
}

export default router;

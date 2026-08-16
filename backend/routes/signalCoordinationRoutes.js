/**
 * Signal Coordination Routes
 * Manages inter-signal coordination for traffic optimization
 * Admin-only endpoints for creating and managing signal corridors
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as signalCoordinationService from '../services/signalCoordinationService.js';
import SignalCoordination from '../models/SignalCoordination.js';
import TrafficSignal from '../models/TrafficSignal.js';

const router = express.Router();

/**
 * POST /api/signal-coordination/corridor
 * Create a new signal coordination corridor
 */
router.post('/corridor', authMiddleware, async (req, res) => {
  try {
    // Only admin can create corridors
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can create signal corridors'
      });
    }

    const {
      corridor,
      signals,
      coordinationMode,
      timingPlan,
      flowOptimization
    } = req.body;

    if (!corridor || !signals || signals.length < 2) {
      return res.status(400).json({
        error: 'Corridor name and at least 2 signals are required'
      });
    }

    const newCoordination = new SignalCoordination({
      coordinator: req.user.id,
      corridor,
      signals: signals.map(s => ({
        signalId: s.signalId,
        direction: s.direction,
        distanceFromPrevious: s.distanceFromPrevious || 500
      })),
      coordinationMode: coordinationMode || 'webster',
      timingPlan: timingPlan || {
        cycleLength: 120,
        offsetBetweenSignals: []
      },
      flowOptimization: flowOptimization || {
        targetSpeed: 40,
        adaptiveOffset: false
      },
      status: 'active'
    });

    await newCoordination.save();

    res.status(201).json({
      success: true,
      data: {
        coordinationId: newCoordination.coordinationId,
        corridor: newCoordination.corridor,
        signalCount: newCoordination.signals.length,
        coordinationMode: newCoordination.coordinationMode,
        status: newCoordination.status,
        message: 'Signal corridor created successfully'
      }
    });
  } catch (error) {
    console.error('Corridor creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/signal-coordination/corridor/:corridorId
 * Get details of a signal coordination corridor
 */
router.get('/corridor/:corridorId', authMiddleware, async (req, res) => {
  try {
    const { corridorId } = req.params;

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Signal coordination not found'
      });
    }

    res.json({
      success: true,
      data: {
        coordinationId: coordination.coordinationId,
        corridor: coordination.corridor,
        signals: coordination.signals,
        coordinationMode: coordination.coordinationMode,
        timingPlan: coordination.timingPlan,
        flowOptimization: coordination.flowOptimization,
        metrics: coordination.metrics,
        effectiveness: coordination.effectiveness,
        status: coordination.status,
        createdAt: coordination.createdAt,
        updatedAt: coordination.updatedAt
      }
    });
  } catch (error) {
    console.error('Corridor retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/signal-coordination/list
 * Get all signal coordination corridors
 */
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [corridors, total] = await Promise.all([
      SignalCoordination.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SignalCoordination.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        corridors: corridors.map(c => ({
          coordinationId: c.coordinationId,
          corridor: c.corridor,
          signalCount: c.signals.length,
          coordinationMode: c.coordinationMode,
          status: c.status,
          effectiveness: c.effectiveness,
          lastUpdated: c.metrics.lastUpdated
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: corridors.length,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('Corridors list retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/signal-coordination/corridor/:corridorId/timing
 * Update timing plan for a corridor
 */
router.patch('/corridor/:corridorId/timing', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can update signal timings'
      });
    }

    const { corridorId } = req.params;
    const { cycleLength, offsetBetweenSignals } = req.body;

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    if (cycleLength) {
      coordination.timingPlan.cycleLength = cycleLength;
    }
    if (offsetBetweenSignals) {
      coordination.timingPlan.offsetBetweenSignals = offsetBetweenSignals;
    }

    await coordination.save();

    // Apply the timing to actual signals
    const applyResult = await signalCoordinationService.applyCoordinatedTiming(
      coordinationId,
      coordination.timingPlan
    );

    res.json({
      success: true,
      data: {
        coordinationId: coordinationId,
        updatedTiming: coordination.timingPlan,
        appliedSignals: applyResult.appliedSignals,
        message: 'Signal timings updated and applied'
      }
    });
  } catch (error) {
    console.error('Timing update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/signal-coordination/corridor/:corridorId/algorithm
 * Switch coordination algorithm for a corridor
 */
router.post('/corridor/:corridorId/algorithm', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can change algorithms'
      });
    }

    const { corridorId } = req.params;
    const { algorithm } = req.body;

    const validAlgorithms = ['webster', 'scoot', 'scats', 'ai_based', 'custom'];
    if (!validAlgorithms.includes(algorithm)) {
      return res.status(400).json({
        error: `Invalid algorithm. Valid options: ${validAlgorithms.join(', ')}`
      });
    }

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    coordination.coordinationMode = algorithm;
    await coordination.save();

    res.json({
      success: true,
      data: {
        coordinationId: corridorId,
        newAlgorithm: algorithm,
        message: `Algorithm switched to ${algorithm}`
      }
    });
  } catch (error) {
    console.error('Algorithm switch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/signal-coordination/corridor/:corridorId/green-wave
 * Enable green wave for a corridor
 */
router.post('/corridor/:corridorId/green-wave', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can enable green wave'
      });
    }

    const { corridorId } = req.params;

    const result = await signalCoordinationService.enableGreenWave(corridorId);

    res.json({
      success: true,
      data: result,
      message: 'Green wave enabled for corridor'
    });
  } catch (error) {
    console.error('Green wave enablement error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/signal-coordination/corridor/:corridorId/metrics
 * Get performance metrics for a corridor
 */
router.get('/corridor/:corridorId/metrics', authMiddleware, async (req, res) => {
  try {
    const { corridorId } = req.params;

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    // Monitor current performance
    const performanceUpdate = await signalCoordinationService.monitorCoordinationPerformance(
      coordinationId
    );

    res.json({
      success: true,
      data: {
        coordinationId: corridorId,
        corridor: coordination.corridor,
        metrics: performanceUpdate.metrics,
        effectiveness: performanceUpdate.effectiveness,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Metrics retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/signal-coordination/corridor/:corridorId/environmental-impact
 * Get environmental impact metrics (emissions, fuel savings)
 */
router.get('/corridor/:corridorId/environmental-impact', authMiddleware, async (req, res) => {
  try {
    const { corridorId } = req.params;

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    const envMetrics = {
      signalCount: coordination.signals.length,
      coordinationMode: coordination.coordinationMode,
      emissions: {
        estimatedReduction: coordination.effectiveness?.emissionReduction || 20,
        unit: 'percentage',
        co2SavingsPerDay: `${(coordination.signals.length * 15).toFixed(1)} kg CO2`
      },
      fuel: {
        estimatedSavings: `${(coordination.signals.length * 2).toFixed(1)} liters/day`,
        costSavings: `₹${(coordination.signals.length * 2 * 100).toFixed(0)}/day`
      },
      traffic: {
        averageCongestion: coordination.metrics?.averageCongestion || 0,
        averageDelay: coordination.metrics?.averageDelay || 0,
        vehiclesThroughput: coordination.metrics?.vehicleThroughput || 0
      },
      lastCalculated: coordination.metrics?.lastUpdated || new Date()
    };

    res.json({
      success: true,
      data: envMetrics
    });
  } catch (error) {
    console.error('Environmental impact retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/signal-coordination/corridor/:corridorId/status
 * Update coordination status (active/inactive)
 */
router.patch('/corridor/:corridorId/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can update status'
      });
    }

    const { corridorId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Options: active, inactive, maintenance'
      });
    }

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    coordination.status = status;
    await coordination.save();

    res.json({
      success: true,
      data: {
        coordinationId: corridorId,
        status: coordination.status,
        message: `Coordination status updated to ${status}`
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/signal-coordination/corridor/:corridorId
 * Delete a signal coordination corridor
 */
router.delete('/corridor/:corridorId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can delete corridors'
      });
    }

    const { corridorId } = req.params;

    const coordination = await SignalCoordination.findOne({
      coordinationId: corridorId
    });

    if (!coordination) {
      return res.status(404).json({
        error: 'Coordination not found'
      });
    }

    await SignalCoordination.deleteOne({ coordinationId: corridorId });

    res.json({
      success: true,
      data: {
        coordinationId: corridorId,
        message: 'Signal corridor deleted successfully'
      }
    });
  } catch (error) {
    console.error('Corridor deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

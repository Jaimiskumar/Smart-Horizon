import express from 'express';
import TrafficSignal from '../models/TrafficSignal.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

router.get('/signals', authMiddleware, requirePermission('traffic:read'), async (req, res) => {
  try {
    const signals = await TrafficSignal.find().sort({ signalId: 1 });
    res.json(signals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/signals/:id', authMiddleware, requirePermission('traffic:read'), async (req, res) => {
  try {
    const signal = await TrafficSignal.findOne({ signalId: req.params.id });
    res.json(signal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/signals/:id', authMiddleware, requirePermission('traffic:update'), async (req, res) => {
  try {
    const signal = await TrafficSignal.findOneAndUpdate(
      { signalId: req.params.id },
      req.body,
      { new: true }
    );

    await logAudit({
      req,
      action: 'traffic.signal-update',
      resourceType: 'traffic_signal',
      resourceId: req.params.id,
      metadata: { updates: req.body }
    });

    res.json(signal);
  } catch (error) {
    await logAudit({
      req,
      action: 'traffic.signal-update',
      resourceType: 'traffic_signal',
      resourceId: req.params.id,
      status: 'failure',
      metadata: { error: error.message }
    });
    res.status(500).json({ message: error.message });
  }
});

router.post(
  '/signals/:id/manual-control',
  authMiddleware,
  requirePermission('traffic:manual-control'),
  async (req, res) => {
    try {
      const { status, timer } = req.body;
      const signal = await TrafficSignal.findOneAndUpdate(
        { signalId: req.params.id },
        { status, currentTimer: timer, mode: 'manual' },
        { new: true }
      );

      await logAudit({
        req,
        action: 'traffic.manual-control',
        resourceType: 'traffic_signal',
        resourceId: req.params.id,
        metadata: { status, timer }
      });

      res.json(signal);
    } catch (error) {
      await logAudit({
        req,
        action: 'traffic.manual-control',
        resourceType: 'traffic_signal',
        resourceId: req.params.id,
        status: 'failure',
        metadata: { error: error.message }
      });
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

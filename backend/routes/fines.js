import express from 'express';
import Fine from '../models/Fine.js';
import User from '../models/User.js';
import { io } from '../server.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const canReadAll = req.user.permissions?.includes('fine:read');
    let filter = {};
    
    if (!canReadAll) {
      // For citizens, find fines matching their userId OR their vehicleNumber
      const user = await User.findById(req.user.userId);
      
      const orConditions = [{ userId: req.user.userId }];
      
      // Only filter by vehicleNumber if the user actually has one set
      if (user?.vehicleNumber && user.vehicleNumber.trim() !== "") {
        orConditions.push({ vehicleNumber: user.vehicleNumber });
      }
      
      filter = { $or: orConditions };
    }

    const fines = await Fine.find(filter).populate('userId', 'name email').sort({ issuedAt: -1 });
    res.json(fines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/issue', authMiddleware, requirePermission('fine:issue'), async (req, res) => {
  try {
    let { vehicleNumber, violationType, amount, location, imageUrl } = req.body;
    
    // Normalize vehicle number (uppercase, no spaces/dashes)
    const normalizedNumber = vehicleNumber ? vehicleNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '';
    
    const owner = await User.findOne({ vehicleNumber: normalizedNumber });

    const fineId = `FINE${Date.now()}`;
    const fine = new Fine({
      fineId,
      userId: owner?._id || null,
      vehicleNumber: normalizedNumber || vehicleNumber,
      violationType,
      amount,
      currency: 'INR',
      location: typeof location === 'string' ? { name: location } : location,
      imageUrl,
      status: 'pending',
      warningIssued: true,
      warningTime: new Date(),
      issuedAt: new Date()
    });

    await fine.save();

    // Notify citizen in real-time
    io.emit('new-fine', {
        userId: owner?._id,
        vehicleNumber: normalizedNumber,
        fineId: fine.fineId
    });

    await logAudit({
      req,
      action: 'fine.issue',
      resourceType: 'fine',
      resourceId: fine._id.toString(),
      metadata: {
        fineId: fine.fineId,
        vehicleNumber,
        amount,
        currency: 'INR'
      }
    });

    res.status(201).json(fine);
  } catch (error) {
    await logAudit({
      req,
      action: 'fine.issue',
      resourceType: 'fine',
      status: 'failure',
      metadata: { error: error.message }
    });
    res.status(500).json({ message: error.message });
  }
});

// Backward-compatible endpoint. Real payment flow is now handled by /api/payments/orders.
router.post('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    const canPayAny = req.user.permissions?.includes('fine:pay:any');
    const canPayOwn = req.user.permissions?.includes('fine:pay:own');
    const ownsFine = fine.userId?.toString() === req.user.userId;

    if (!canPayAny && !(canPayOwn && ownsFine)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (env.PAYMENT_PROVIDER !== 'mock') {
      return res.status(400).json({
        message: 'Use /api/payments/orders for fine payments when payment provider is enabled'
      });
    }

    fine.status = 'paid';
    fine.paidAt = new Date();
    fine.currency = 'INR';
    await fine.save();

    console.log(`[REAL-TIME] Fine ${fine.fineId} marked as PAID. Broadcasting to all clients.`);
    io.emit('fine-updated', {
        fineId: fine.fineId,
        status: 'paid',
        userId: fine.userId
    });

    res.json({ message: 'Fine paid successfully', fine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', authMiddleware, requirePermission('fine:cancel'), async (req, res) => {
  try {
    const deleted = await Fine.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    await logAudit({
      req,
      action: 'fine.cancel',
      resourceType: 'fine',
      resourceId: req.params.id
    });

    console.log(`[REAL-TIME] Fine ${req.params.id} CANCELLED by Admin. Broadcasting.`);
    io.emit('fine-updated', {
        fineId: req.params.id,
        status: 'cancelled'
    });

    res.json({ message: 'Fine cancelled' });
  } catch (error) {
    await logAudit({
      req,
      action: 'fine.cancel',
      resourceType: 'fine',
      resourceId: req.params.id,
      status: 'failure',
      metadata: { error: error.message }
    });
    res.status(500).json({ message: error.message });
  }
});

export default router;

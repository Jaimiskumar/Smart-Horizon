/**
 * Traffic Violations API Routes
 * Handles speeding, signal breaking, lane violations, and rash driving
 */

import express from 'express';
import TrafficViolation from '../models/TrafficViolation.js';
import HelmetViolation from '../models/HelmetViolation.js';
import Challan from '../models/Challan.js';
import { authMiddleware } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

/**
 * POST /api/violations/traffic
 * Create a new traffic violation from camera detection
 * Admin only
 */
router.post('/traffic', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      violationType,
      speedRecorded,
      speedLimit,
      signalLocation,
      latitude,
      longitude,
      cameraId,
      imageUrl,
      videoUrl,
      severity,
      vehicleClass,
      fineAmount,
      notes
    } = req.body;

    // Validate required fields
    if (!vehicleNumber || !violationType || !cameraId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const violation = new TrafficViolation({
      vehicleNumber,
      violationType,
      speedRecorded,
      speedLimit,
      signalLocation,
      latitude,
      longitude,
      cameraId,
      imageUrl,
      videoUrl,
      severity: severity || 'medium',
      vehicleClass,
      fineAmount: fineAmount || 500,
      status: 'pending',
      notes
    });

    await violation.save();

    res.status(201).json({
      message: 'Traffic violation recorded',
      violation
    });
  } catch (error) {
    console.error('Error creating traffic violation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/violations/helmet
 * Record helmet violations
 */
router.post('/helmet', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      helmetStatus,
      signalLocation,
      latitude,
      longitude,
      cameraId,
      imageUrl,
      videoUrl,
      notes
    } = req.body;

    if (!vehicleNumber || !helmetStatus || !cameraId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const violation = new HelmetViolation({
      vehicleNumber,
      helmetStatus,
      signalLocation,
      latitude,
      longitude,
      cameraId,
      imageUrl,
      videoUrl,
      fineAmount: 500,
      status: 'pending',
      notes
    });

    await violation.save();

    res.status(201).json({
      message: 'Helmet violation recorded',
      violation
    });
  } catch (error) {
    console.error('Error creating helmet violation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/violations/traffic
 * Get all traffic violations with filtering
 */
router.get('/traffic', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      status,
      violationType,
      cameraId,
      startDate,
      endDate,
      severity,
      limit = 50,
      page = 1
    } = req.query;

    const filter = {};

    if (vehicleNumber) filter.vehicleNumber = new RegExp(vehicleNumber, 'i');
    if (status) filter.status = status;
    if (violationType) filter.violationType = violationType;
    if (cameraId) filter.cameraId = cameraId;
    if (severity) filter.severity = severity;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const violations = await TrafficViolation.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await TrafficViolation.countDocuments(filter);

    res.json({
      violations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching traffic violations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/violations/helmet
 * Get all helmet violations
 */
router.get('/helmet', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      status,
      cameraId,
      startDate,
      endDate,
      limit = 50,
      page = 1
    } = req.query;

    const filter = {};

    if (vehicleNumber) filter.vehicleNumber = new RegExp(vehicleNumber, 'i');
    if (status) filter.status = status;
    if (cameraId) filter.cameraId = cameraId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const violations = await HelmetViolation.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await HelmetViolation.countDocuments(filter);

    res.json({
      violations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching helmet violations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/violations/traffic/:id
 * Get specific traffic violation
 */
router.get('/traffic/:id', authMiddleware, async (req, res) => {
  try {
    const violation = await TrafficViolation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    res.json(violation);
  } catch (error) {
    console.error('Error fetching violation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/violations/traffic/:id
 * Update violation status
 */
router.patch('/traffic/:id', authMiddleware, async (req, res) => {
  try {
    const { status, verifiedBy, notes } = req.body;

    const violation = await TrafficViolation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    if (status) violation.status = status;
    if (verifiedBy) {
      violation.verifiedBy = verifiedBy;
      violation.verifiedAt = new Date();
    }
    if (notes) violation.notes = notes;

    await violation.save();

    res.json({
      message: 'Violation updated',
      violation
    });
  } catch (error) {
    console.error('Error updating violation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/violations/statistics
 * Get violation statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, cameraId } = req.query;

    const filter = {};
    if (cameraId) filter.cameraId = cameraId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Traffic violations statistics
    const trafficStats = await TrafficViolation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$violationType',
          count: { $sum: 1 },
          totalFines: { $sum: '$fineAmount' }
        }
      }
    ]);

    // Helmet violations statistics
    const helmetStats = await HelmetViolation.aggregate([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, totalFines: { $sum: '$fineAmount' } } }
    ]);

    // Severity distribution
    const severityDist = await TrafficViolation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      trafficViolations: trafficStats,
      helmetViolations: helmetStats[0] || { count: 0, totalFines: 0 },
      severityDistribution: severityDist
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/violations/police-issue-challan
 * Endpoint for Police Authorities & Field Officers to issue on-spot E-Challans
 * Automatically syncs with Admin Dashboard & Database
 */
router.post('/police-issue-challan', async (req, res) => {
  try {
    const {
      vehicleNumber,
      violationType = 'illegal_parking',
      fineAmount = 1000,
      location = 'Silk Board Junction, Bengaluru',
      officerId = 'POL-OFFICER-042',
      officerName = 'Inspector K. Sharma',
      notes = 'Issued on-spot by Traffic Police Officer',
      imageUrl = null
    } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    const challanNumber = `CH-POL-${Date.now().toString().slice(-6)}`;
    const legalSections = {
      'no_helmet': 'Section 129, Motor Vehicles Act 1988',
      'helmet_violation': 'Section 129, Motor Vehicles Act 1988',
      'speeding': 'Section 183(2), Motor Vehicles Act 1988',
      'signal_violation': 'Section 184, Motor Vehicles Act 1988',
      'signal_breaking': 'Section 184, Motor Vehicles Act 1988',
      'illegal_parking': 'Section 122/177, Motor Vehicles Act 1988',
      'triple_riding': 'Section 128, Motor Vehicles Act 1988',
      'rash_driving': 'Section 184, Motor Vehicles Act 1988',
      'hawkers_encroachment': 'Section 283 IPC / Municipal Encroachment Act'
    };

    const legalSection = legalSections[violationType] || 'Motor Vehicles Act 1988';

    // 1. Create TrafficViolation record
    let violation = null;
    try {
      violation = await TrafficViolation.create({
        vehicleNumber: vehicleNumber.toUpperCase(),
        violationType,
        signalLocation: location,
        cameraId: `POLICE-MOBILE-${officerId}`,
        severity: 'high',
        fineAmount: Number(fineAmount),
        status: 'pending',
        notes: `${notes} (Issued by ${officerName})`,
        imageUrl
      });
    } catch (e) {
      console.warn('TrafficViolation persistence notice:', e.message);
    }

    // 2. Create Challan record
    let challan = null;
    try {
      challan = await Challan.create({
        challanNumber,
        vehicleNumber: vehicleNumber.toUpperCase(),
        violationType: violationType.replace(/_/g, ' '),
        fineAmount: Number(fineAmount),
        location,
        status: 'issued',
        notes: `Legal Section: ${legalSection}. Issued by ${officerName} (${officerId})`,
        evidenceImageUrl: imageUrl
      });
    } catch (e) {
      console.warn('Challan persistence notice:', e.message);
    }

    const challanReceipt = {
      success: true,
      challanNumber,
      vehicleNumber: vehicleNumber.toUpperCase(),
      violationType,
      fineAmount: Number(fineAmount),
      location,
      legalSection,
      officerId,
      officerName,
      status: 'ISSUED',
      timestamp: new Date().toISOString()
    };

    // 3. Real-time Socket.IO emission to Admin Dashboard
    if (io) {
      io.emit('challan_issued', {
        challanNumber,
        vehicleNumber: vehicleNumber.toUpperCase(),
        fine: Number(fineAmount),
        violationType,
        location,
        officer: officerName,
        timestamp: new Date()
      });

      io.emit('violation-alert', {
        vehicleNumber: vehicleNumber.toUpperCase(),
        violationType: violationType.replace(/_/g, ' '),
        zone: location,
        fineAmount: Number(fineAmount),
        message: `🚨 E-Challan ${challanNumber} issued by ${officerName} for ${vehicleNumber.toUpperCase()} (₹${fineAmount})`
      });
    }

    res.status(201).json({
      success: true,
      message: `E-Challan ${challanNumber} issued successfully!`,
      challan: challanReceipt
    });
  } catch (error) {
    console.error('Error in police-issue-challan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

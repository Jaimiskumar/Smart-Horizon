import express from 'express';
import IllegalParking from '../models/IllegalParking.js';
import Fine from '../models/Fine.js';
import User from '../models/User.js';
import illegalParkingDetector from '../services/illegalParkingDetector.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

const STATUS_FILTERS = new Set(['detected', 'alert-sent', 'fine-issued', 'paid', 'dismissed']);

function toPublic(doc) {
  return {
    ...doc,
    id: doc._id?.toString() || doc.id
  };
}

function mapViolationTypeToFineType(violationType) {
  const map = {
    'no-parking-zone': 'no_parking_zone',
    'double-parking': 'double_parking'
  };
  return map[violationType] || 'illegal_parking';
}

function severityFromAmount(amount) {
  if (amount >= 4000) return 'critical';
  if (amount >= 1500) return 'high';
  if (amount >= 800) return 'medium';
  return 'low';
}

async function generateViolation(index = 0) {
  const detection = await illegalParkingDetector.processDetection({}, index);
  return {
    licensePlate: detection.licensePlate,
    location: detection.location,
    violationType: detection.violationType,
    fineAmount: detection.fineAmount,
    imageUrl: detection.imageUrl,
    detectionTime: detection.detectionTime,
    status: detection.status,
    authority: detection.authority,
    cameraId: detection.cameraId,
    confidence: Number(detection.confidence),
    alertSent: detection.alertSent,
    finePaid: detection.finePaid,
    coordinates: detection.coordinates,
    notes: detection.notes || ''
  };
}

async function ensureSeedData() {
  const total = await IllegalParking.countDocuments();
  if (total > 0) {
    return;
  }

  // Try to warm the detector cache. If it fails, generator fallback still works.
  try {
    await illegalParkingDetector.fetchIllegalParkingData();
  } catch {
    // no-op
  }

  const rows = await Promise.all(Array.from({ length: 8 }, (_, index) => generateViolation(index)));
  await IllegalParking.insertMany(rows);
}

async function maybeDetectNewViolation() {
  if (Math.random() >= 0.25) {
    return;
  }
  const index = await IllegalParking.estimatedDocumentCount();
  const row = await generateViolation(index);
  const created = await IllegalParking.create(row);
  io.emit('illegal-parking-detected', toPublic(created.toObject()));
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    await ensureSeedData();
    await maybeDetectNewViolation();

    const filter = {};
    if (req.query.status && STATUS_FILTERS.has(req.query.status)) {
      filter.status = req.query.status;
    }

    const violations = await IllegalParking.find(filter).sort({ detectionTime: -1 }).lean();
    res.json(violations.map(toPublic));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    await ensureSeedData();

    const violations = await IllegalParking.find({}).lean();
    const stats = {
      total: violations.length,
      detected: violations.filter((v) => v.status === 'detected').length,
      alertSent: violations.filter((v) => v.status === 'alert-sent').length,
      fineIssued: violations.filter((v) => v.status === 'fine-issued').length,
      paid: violations.filter((v) => v.status === 'paid').length,
      dismissed: violations.filter((v) => v.status === 'dismissed').length,
      totalFineAmount: violations
        .filter((v) => ['fine-issued', 'paid'].includes(v.status))
        .reduce((sum, v) => sum + (v.fineAmount || 0), 0),
      collectedAmount: violations
        .filter((v) => v.status === 'paid')
        .reduce((sum, v) => sum + (v.fineAmount || 0), 0)
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const violation = await IllegalParking.findById(req.params.id).lean();
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }
    return res.json(toPublic(violation));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:id/send-alert', authMiddleware, adminOnly, async (req, res) => {
  try {
    const violation = await IllegalParking.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    const alertDetails = await illegalParkingDetector.sendAlertToAuthority(violation);
    violation.alertSent = true;
    violation.alertDetails = alertDetails;
    if (violation.status === 'detected') {
      violation.status = 'alert-sent';
    }
    await violation.save();

    const payload = toPublic(violation.toObject());
    io.emit('illegal-parking-alert-sent', payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:id/issue-fine', authMiddleware, adminOnly, async (req, res) => {
  try {
    const violation = await IllegalParking.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    if (violation.fineDetails?.fineId) {
      return res.json(toPublic(violation.toObject()));
    }

    const owner = await User.findOne({ vehicleNumber: violation.licensePlate }).select('_id');
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const fineId = `FINE${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const fine = new Fine({
      fineId,
      userId: owner?._id,
      vehicleNumber: violation.licensePlate,
      violationType: mapViolationTypeToFineType(violation.violationType),
      amount: violation.fineAmount,
      currency: 'INR',
      location: {
        name: violation.location,
        lat: violation.coordinates?.lat,
        lng: violation.coordinates?.lng
      },
      zone: violation.location,
      severity: severityFromAmount(violation.fineAmount),
      warningIssued: violation.alertSent,
      warningTime: violation.alertDetails?.sentAt,
      imageUrl: violation.imageUrl,
      issuedAt: new Date(),
      issuedBy: req.user?.userId,
      dueDate
    });
    await fine.save();

    violation.status = 'fine-issued';
    violation.fineDetails = {
      fineId: fine.fineId,
      dueDate
    };
    await violation.save();

    const payload = toPublic(violation.toObject());
    io.emit('illegal-parking-fine-issued', { violation: payload, fine });
    return res.json({ violation: payload, fine });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id/dismiss', authMiddleware, adminOnly, async (req, res) => {
  try {
    const violation = await IllegalParking.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    violation.status = 'dismissed';
    violation.dismissedReason = req.body?.reason || 'False positive';
    await violation.save();

    const payload = toPublic(violation.toObject());
    io.emit('illegal-parking-dismissed', payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/citizen-report', authMiddleware, async (req, res) => {
  try {
    const row = {
      licensePlate: req.body.vehicleNumber || 'UNKNOWN',
      location: req.body.location,
      violationType: 'illegal_parking',
      fineAmount: 1200,
      imageUrl: req.body.imageUrl || '/images/illegal-parking/parking1.jpg',
      detectionTime: new Date(),
      status: 'detected',
      authority: 'Citizen Report',
      cameraId: 'CITIZEN-APP',
      confidence: 100,
      alertSent: false,
      finePaid: false,
      notes: req.body.description || ''
    };
    const created = await IllegalParking.create(row);
    io.emit('illegal-parking-detected', toPublic(created.toObject()));
    res.json(toPublic(created.toObject()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

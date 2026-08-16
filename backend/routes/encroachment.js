import express from 'express';
import Encroachment from '../models/Encroachment.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

const CAMERA_LOCATIONS = [
  { cameraId: 'CAM001', location: 'MG Road', zone: 'footpath' },
  { cameraId: 'CAM002', location: 'Brigade Road', zone: 'road-lane' },
  { cameraId: 'CAM003', location: 'Commercial Street', zone: 'no-parking' },
  { cameraId: 'CAM004', location: 'Indiranagar', zone: 'restricted-area' },
  { cameraId: 'CAM005', location: 'Koramangala', zone: 'footpath' }
];

const OBJECT_TYPES = ['vendor', 'cart', 'vehicle', 'obstacle', 'hawker'];

const IMAGE_MAP = {
  vendor: ['/images/encroachment/hawker1.jpg', '/images/encroachment/hawker2.jpg'],
  hawker: ['/images/encroachment/hawker1.jpg', '/images/encroachment/hawker2.jpg'],
  cart: ['/images/encroachment/hawker1.jpg'],
  vehicle: ['/images/encroachment/hawker2.jpg'],
  obstacle: ['/images/encroachment/hawker1.jpg']
};

const SEVERITY_BY_ZONE = {
  'road-lane': 'high',
  footpath: 'medium',
  'no-parking': 'medium',
  'restricted-area': 'high'
};

const BASE_COORDS = {
  'MG Road': { lat: 12.9716, lng: 77.5946 },
  'Brigade Road': { lat: 12.9698, lng: 77.6072 },
  'Commercial Street': { lat: 12.9833, lng: 77.6089 },
  Indiranagar: { lat: 12.9784, lng: 77.6408 },
  Koramangala: { lat: 12.9352, lng: 77.6245 }
};

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLicensePlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}-${
    letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}`;
}

function generateCoordinates(location) {
  const base = BASE_COORDS[location] || BASE_COORDS['MG Road'];
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.01,
    lng: base.lng + (Math.random() - 0.5) * 0.01
  };
}

function buildSeedEncroachment() {
  const camera = randomFrom(CAMERA_LOCATIONS);
  const detectedObject = randomFrom(OBJECT_TYPES);
  const images = IMAGE_MAP[detectedObject] || IMAGE_MAP.vendor;
  const detectionTime = new Date(Date.now() - Math.floor(Math.random() * 10 * 60 * 1000));
  const stationaryDuration = Math.floor((Date.now() - detectionTime.getTime()) / 1000);

  let status = 'detected';
  let warningIssuedAt = null;
  let alertSentAt = null;

  if (stationaryDuration >= 600) {
    status = 'alert-sent';
    warningIssuedAt = new Date(detectionTime.getTime() + 5 * 60 * 1000);
    alertSentAt = new Date(detectionTime.getTime() + 10 * 60 * 1000);
  } else if (stationaryDuration >= 300) {
    status = 'warning-issued';
    warningIssuedAt = new Date(detectionTime.getTime() + 5 * 60 * 1000);
  }

  return {
    cameraId: camera.cameraId,
    location: camera.location,
    zone: camera.zone,
    detectedObject,
    licensePlate: detectedObject === 'vehicle' ? generateLicensePlate() : null,
    imageUrl: randomFrom(images),
    detectionTime,
    status,
    stationaryDuration,
    warningIssuedAt,
    alertSentAt,
    coordinates: generateCoordinates(camera.location),
    severity: SEVERITY_BY_ZONE[camera.zone] || 'low',
    notes: `${detectedObject} detected in ${camera.zone}`
  };
}

function withPublicId(doc) {
  return {
    ...doc,
    id: doc._id?.toString() || doc.id
  };
}

async function ensureSeedData() {
  const total = await Encroachment.countDocuments();
  if (total > 0) {
    return;
  }

  const seedRows = Array.from({ length: 6 }, () => buildSeedEncroachment());
  await Encroachment.insertMany(seedRows);
}

async function refreshDerivedStatus() {
  const now = Date.now();
  const active = await Encroachment.find({
    status: { $in: ['detected', 'warning-issued', 'alert-sent'] }
  });

  for (const enc of active) {
    const duration = Math.floor((now - new Date(enc.detectionTime).getTime()) / 1000);
    let changed = false;

    if (enc.stationaryDuration !== duration) {
      enc.stationaryDuration = duration;
      changed = true;
    }

    if (duration >= 600 && enc.status === 'warning-issued') {
      enc.status = 'alert-sent';
      enc.alertSentAt = enc.alertSentAt || new Date();
      changed = true;
    } else if (duration >= 300 && enc.status === 'detected') {
      enc.status = 'warning-issued';
      enc.warningIssuedAt = enc.warningIssuedAt || new Date();
      changed = true;
    }

    if (changed) {
      await enc.save();
    }
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    await ensureSeedData();
    await refreshDerivedStatus();

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const encroachments = await Encroachment.find(filter).sort({ detectionTime: -1 }).lean();
    res.json(encroachments.map(withPublicId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const encroachment = await Encroachment.findById(req.params.id).lean();
    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }
    return res.json(withPublicId(encroachment));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
  try {
    const encroachment = await Encroachment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date()
      },
      { new: true, lean: true }
    );

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    const payload = withPublicId(encroachment);
    io.emit('encroachment-resolved', payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id/ignore', authMiddleware, adminOnly, async (req, res) => {
  try {
    const encroachment = await Encroachment.findByIdAndUpdate(
      req.params.id,
      { status: 'ignored' },
      { new: true, lean: true }
    );

    if (!encroachment) {
      return res.status(404).json({ message: 'Encroachment not found' });
    }

    const payload = withPublicId(encroachment);
    io.emit('encroachment-ignored', payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/citizen-report', authMiddleware, async (req, res) => {
  try {
    const row = {
      cameraId: 'CITIZEN-APP',
      location: req.body.location,
      zone: 'footpath',
      detectedObject: req.body.vehicleNumber ? 'vehicle' : 'hawker',
      licensePlate: req.body.vehicleNumber || null,
      imageUrl: req.body.imageUrl || '/images/encroachment/hawker1.jpg',
      detectionTime: new Date(),
      status: 'detected',
      stationaryDuration: 0,
      warningIssuedAt: null,
      alertSentAt: null,
      severity: 'high',
      notes: `Citizen Report: ${req.body.description || ''}`
    };
    const created = await Encroachment.create(row);
    res.json(withPublicId(created.toObject()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

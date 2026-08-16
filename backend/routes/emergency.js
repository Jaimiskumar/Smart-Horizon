import express from 'express';
import Emergency from '../models/Emergency.js';
import TrafficSignal from '../models/TrafficSignal.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { io } from '../server.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();
const MIN_ACTIVE_EMERGENCIES = 3;

const EMERGENCY_TYPES = ['ambulance', 'fire_truck', 'police', 'disaster_response'];
const ZONE_DESTINATIONS = [
  { name: 'Oasis Mall Area', lat: 17.676673, lng: 75.8986813 },
  { name: 'Park Shopping Complex - City Corner', lat: 17.6796, lng: 75.9088 },
  { name: 'Virat Mall - Hotgi Road', lat: 17.6710335, lng: 75.9418596 },
  { name: 'City Pride - GMR Mall Area', lat: 17.6743, lng: 75.9138 },
  { name: 'Soham Mall - Hospital Stretch', lat: 17.6644158, lng: 75.9126046 },
  { name: 'Bhuikot Fort - Siddheshwar Area', lat: 17.6744887, lng: 75.9021219 },
  { name: 'Solapur Cancer Center Junction', lat: 17.656601, lng: 75.896723 },
  { name: 'Bharat Mata Nagar - Gangji Mill', lat: 17.6284768, lng: 75.9298602 }
];
const ZONE_NAME_SET = new Set(ZONE_DESTINATIONS.map((zone) => zone.name));
const SIGNAL_TO_ZONE = {
  SIG001: 'Oasis Mall Area',
  SIG002: 'Park Shopping Complex - City Corner',
  SIG003: 'Virat Mall - Hotgi Road',
  SIG004: 'City Pride - GMR Mall Area',
  SIG005: 'Soham Mall - Hospital Stretch',
  SIG006: 'Bhuikot Fort - Siddheshwar Area'
};

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateEmergencyId() {
  return `EMRG${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function buildVehicleId(vehicleType) {
  const prefixByType = {
    ambulance: 'AMB',
    fire_truck: 'FIRE',
    police: 'POL',
    disaster_response: 'DR'
  };
  const prefix = prefixByType[vehicleType] || 'EMR';
  return `${prefix}${String(Math.floor(1 + Math.random() * 999)).padStart(3, '0')}`;
}

function toRoute(signals) {
  return signals.map((signal, index) => ({
    signalId: signal.signalId,
    lat: signal.location?.lat,
    lng: signal.location?.lng,
    sequence: index + 1,
    cleared: index === 0,
    clearedAt: index === 0 ? new Date() : undefined
  }));
}

function buildRandomRoute(signals = []) {
  if (!signals.length) {
    return [];
  }
  const shuffled = [...signals].sort(() => Math.random() - 0.5);
  const routeLength = Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3)); // 3..5
  return toRoute(shuffled.slice(0, routeLength));
}

function getZoneByName(name) {
  return ZONE_DESTINATIONS.find((zone) => zone.name === name) || null;
}

function destinationFromRoute(route = []) {
  const lastSignalId = route[route.length - 1]?.signalId;
  if (lastSignalId && SIGNAL_TO_ZONE[lastSignalId]) {
    const zone = getZoneByName(SIGNAL_TO_ZONE[lastSignalId]);
    if (zone) {
      return zone;
    }
  }
  return randomFrom(ZONE_DESTINATIONS);
}

function normalizeDestination(route = [], destination = {}) {
  const byName = destination?.name && getZoneByName(destination.name);
  if (byName) {
    return {
      lat: byName.lat,
      lng: byName.lng,
      name: byName.name,
      address: byName.name
    };
  }

  const byAddress = destination?.address && getZoneByName(destination.address);
  if (byAddress) {
    return {
      lat: byAddress.lat,
      lng: byAddress.lng,
      name: byAddress.name,
      address: byAddress.name
    };
  }

  const fallback = destinationFromRoute(route);
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    name: fallback.name,
    address: fallback.name
  };
}

async function createAutoEmergency(signals) {
  const route = buildRandomRoute(signals);
  const first = route[0];
  const vehicleType = randomFrom(EMERGENCY_TYPES);
  const destination = normalizeDestination(route);

  const emergency = new Emergency({
    emergencyId: generateEmergencyId(),
    vehicleId: buildVehicleId(vehicleType),
    vehicleType,
    priority: randomFrom(['high', 'critical']),
    status: 'active',
    currentLocation: {
      lat: first.lat,
      lng: first.lng,
      address: signals[0]?.name,
      lastUpdated: new Date()
    },
    destination,
    route,
    estimatedArrival: new Date(Date.now() + (10 + Math.floor(Math.random() * 15)) * 60 * 1000),
    startTime: new Date(),
    incidentType: 'Auto-generated live drill'
  });

  await emergency.save();
  io.emit('emergency-activated', emergency);
}

async function ensureActiveEmergencies(minCount = MIN_ACTIVE_EMERGENCIES) {
  const activeCount = await Emergency.countDocuments({ status: { $in: ['active', 'en_route'] } });
  if (activeCount >= minCount) {
    return;
  }

  const signals = await TrafficSignal.find({ isActive: true }).sort({ signalId: 1 }).limit(6).lean();
  if (!signals.length) {
    return;
  }

  const needed = minCount - activeCount;
  for (let i = 0; i < needed; i += 1) {
    await createAutoEmergency(signals);
  }
}

async function normalizeActiveEmergencyDestinations() {
  const activeEmergencies = await Emergency.find({ status: { $in: ['active', 'en_route'] } }).sort({ startTime: -1 });
  for (const [index, emergency] of activeEmergencies.entries()) {
    const routeZone = destinationFromRoute(emergency.route);
    const routeZoneIndex = ZONE_DESTINATIONS.findIndex((zone) => zone.name === routeZone.name);
    const distributedZone = ZONE_DESTINATIONS[(Math.max(0, routeZoneIndex) + index) % ZONE_DESTINATIONS.length];
    const normalized = {
      lat: distributedZone.lat,
      lng: distributedZone.lng,
      name: distributedZone.name,
      address: distributedZone.name
    };

    const currentName = emergency.destination?.name;
    const currentAddress = emergency.destination?.address;
    const isSameDestination =
      currentName === normalized.name &&
      currentAddress === normalized.address &&
      emergency.destination?.lat === normalized.lat &&
      emergency.destination?.lng === normalized.lng;

    if (!isSameDestination || !ZONE_NAME_SET.has(currentName) || !ZONE_NAME_SET.has(currentAddress)) {
      emergency.destination = normalized;
      await emergency.save();
    }
  }
}

router.get('/', authMiddleware, requirePermission('emergency:read'), async (req, res) => {
  try {
    await ensureActiveEmergencies();
    await normalizeActiveEmergencyDestinations();
    const emergencies = await Emergency.find({ status: { $in: ['active', 'en_route'] } }).sort({ startTime: -1 });
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/activate', authMiddleware, requirePermission('emergency:activate'), async (req, res) => {
  try {
    const { vehicleId, vehicleType, currentLocation, destination, route } = req.body;
    const emergencyVehicleType = EMERGENCY_TYPES.includes(vehicleType) ? vehicleType : 'ambulance';

    let plannedRoute = Array.isArray(route) ? route.filter((point) => point?.signalId) : [];
    if (!plannedRoute.length) {
      const fallbackSignals = await TrafficSignal.find({ isActive: true }).sort({ signalId: 1 }).limit(6).lean();
      plannedRoute = buildRandomRoute(fallbackSignals);
    }
    const normalizedDestination = normalizeDestination(plannedRoute, destination);

    const emergency = new Emergency({
      emergencyId: generateEmergencyId(),
      vehicleId: vehicleId || buildVehicleId(emergencyVehicleType),
      vehicleType: emergencyVehicleType,
      currentLocation,
      destination: normalizedDestination,
      route: plannedRoute,
      estimatedArrival: new Date(Date.now() + 15 * 60 * 1000)
    });

    await emergency.save();

    for (const point of plannedRoute) {
      await TrafficSignal.findOneAndUpdate(
        { signalId: point.signalId },
        { status: 'green', mode: 'emergency' }
      );
    }

    io.emit('emergency-activated', emergency);

    await logAudit({
      req,
      action: 'emergency.activate',
      resourceType: 'emergency',
      resourceId: emergency._id.toString(),
      metadata: {
        emergencyId: emergency.emergencyId,
        vehicleId: emergency.vehicleId,
        vehicleType: emergency.vehicleType,
        routeLength: plannedRoute.length
      }
    });

    res.status(201).json(emergency);
  } catch (error) {
    await logAudit({
      req,
      action: 'emergency.activate',
      resourceType: 'emergency',
      status: 'failure',
      metadata: { error: error.message }
    });
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/complete', authMiddleware, requirePermission('emergency:complete'), async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', endTime: new Date() },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }

    io.emit('emergency-completed', emergency);

    await logAudit({
      req,
      action: 'emergency.complete',
      resourceType: 'emergency',
      resourceId: emergency._id.toString()
    });

    res.json(emergency);
  } catch (error) {
    await logAudit({
      req,
      action: 'emergency.complete',
      resourceType: 'emergency',
      resourceId: req.params.id,
      status: 'failure',
      metadata: { error: error.message }
    });
    res.status(500).json({ message: error.message });
  }
});

export default router;

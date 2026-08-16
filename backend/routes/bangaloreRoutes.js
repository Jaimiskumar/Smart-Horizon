/**
 * Bangalore Geospatial Intelligence Router
 * Serves real-time Bangalore traffic zones, hotspots, incidents, corridors, and Socket.IO updates.
 */

import express from 'express';
import { BANGALORE_ZONES, BANGALORE_CORRIDORS } from '../config/bangaloreGeospatial.js';
import { multiAgentOrchestrator } from '../services/multiAgentOrchestrator.js';

const router = express.Router();

// In-memory mutable clone of Bangalore zones state
let liveBangaloreZones = JSON.parse(JSON.stringify(BANGALORE_ZONES));

/**
 * GET /api/bangalore/zones
 * Returns all active Bangalore zones with real-time geospatial telemetry
 */
router.get('/zones', (req, res) => {
  res.json({
    city: 'Bengaluru',
    total_zones: liveBangaloreZones.length,
    timestamp: new Date().toISOString(),
    zones: liveBangaloreZones
  });
});

/**
 * GET /api/bangalore/hotspots
 * Returns critical and high-risk hotspots ranked by congestion & risk
 */
router.get('/hotspots', (req, res) => {
  const hotspots = liveBangaloreZones
    .filter(z => z.congestion_level === 'DARK_RED' || z.congestion_level === 'RED' || z.congestion_level === 'ORANGE')
    .sort((a, b) => (a.average_speed - b.average_speed));

  res.json({
    city: 'Bengaluru',
    count: hotspots.length,
    timestamp: new Date().toISOString(),
    hotspots: hotspots.map(h => ({
      zone_id: h.zone_id,
      location: h.name,
      road: h.road,
      latitude: h.latitude,
      longitude: h.longitude,
      current_congestion: h.congestion_level,
      average_speed: h.average_speed,
      vehicle_density: h.current_vehicle_density,
      severity: h.risk_level,
      primary_cause: h.recommendation?.primary_cause || 'Peak Hour Volume',
      recommended_action: h.recommendation?.action || 'Optimize Signal Timing',
      confidence: h.recommendation?.confidence || 0.92,
      predicted_delay_reduction: h.recommendation?.expected_delay_reduction_percent || 35,
      prediction_30min: h.prediction_30min,
      noise_level: h.noise_level,
      has_pothole: h.infrastructure_issue?.has_issue || false,
      incidents: h.incidents || []
    }))
  });
});

/**
 * GET /api/bangalore/corridors
 * Returns major Bangalore arterial corridors
 */
router.get('/corridors', (req, res) => {
  res.json({
    city: 'Bengaluru',
    corridors: BANGALORE_CORRIDORS
  });
});

/**
 * GET /api/bangalore/zones/:id
 * Returns telemetry for a single Bangalore zone
 */
router.get('/zones/:id', (req, res) => {
  const zone = liveBangaloreZones.find(z => z.zone_id === req.params.id || z.name.toLowerCase().includes(req.params.id.toLowerCase()));
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }
  res.json(zone);
});

/**
 * POST /api/bangalore/zones/:id/update
 * Updates live metrics for a Bangalore zone and emits real-time Socket.IO event
 */
router.post('/zones/:id/update', (req, res) => {
  const index = liveBangaloreZones.findIndex(z => z.zone_id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  liveBangaloreZones[index] = {
    ...liveBangaloreZones[index],
    ...req.body,
    last_updated: new Date().toISOString()
  };

  const updatedZone = liveBangaloreZones[index];
  const io = req.app.get('io');
  if (io) {
    io.emit('bangalore_zone_updated', updatedZone);
  }

  res.json({
    success: true,
    zone: updatedZone
  });
});

/**
 * POST /api/bangalore/emergency-corridor
 * Activates an emergency green wave corridor on Bangalore roads
 */
router.post('/emergency-corridor', async (req, res) => {
  const { 
    vehicle_id = 'AMB-BLR-07', 
    start_zone = 'BLR-ECITY-02', 
    destination = 'St. John\'s Hospital / Manipal Hospital', 
    route = ['Electronic City', 'Silk Board', 'Koramangala 80ft', 'St. John\'s'] 
  } = req.body;

  // Mark corridor active on relevant zones
  liveBangaloreZones = liveBangaloreZones.map(z => {
    if (route.some(r => z.name.toLowerCase().includes(r.toLowerCase()))) {
      return {
        ...z,
        emergency_corridor: {
          active: true,
          vehicle_id,
          destination,
          route,
          target_eta_min: 4.5
        },
        signal_junction: {
          ...z.signal_junction,
          status: 'Green',
          mode: 'emergency_wave'
        }
      };
    }
    return z;
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('green_corridor_activated', {
      vehicleId: vehicle_id,
      city: 'Bengaluru',
      priority: 'CRITICAL',
      destination,
      route,
      signalsCovered: route.length,
      timestamp: new Date()
    });
    io.emit('bangalore_corridor_activated', {
      vehicleId: vehicle_id,
      destination,
      route,
      timestamp: new Date()
    });
  }

  res.json({
    success: true,
    message: `Bengaluru Green Wave Active for ${vehicle_id} along route: ${route.join(' → ')} to ${destination}`,
    route,
    target_eta_minutes: 4.5
  });
});

/**
 * POST /api/bangalore/incident
 * Ingests a new Bangalore incident and triggers the Synchronized Multi-Agent Pipeline
 */
router.post('/incident', async (req, res) => {
  try {
    const { 
      zone_id = 'BLR-SILK-01', 
      type = 'road_blockage', 
      severity = 'HIGH', 
      title = 'Silk Board Junction Blockage' 
    } = req.body;

    const zone = liveBangaloreZones.find(z => z.zone_id === zone_id) || liveBangaloreZones[0];

    const incidentPayload = {
      event_id: `EVT-BLR-${Date.now()}`,
      incident_id: `INC-BLR-${Date.now()}`,
      zone: zone.name,
      location: { lat: zone.latitude, lon: zone.longitude, address: `${zone.name}, ${zone.road}` },
      event_type: type,
      vehicle_count: zone.current_vehicle_density,
      average_speed: zone.average_speed,
      severity: severity,
      source: 'cctv_samved_bangalore'
    };

    const io = req.app.get('io');
    const orchestratorResult = await multiAgentOrchestrator.orchestrateEvent(incidentPayload, io);

    if (io) {
      io.emit('bangalore_incident_created', {
        incident_id: incidentPayload.incident_id,
        zone_id,
        title,
        result: orchestratorResult
      });
    }

    res.json({
      success: true,
      incident: incidentPayload,
      orchestration: orchestratorResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

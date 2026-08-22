/**
 * Community Road Safety Cloud & Connected Vehicle Proximity Service
 * 
 * Manages:
 * 1. Community Hazard Cloud Ingestion (Dashcam AI Vision, Potholes, Accidents, Debris, Pedestrians)
 * 2. Geospatial Clustering & Community Verification (2+ reports from distinct vehicles -> VERIFIED)
 * 3. Same-Route & Heading Proximity Warning Filter (V2V Warnings via Socket.IO)
 * 4. Automated Infrastructure Agent Work Order Generation (BBMP Maintenance Dispatch)
 * 5. One-Click Interactive Demos (Pothole Flow & Accident Flow)
 */

import { BANGALORE_ZONES } from '../config/bangaloreGeospatial.js';

// Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute bearing in degrees (0 - 360)
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export class CommunityCloudService {
  constructor() {
    this.hazards = new Map();
    this.workOrders = new Map();
    this.connectedVehicles = new Map();
    this.eventPipelineFeed = [];
    this.initSeedData();
  }

  initSeedData() {
    // 1. Initial Simulated Connected Vehicles
    const initialVehicles = [
      {
        id: 'ANON-VH-412',
        type: 'SEDAN',
        driver_alias: 'Anonymous Driver #412',
        lat: 12.9178,
        lng: 77.6239,
        speed: 48.0,
        heading: 175.0, // Southbound on Hosur Road
        road: 'Hosur Road / Silk Board Corridor',
        zone: 'Silk Board Junction',
        comm_mode: 'DSRC + C-V2V',
        dashcam_active: true,
        v2v_link: 'CONNECTED',
        last_updated: new Date().toISOString()
      },
      {
        id: 'ANON-VH-885',
        type: 'SUV',
        driver_alias: 'Anonymous Driver #885',
        lat: 12.9210,
        lng: 77.6235,
        speed: 45.0,
        heading: 176.0, // 350m behind on Hosur Road
        road: 'Hosur Road / Silk Board Corridor',
        zone: 'Silk Board Junction',
        comm_mode: 'DSRC + C-V2V',
        dashcam_active: true,
        v2v_link: 'CONNECTED',
        last_updated: new Date().toISOString()
      },
      {
        id: 'ANON-VH-109',
        type: 'HATCHBACK',
        driver_alias: 'Anonymous Driver #109',
        lat: 12.9245,
        lng: 77.6230,
        speed: 52.0,
        heading: 174.0, // 750m behind on Hosur Road
        road: 'Hosur Road / Silk Board Corridor',
        zone: 'Silk Board Junction',
        comm_mode: 'DSRC + C-V2V',
        dashcam_active: true,
        v2v_link: 'CONNECTED',
        last_updated: new Date().toISOString()
      },
      {
        id: 'ANON-VH-923',
        type: 'ELECTRIC_CAB',
        driver_alias: 'Anonymous Driver #923',
        lat: 12.9569,
        lng: 77.7011,
        speed: 38.0,
        heading: 90.0, // Eastbound on ORR
        road: 'Outer Ring Road Marathahalli',
        zone: 'Marathahalli Bridge',
        comm_mode: 'C-V2V_CELLULAR',
        dashcam_active: true,
        v2v_link: 'CONNECTED',
        last_updated: new Date().toISOString()
      },
      {
        id: 'ANON-VH-305',
        type: 'TRUCK',
        driver_alias: 'Anonymous Driver #305',
        lat: 13.0358,
        lng: 77.5970,
        speed: 32.0,
        heading: 0.0, // Northbound on Airport Road
        road: 'Hebbal Flyover Expressway',
        zone: 'Hebbal Flyover',
        comm_mode: 'DSRC',
        dashcam_active: true,
        v2v_link: 'CONNECTED',
        last_updated: new Date().toISOString()
      },
      {
        id: 'EMERG-AMB-07',
        type: 'AMBULANCE',
        driver_alias: 'City EMS Rapid Unit 07',
        lat: 12.9120,
        lng: 77.6220,
        speed: 64.0,
        heading: 180.0,
        road: 'Hosur Road Green Corridor',
        zone: 'Silk Board Junction',
        comm_mode: 'EMERGENCY_V2X',
        dashcam_active: true,
        v2v_link: 'PRIORITY_ACTIVE',
        last_updated: new Date().toISOString()
      }
    ];

    initialVehicles.forEach((v) => this.connectedVehicles.set(v.id, v));

    // 2. Initial Community Road Hazards
    const initialHazards = [
      {
        hazard_id: 'HAZ-POT-001',
        category: 'POTHOLE',
        title: 'Severe Deep Pothole (12cm)',
        road: 'Hosur Road (Near Silk Board Flyover Ramp)',
        zone_id: 'BLR-SILK-01',
        zone_name: 'Silk Board Junction',
        lat: 12.9176,
        lng: 77.6238,
        severity: 'HIGH',
        confidence: 0.96,
        depth_cm: 12.0,
        width_cm: 65.0,
        vibration_g: 2.4,
        speed_advisory_kmh: 30.0,
        reported_by: 'ANON-VH-412',
        verifications: ['ANON-VH-412', 'ANON-VH-885', 'ANON-VH-109'],
        verification_count: 3,
        status: 'COMMUNITY_VERIFIED',
        work_order_id: 'WO-BBMP-88219',
        work_order_status: 'DISPATCHED',
        crew_assigned: 'BBMP South Zone Pothole Quick-Fix Unit #4',
        v2v_warning_text: '⚠️ Pothole 400m Ahead – Reduce Speed to 30 km/h',
        reported_at: new Date(Date.now() - 3600000).toISOString(),
        verified_at: new Date(Date.now() - 3300000).toISOString()
      },
      {
        hazard_id: 'HAZ-BLK-002',
        category: 'ROAD_BLOCKAGE',
        title: 'Construction Debris / Fallen Barricade',
        road: 'Outer Ring Road (Bellandur EcoSpace Service Lane)',
        zone_id: 'BLR-BELLAN-06',
        zone_name: 'Bellandur EcoSpace',
        lat: 12.9260,
        lng: 77.6762,
        severity: 'MEDIUM',
        confidence: 0.91,
        depth_cm: 0,
        width_cm: 180.0,
        vibration_g: 0.8,
        speed_advisory_kmh: 25.0,
        reported_by: 'ANON-VH-923',
        verifications: ['ANON-VH-923', 'ANON-VH-221'],
        verification_count: 2,
        status: 'COMMUNITY_VERIFIED',
        work_order_id: 'WO-BBMP-88220',
        work_order_status: 'SCHEDULED',
        crew_assigned: 'BBMP East Zone Road Clearance Crew #2',
        v2v_warning_text: '⚠️ Road Obstruction Ahead – Move to Right Lane',
        reported_at: new Date(Date.now() - 7200000).toISOString(),
        verified_at: new Date(Date.now() - 6900000).toISOString()
      },
      {
        hazard_id: 'HAZ-PED-003',
        category: 'PEDESTRIAN_HAZARD',
        title: 'Unsignalized Crosswalk Hazard / High Footfall',
        road: 'Old Madras Road (KR Puram Hanging Bridge Underpass)',
        zone_id: 'BLR-KRPUR-03',
        zone_name: 'KR Puram Hanging Bridge',
        lat: 12.9982,
        lng: 77.6926,
        severity: 'HIGH',
        confidence: 0.94,
        depth_cm: 0,
        width_cm: 0,
        vibration_g: 0.2,
        speed_advisory_kmh: 20.0,
        reported_by: 'ANON-VH-305',
        verifications: ['ANON-VH-305'],
        verification_count: 1,
        status: 'REPORTED',
        work_order_id: null,
        work_order_status: null,
        crew_assigned: null,
        v2v_warning_text: '🚶 Pedestrian Crosswalk Ahead – Caution & Yield',
        reported_at: new Date(Date.now() - 1800000).toISOString(),
        verified_at: null
      }
    ];

    initialHazards.forEach((h) => {
      this.hazards.set(h.hazard_id, h);
      if (h.work_order_id) {
        this.workOrders.set(h.work_order_id, {
          work_order_id: h.work_order_id,
          hazard_id: h.hazard_id,
          hazard_title: h.title,
          category: h.category,
          zone: h.zone_name,
          road: h.road,
          lat: h.lat,
          lng: h.lng,
          severity: h.severity,
          status: h.work_order_status,
          crew: h.crew_assigned,
          estimated_repair_time: '24 Hours',
          issued_at: h.verified_at,
          dispatched_by: 'UrbanFlow Infrastructure Agent'
        });
      }
    });

    // 3. Initial Pipeline Feed Entries
    this.addPipelineFeed({
      stage: 'INIT',
      badge: 'CLOUD ONLINE',
      title: 'Community Road Safety Cloud Engine Initialized',
      detail: 'Connected to 6 simulated OBUs and synchronized with Bengaluru Geospatial Grid.',
      timestamp: new Date().toISOString()
    });
  }

  addPipelineFeed(entry) {
    this.eventPipelineFeed.unshift({
      id: `FEED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (this.eventPipelineFeed.length > 50) {
      this.eventPipelineFeed.pop();
    }
  }

  getPipelineFeed() {
    return this.eventPipelineFeed;
  }

  getAllHazards(category = null, verifiedOnly = false) {
    let list = Array.from(this.hazards.values());
    if (category && category !== 'ALL') {
      list = list.filter((h) => h.category === category);
    }
    if (verifiedOnly) {
      list = list.filter((h) => h.status === 'COMMUNITY_VERIFIED');
    }
    return list.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
  }

  getAllVehicles() {
    return Array.from(this.connectedVehicles.values());
  }

  getAllWorkOrders() {
    return Array.from(this.workOrders.values()).sort(
      (a, b) => new Date(b.issued_at) - new Date(a.issued_at)
    );
  }

  /**
   * Update or register vehicle telemetry
   */
  updateVehicleTelemetry(vehicleData, io = null) {
    const id = vehicleData.vehicle_id || vehicleData.id || `ANON-VH-${Math.floor(100 + Math.random() * 900)}`;
    const existing = this.connectedVehicles.get(id) || {};

    const updated = {
      ...existing,
      ...vehicleData,
      id,
      last_updated: new Date().toISOString()
    };

    this.connectedVehicles.set(id, updated);

    // Check for nearby hazards in the same direction
    const activeWarnings = this.getProximityWarningsForVehicle(updated);

    if (io && activeWarnings.length > 0) {
      io.emit('v2v_proximity_warning', {
        vehicle_id: id,
        vehicle: updated,
        warnings: activeWarnings,
        timestamp: new Date().toISOString()
      });
    }

    return {
      vehicle: updated,
      active_warnings: activeWarnings
    };
  }

  /**
   * Match vehicle location and heading to nearby hazards
   */
  getProximityWarningsForVehicle(vehicle) {
    const warnings = [];
    const vLat = Number(vehicle.lat || vehicle.latitude);
    const vLng = Number(vehicle.lng || vehicle.longitude);
    const vHeading = Number(vehicle.heading || 0);

    for (const hazard of this.hazards.values()) {
      const distance = getDistanceMeters(vLat, vLng, hazard.lat, hazard.lng);

      // Check if hazard is within warning distance (800 meters)
      if (distance <= 800) {
        // Calculate bearing towards hazard
        const bearingToHazard = getBearing(vLat, vLng, hazard.lat, hazard.lng);
        const headingDiff = Math.abs(bearingToHazard - vHeading);
        const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;

        // Vehicle is moving towards the hazard (within ±60° cone)
        if (normalizedDiff <= 60 || distance < 120) {
          warnings.push({
            hazard_id: hazard.hazard_id,
            category: hazard.category,
            title: hazard.title,
            distance_m: Math.round(distance),
            severity: hazard.severity,
            speed_advisory_kmh: hazard.speed_advisory_kmh,
            warning_text: `${hazard.category === 'POTHOLE' ? '⚠️ Pothole' : hazard.category === 'ACCIDENT' ? '🚨 Accident' : '⚠️ Hazard'} ${Math.round(distance)}m Ahead – Recommended Speed: ${hazard.speed_advisory_kmh} km/h`,
            status: hazard.status,
            verification_count: hazard.verification_count
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Ingest a Hazard Report from a Connected Vehicle Dashcam
   */
  reportHazard(reportData, io = null) {
    const vehicleId = reportData.vehicle_id || reportData.reported_by || 'ANON-VH-412';
    const category = (reportData.category || reportData.type || 'POTHOLE').toUpperCase();
    const lat = Number(reportData.latitude || reportData.lat || 12.9176);
    const lng = Number(reportData.longitude || reportData.lng || 77.6238);
    const depthCm = Number(reportData.pothole_depth_cm || reportData.depth_cm || 10.5);
    const widthCm = Number(reportData.pothole_width_cm || reportData.width_cm || 55.0);
    const confidence = Number(reportData.confidence || reportData.dashcam_detection_confidence || 0.94);
    const road = reportData.road_name || reportData.road || 'Hosur Road Corridor';
    const zoneName = reportData.zone_name || reportData.zone || 'Silk Board Junction';

    // 1. Check for Geospatial Clustering (within 80 meters)
    let existingMatch = null;
    for (const h of this.hazards.values()) {
      if (h.category === category) {
        const dist = getDistanceMeters(lat, lng, h.lat, h.lng);
        if (dist <= 80) {
          existingMatch = h;
          break;
        }
      }
    }

    if (existingMatch) {
      // Community Confirmation / Verification Step
      if (!existingMatch.verifications.includes(vehicleId)) {
        existingMatch.verifications.push(vehicleId);
        existingMatch.verification_count = existingMatch.verifications.length;
      }

      const wasVerified = existingMatch.status === 'COMMUNITY_VERIFIED';
      if (existingMatch.verification_count >= 2) {
        existingMatch.status = 'COMMUNITY_VERIFIED';
        existingMatch.verified_at = existingMatch.verified_at || new Date().toISOString();

        // If Pothole / Road Defect, trigger Infrastructure Agent Work Order
        if (
          (category === 'POTHOLE' || category === 'ROAD_BLOCKAGE') &&
          !existingMatch.work_order_id
        ) {
          const wo = this.createWorkOrder(existingMatch, io);
          existingMatch.work_order_id = wo.work_order_id;
          existingMatch.work_order_status = wo.status;
          existingMatch.crew_assigned = wo.crew;
        }
      }

      this.hazards.set(existingMatch.hazard_id, existingMatch);

      // Add Pipeline Feed Step
      this.addPipelineFeed({
        stage: 'COMMUNITY_VERIFIED',
        badge: 'COMMUNITY VERIFIED',
        title: `Hazard Confirmed by ${vehicleId} (${existingMatch.verification_count} Reports)`,
        detail: `${existingMatch.title} at ${existingMatch.road} upgraded to COMMUNITY VERIFIED status.`,
        hazard_id: existingMatch.hazard_id,
        vehicle_id: vehicleId
      });

      if (io) {
        io.emit('hazard_verified', {
          hazard: existingMatch,
          verified_by: vehicleId,
          verification_count: existingMatch.verification_count,
          timestamp: new Date().toISOString()
        });
      }

      // Broadcast proximity warnings to all nearby vehicles
      this.broadcastProximityAlerts(existingMatch, io);

      return {
        action: 'VERIFIED',
        hazard: existingMatch,
        verified: true,
        verification_count: existingMatch.verification_count
      };
    }

    // 2. New Hazard Creation
    const hazardId = `HAZ-${category.slice(0, 3)}-${Date.now().toString().slice(-4)}`;
    const severity =
      reportData.severity || (depthCm > 9.0 ? 'HIGH' : depthCm > 4.0 ? 'MEDIUM' : 'LOW');
    const speedAdvisory =
      category === 'ACCIDENT' ? 20.0 : category === 'POTHOLE' ? 30.0 : 35.0;

    const newHazard = {
      hazard_id: hazardId,
      category,
      title:
        reportData.title ||
        `${severity} ${category.replace('_', ' ')} (${depthCm > 0 ? `${depthCm}cm` : 'Hazard'})`,
      road,
      zone_id: reportData.zone_id || 'BLR-GEN-01',
      zone_name: zoneName,
      lat,
      lng,
      severity,
      confidence,
      depth_cm: depthCm,
      width_cm: widthCm,
      vibration_g: Number(reportData.vibration_g || (depthCm > 8 ? 2.1 : 0.9)),
      speed_advisory_kmh: speedAdvisory,
      reported_by: vehicleId,
      verifications: [vehicleId],
      verification_count: 1,
      status: 'REPORTED',
      work_order_id: null,
      work_order_status: null,
      crew_assigned: null,
      v2v_warning_text: `⚠️ ${category.replace('_', ' ')} Ahead – Recommended Speed: ${speedAdvisory} km/h`,
      reported_at: new Date().toISOString(),
      verified_at: null
    };

    this.hazards.set(hazardId, newHazard);

    // Add Pipeline Feed Step
    this.addPipelineFeed({
      stage: 'CLOUD_PUBLISHED',
      badge: 'DASHCAM AI DETECTED',
      title: `Dashcam Detected ${category} published to Cloud`,
      detail: `${newHazard.title} reported by ${vehicleId} with ${(confidence * 100).toFixed(0)}% AI confidence.`,
      hazard_id: hazardId,
      vehicle_id: vehicleId
    });

    if (io) {
      io.emit('hazard_reported', {
        hazard: newHazard,
        reported_by: vehicleId,
        timestamp: new Date().toISOString()
      });
    }

    this.broadcastProximityAlerts(newHazard, io);

    return {
      action: 'CREATED',
      hazard: newHazard,
      verified: false,
      verification_count: 1
    };
  }

  /**
   * Broadcast proximity alerts to vehicles traveling on the same route/direction
   */
  broadcastProximityAlerts(hazard, io) {
    if (!io) return;

    const alertedVehicles = [];
    for (const vehicle of this.connectedVehicles.values()) {
      if (vehicle.id === hazard.reported_by) continue;

      const warnings = this.getProximityWarningsForVehicle(vehicle);
      const matched = warnings.find((w) => w.hazard_id === hazard.hazard_id);

      if (matched) {
        alertedVehicles.push({
          vehicle_id: vehicle.id,
          distance_m: matched.distance_m,
          warning: matched.warning_text
        });

        io.emit('v2v_proximity_warning', {
          vehicle_id: vehicle.id,
          vehicle,
          warning: matched,
          hazard,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (alertedVehicles.length > 0) {
      this.addPipelineFeed({
        stage: 'V2V_ALERTED',
        badge: 'V2V WARNINGS SENT',
        title: `V2V Proximity Alert Sent to ${alertedVehicles.length} Vehicles`,
        detail: `Approaching same-route vehicles received: "${hazard.v2v_warning_text}".`,
        hazard_id: hazard.hazard_id,
        alerted_count: alertedVehicles.length
      });
    }
  }

  /**
   * Automated BBMP Infrastructure Work Order Creation
   */
  createWorkOrder(hazard, io = null) {
    const workOrderId = `WO-BBMP-${Math.floor(10000 + Math.random() * 90000)}`;
    const crews = [
      'BBMP South Zone Pothole Quick-Fix Unit #4',
      'BBMP East Zone Road Maintenance Rapid Crew #2',
      'BBMP Central Road Infrastructure Unit #7',
      'BBMP North Zone Emergency Asphalt Taskforce'
    ];
    const crew = crews[Math.floor(Math.random() * crews.length)];

    const workOrder = {
      work_order_id: workOrderId,
      hazard_id: hazard.hazard_id,
      hazard_title: hazard.title,
      category: hazard.category,
      zone: hazard.zone_name,
      road: hazard.road,
      lat: hazard.lat,
      lng: hazard.lng,
      severity: hazard.severity,
      depth_cm: hazard.depth_cm,
      status: 'DISPATCHED',
      crew,
      estimated_repair_time: hazard.severity === 'CRITICAL' ? '6 Hours' : '24 Hours',
      issued_at: new Date().toISOString(),
      dispatched_by: 'UrbanFlow Infrastructure Agent'
    };

    this.workOrders.set(workOrderId, workOrder);

    this.addPipelineFeed({
      stage: 'WORK_ORDER_CREATED',
      badge: 'INFRASTRUCTURE AGENT',
      title: `Maintenance Work Order ${workOrderId} Generated`,
      detail: `Automated dispatch for ${hazard.road} assigned to ${crew}.`,
      work_order_id: workOrderId,
      hazard_id: hazard.hazard_id
    });

    if (io) {
      io.emit('urbanflow-workorder-dispatched', {
        work_order: workOrder,
        hazard,
        timestamp: new Date().toISOString()
      });
      io.emit('work_order_created', workOrder);
    }

    return workOrder;
  }

  /**
   * 1-Click Interactive Demo 1: Connected Vehicle Pothole & Work Order Flow
   */
  async runPotholeDemo(io) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Reset feed
    this.addPipelineFeed({
      stage: 'DEMO_START',
      badge: 'POTHOLE DEMO',
      title: 'Starting 1-Click Connected Vehicle Road Safety Demo',
      detail: 'Simulating front dashcam detection, cloud publishing, community verification & BBMP work order.',
      timestamp: new Date().toISOString()
    });

    if (io) {
      io.emit('demo_stage_update', { stage: 'STEP_1_DASHCAM_DETECTION', progress: 15 });
    }

    // Step 1: Dashcam on ANON-VH-412 detects Pothole
    await delay(600);
    const detectionPayload = {
      vehicle_id: 'ANON-VH-412',
      category: 'POTHOLE',
      title: 'High-Impact Surface Pothole (11.5cm Depth)',
      road_name: 'Hosur Road / Outer Ring Road Junction',
      zone_name: 'Silk Board Junction',
      zone_id: 'BLR-SILK-01',
      latitude: 12.9176,
      longitude: 77.6238,
      pothole_depth_cm: 11.5,
      pothole_width_cm: 58.0,
      confidence: 0.97,
      vibration_g: 2.3,
      severity: 'HIGH'
    };

    this.addPipelineFeed({
      stage: 'DASHCAM_AI',
      badge: 'STEP 1: DASHCAM AI',
      title: 'ANON-VH-412 Dashcam Detects Pothole',
      detail: 'Edge AI Vision identifies 11.5cm pothole (97% confidence, 2.3g vibration spike).',
      vehicle_id: 'ANON-VH-412'
    });

    if (io) {
      io.emit('dashcam_hazard_detected', {
        vehicle_id: 'ANON-VH-412',
        detection: detectionPayload,
        timestamp: new Date().toISOString()
      });
      io.emit('demo_stage_update', { stage: 'STEP_2_CLOUD_INGESTION', progress: 35 });
    }

    // Step 2: Published to Community Cloud (Status: REPORTED)
    await delay(700);
    const reportRes = this.reportHazard(detectionPayload, io);

    // Step 3: Vehicle 2 (ANON-VH-885) Confirms and Verifies (Status: COMMUNITY_VERIFIED)
    await delay(800);
    const verifyPayload = {
      vehicle_id: 'ANON-VH-885',
      category: 'POTHOLE',
      road_name: 'Hosur Road / Outer Ring Road Junction',
      latitude: 12.9177, // Near identical coords
      longitude: 77.6237,
      pothole_depth_cm: 11.2,
      confidence: 0.95,
      severity: 'HIGH'
    };

    const verifyRes = this.reportHazard(verifyPayload, io);
    if (io) {
      io.emit('demo_stage_update', { stage: 'STEP_3_COMMUNITY_VERIFIED', progress: 60 });
    }

    // Step 4: Proximity V2V Warning sent to approaching vehicle (ANON-VH-109)
    await delay(700);
    const approachingVeh = this.connectedVehicles.get('ANON-VH-109');
    if (approachingVeh && io) {
      io.emit('v2v_proximity_warning', {
        vehicle_id: 'ANON-VH-109',
        vehicle: approachingVeh,
        warning: {
          hazard_id: verifyRes.hazard.hazard_id,
          category: 'POTHOLE',
          distance_m: 420,
          severity: 'HIGH',
          speed_advisory_kmh: 30.0,
          warning_text: '⚠️ Pothole 400m Ahead on Hosur Road – Reduce Speed to 30 km/h',
          status: 'COMMUNITY_VERIFIED',
          verification_count: 2
        },
        hazard: verifyRes.hazard,
        timestamp: new Date().toISOString()
      });
    }
    if (io) {
      io.emit('demo_stage_update', { stage: 'STEP_4_V2V_WARNED', progress: 80 });
    }

    // Step 5: UrbanFlow Infrastructure Agent & Speed Advisory Execution
    await delay(700);
    const activeWO = Array.from(this.workOrders.values()).find(
      (w) => w.hazard_id === verifyRes.hazard.hazard_id
    );

    this.addPipelineFeed({
      stage: 'URBANFLOW_DECISION',
      badge: 'STEP 5: AI DECISION',
      title: 'UrbanFlow Infrastructure Work Order & Speed Advisory Active',
      detail: `BBMP Work Order ${activeWO?.work_order_id || 'WO-BBMP-88219'} generated. Speed advisory (30 km/h) active on Corridor.`,
      hazard_id: verifyRes.hazard.hazard_id,
      work_order_id: activeWO?.work_order_id
    });

    if (io) {
      io.emit('demo_stage_update', {
        stage: 'STEP_5_COMPLETED',
        progress: 100,
        hazard: verifyRes.hazard,
        work_order: activeWO
      });
    }

    return {
      success: true,
      demo_type: 'POTHOLE_COMMUNITY_FLOW',
      hazard: verifyRes.hazard,
      work_order: activeWO,
      feed: this.eventPipelineFeed.slice(0, 5)
    };
  }

  /**
   * 1-Click Interactive Demo 2: Accident + V2V Secondary Collision Flow
   */
  async runAccidentV2VDemo(io) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    this.addPipelineFeed({
      stage: 'ACCIDENT_DEMO_START',
      badge: 'ACCIDENT + V2V DEMO',
      title: 'Starting 1-Click Accident & Secondary Collision Prevention Demo',
      detail: 'Simulating lead crash detection, V2V secondary collision broadcast & 12-agent cognitive rerouting.',
      timestamp: new Date().toISOString()
    });

    if (io) {
      io.emit('demo_stage_update', { stage: 'STEP_1_COLLISION_DETECTED', progress: 20 });
    }

    // Step 1: Accident Ingestion
    await delay(600);
    const accidentHazard = {
      vehicle_id: 'VEH-021',
      category: 'ACCIDENT',
      title: 'Critical Lead Vehicle Collision / Crash Stop',
      road_name: 'Silk Board Flyover (Hosur Express Line)',
      zone_name: 'Silk Board Junction',
      zone_id: 'BLR-SILK-01',
      latitude: 12.9176,
      longitude: 77.6238,
      confidence: 0.99,
      severity: 'CRITICAL',
      deceleration_mps2: 10.8,
      jerk_mps3: 45.0,
      airbag_trigger: 1
    };

    const res = this.reportHazard(accidentHazard, io);

    // Step 2: V2V Secondary Crash Warning
    await delay(700);
    if (io) {
      io.emit('secondary_crash_warning', {
        incident_id: `ACC-${Date.now()}`,
        secondary: {
          approaching_vehicles_alerted: 4,
          collision_probability: 0.94,
          safe_following_distance_m: 85,
          divert_recommendation: 'Divert via Koramangala 100ft Inner Ring Road',
          v2v_warning_text: '🚨 Accident Ahead – High Secondary Collision Risk - Prepare to Divert'
        },
        timestamp: new Date().toISOString()
      });
      io.emit('demo_stage_update', { stage: 'STEP_2_V2V_SECONDARY_BROADCAST', progress: 50 });
    }

    // Step 3: Trigger Multi-Agent Orchestrator
    await delay(800);
    const { multiAgentOrchestrator } = await import('./multiAgentOrchestrator.js');
    const orchestrationRes = await multiAgentOrchestrator.orchestrateEvent(
      {
        event_type: 'accident',
        vehicle_id: 'VEH-021',
        zone: 'Silk Board Junction',
        source: 'CONNECTED VEHICLE V2V TELEMETRY'
      },
      io
    );

    if (io) {
      io.emit('demo_stage_update', {
        stage: 'STEP_3_ORCHESTRATION_COMPLETED',
        progress: 100,
        orchestration: orchestrationRes
      });
    }

    return {
      success: true,
      demo_type: 'ACCIDENT_V2V_FLOW',
      hazard: res.hazard,
      orchestration: orchestrationRes
    };
  }
}

export const communityCloudService = new CommunityCloudService();

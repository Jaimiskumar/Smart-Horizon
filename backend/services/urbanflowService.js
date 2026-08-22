/**
 * UrbanFlow Multi-Agent Intelligence Integration Service
 * Connects SAMVED Node.js Backend with UrbanFlow FastAPI Service (Port 8001)
 * Pipeline: Accident Detection -> V2V -> Traffic Perception -> Pedestrian Safety ->
 * Prediction -> Intervention -> Policy -> Digital Twin -> Consensus -> Explainability
 */

import dotenv from 'dotenv';
dotenv.config();

const URBANFLOW_URL = process.env.URBANFLOW_URL || 'http://localhost:8001';

export class UrbanFlowService {
  constructor() {
    this.baseUrl = URBANFLOW_URL;
    this.timeout = 10000;
  }

  /**
   * Check if UrbanFlow AI Service is available
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/agents/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { available: true, status: 'online', agents: data.agents || [] };
      }
      return { available: false, status: 'offline', message: 'UrbanFlow AI unavailable' };
    } catch (error) {
      return { available: false, status: 'offline', message: 'UrbanFlow AI unavailable' };
    }
  }

  /**
   * Get Trained Models Status & Metrics
   */
  async getModelsStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/models/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      return { available: false, error: 'Could not fetch models status' };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Safe model prediction endpoint
   */
  async predictModel(payload) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/models/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      return { fallback: true, prediction: 'SAFE', confidence: 0.85 };
    } catch (error) {
      return { fallback: true, prediction: 'SAFE', error: error.message };
    }
  }

  /**
   * Forward Accident Detection Telemetry to Accident Detection Agent
   */
  async analyzeAccidentEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const payload = {
        incident_id: eventData.incident_id || `ACC-${Date.now()}`,
        vehicle_id: eventData.vehicle_id || 'VEH-021',
        zone: eventData.zone || 'Silk Board Junction',
        vehicle_speed_kmh: Number(eventData.vehicle_speed_kmh || eventData.average_speed || 52.0),
        deceleration_mps2: Number(eventData.deceleration_mps2 || (eventData.event_type === 'accident' ? 10.5 : 2.5)),
        jerk_mps3: Number(eventData.jerk_mps3 || (eventData.event_type === 'accident' ? 42.0 : 3.0)),
        heading_change_deg: Number(eventData.heading_change_deg || (eventData.event_type === 'accident' ? 55.0 : 4.0)),
        airbag_trigger: eventData.airbag_trigger ? 1 : (eventData.event_type === 'accident' ? 1 : 0),
        impact_sensor_indicator: Number(eventData.impact_sensor_indicator || (eventData.event_type === 'accident' ? 0.91 : 0.05)),
        collision_distance_m: Number(eventData.collision_distance_m || (eventData.event_type === 'accident' ? 1.2 : 50.0)),
        vehicle_density: Number(eventData.vehicle_density || 0.85),
        nearby_vehicle_count: Number(eventData.nearby_vehicle_count || 8),
        weather: eventData.weather || 'CLEAR',
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🚨 Forwarding to Accident Detection Agent (${this.baseUrl}/api/urbanflow/accident/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/accident/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`UrbanFlow returned ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`⚠️ Accident Detection AI fallback: ${error.message}`);
      return {
        incident_id: eventData.incident_id || `ACC-${Date.now()}`,
        agent: 'Accident Detection Agent',
        accident_detected: eventData.event_type === 'accident',
        severity: eventData.event_type === 'accident' ? 'CRITICAL' : 'LOW',
        collision_probability: eventData.event_type === 'accident' ? 0.94 : 0.1,
        confidence: 0.95,
        model_version: 'acc-v1 (fallback)',
        disclaimer: 'SIMULATED V2V TELEMETRY'
      };
    }
  }

  /**
   * Forward Pedestrian Data to Pedestrian Safety Agent
   */
  async analyzePedestrianEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const payload = {
        pedestrian_id: eventData.pedestrian_id || 'PED-014',
        zone: eventData.zone || 'Silk Board Junction',
        pedestrian_count: Number(eventData.pedestrian_count || 6),
        distance_to_curb_m: Number(eventData.distance_to_curb_m || 1.2),
        is_crossing: Boolean(eventData.is_crossing !== undefined ? eventData.is_crossing : true),
        vehicle_distance_m: Number(eventData.vehicle_distance_m || 8.5),
        vehicle_speed_kmh: Number(eventData.vehicle_speed_kmh || 46.0),
        road_width_m: Number(eventData.road_width_m || 24.0),
        traffic_signal_state: eventData.traffic_signal_state || 'GREEN',
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🚶 Forwarding to Pedestrian Safety Agent (${this.baseUrl}/api/urbanflow/pedestrian/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/pedestrian/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`UrbanFlow returned ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`⚠️ Pedestrian Safety AI fallback: ${error.message}`);
      return {
        agent: 'Pedestrian Safety Agent',
        pedestrian_risk: 'HIGH',
        confidence: 0.92,
        recommended_signal_intervention: 'EXTEND_PEDESTRIAN_CROSSING_PHASE',
        model_version: 'ped-v1 (fallback)'
      };
    }
  }

  /**
   * Send simulated V2V message
   */
  async sendV2VMessage(messageData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/v2v/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      return { status: 'DEGRADED', v2v_risk_assessment: 'WARNING' };
    } catch (e) {
      return { status: 'DEGRADED', v2v_risk_assessment: 'WARNING', error: e.message };
    }
  }

  /**
   * Broadcast V2V hazard alert
   */
  async broadcastHazard(hazardData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/v2v/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hazardData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      return { broadcast_id: `BCAST-${Date.now()}`, vehicles_notified_count: 5 };
    } catch (e) {
      return { broadcast_id: `BCAST-${Date.now()}`, error: e.message };
    }
  }

  /**
   * Trigger V2V simulation event
   */
  async simulateVehicleEvent(simData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/urbanflow/v2v/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simData)
      });
      if (response.ok) return await response.json();
      return { simulation_event_id: `SIM-${Date.now()}`, vehicle_id: simData.vehicle_id };
    } catch (e) {
      return { simulation_event_id: `SIM-${Date.now()}`, error: e.message };
    }
  }

  /**
   * Get V2V Status
   */
  async getV2VStatus() {
    try {
      const res = await fetch(`${this.baseUrl}/api/urbanflow/v2v/status`);
      if (res.ok) return await res.json();
      return { network_status: 'ONLINE', protocols_active: ['DSRC', 'C-V2V'] };
    } catch (e) {
      return { network_status: 'SIMULATED', protocols_active: ['DSRC', 'C-V2V'] };
    }
  }

  /**
   * Get RSU Status
   */
  async getRSUStatus() {
    try {
      const res = await fetch(`${this.baseUrl}/api/urbanflow/rsu/status`);
      if (res.ok) return await res.json();
      return { rsu_network: 'ONLINE', nodes: [] };
    } catch (e) {
      return { rsu_network: 'ONLINE', nodes: [] };
    }
  }

  /**
   * Analyze Bengaluru Hotspots
   */
  async analyzeHotspots(data) {
    try {
      const res = await fetch(`${this.baseUrl}/api/urbanflow/hotspots/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return { congestion_level: 'CRITICAL', hotspot_score: 91.5 };
    } catch (e) {
      return { congestion_level: 'CRITICAL', hotspot_score: 91.5 };
    }
  }

  /**
   * General Traffic Event Analysis
   */
  async analyzeEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const normalizedPayload = {
        incident_id: eventData.incident_id || `INC-${Date.now()}`,
        event_id: eventData.event_id || `EVT-${Date.now()}`,
        zone: eventData.zone || 'Silk Board Junction',
        event_type: eventData.event_type || 'road_blockage',
        vehicle_count: Number(eventData.vehicle_count || 145),
        average_speed: Number(eventData.average_speed || 18),
        severity: eventData.severity || 'HIGH',
        emergency_vehicle: Boolean(eventData.emergency_vehicle || false),
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🤖 Forwarding traffic event to UrbanFlow AI (${this.baseUrl}/api/urbanflow/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`UrbanFlow returned status ${response.status}`);
      const result = await response.json();
      return { available: true, ...result };
    } catch (error) {
      console.warn(`⚠️ UrbanFlow AI error: ${error.message}. Returning fallback.`);
      return {
        available: false,
        message: 'UrbanFlow AI unavailable',
        error: error.message,
        incident_id: eventData.incident_id || `INC-${Date.now()}`,
        decision: 'UrbanFlow AI fallback active.',
        confidence: 0.90
      };
    }
  }

  /**
   * Infrastructure Event Analysis
   */
  async analyzeInfrastructureEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/infrastructure/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      return { available: false };
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  /**
   * Acoustic Noise Event Analysis
   */
  async analyzeAcousticEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/acoustic/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      return { available: false };
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  /**
   * Emergency V2X Event Analysis
   */
  async analyzeV2XEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/v2x/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      return { available: false };
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  /**
   * Pothole & Road Hazard AI Detection
   */
  async analyzePotholeHazard(potholeData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/pothole/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(potholeData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      throw new Error(`UrbanFlow returned ${response.status}`);
    } catch (e) {
      const depth = Number(potholeData.pothole_depth_cm || 10.5);
      const vib = Number(potholeData.vehicle_vibration_g || 2.1);
      const severity = depth > 9.0 || vib > 2.0 ? 'HIGH' : depth > 4.5 ? 'MEDIUM' : 'LOW';
      return {
        hazard_type: 'POTHOLE',
        severity,
        confidence: Number(potholeData.confidence || 0.95),
        repair_urgency: severity === 'HIGH' ? 'URGENT_24H' : 'PRIORITY_3D',
        speed_advisory_kmh: severity === 'HIGH' ? 30.0 : 40.0,
        model_version: 'pot-v1 (fallback)',
        disclaimer: 'SIMULATED DASHCAM AI VISION'
      };
    }
  }

  /**
   * Secondary Collision Risk Assessment
   */
  async analyzeSecondaryCollisionRisk(collisionData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/secondary-collision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collisionData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
      throw new Error(`UrbanFlow returned ${response.status}`);
    } catch (e) {
      const decel = Number(collisionData.lead_deceleration_mps2 || 9.5);
      const dist = Number(collisionData.inter_vehicle_distance_m || 45.0);
      const risk = decel > 8.0 || dist < 30 ? 'CRITICAL' : decel > 5.0 ? 'HIGH' : 'MEDIUM';
      return {
        secondary_collision_risk: risk,
        reroute_recommended: risk === 'CRITICAL' || risk === 'HIGH',
        safe_following_distance_m: Math.max(70, Math.round(dist * 1.8)),
        model_version: 'sec-v1 (fallback)',
        disclaimer: 'SIMULATED V2V DSRC TELEMETRY'
      };
    }
  }
}

export const urbanflowService = new UrbanFlowService();

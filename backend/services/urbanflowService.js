/**
 * UrbanFlow Multi-Agent Intelligence Integration Service
 * Connects SAMVED Node.js Backend with UrbanFlow FastAPI Service (Port 8001)
 * Pipeline: Traffic Perception -> Prediction -> Intervention -> Policy -> Digital Twin -> Consensus -> Explainability
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
        return { available: true, status: 'online', agents: data };
      }
      return { available: false, status: 'offline', message: 'UrbanFlow AI unavailable' };
    } catch (error) {
      return { available: false, status: 'offline', message: 'UrbanFlow AI unavailable' };
    }
  }

  /**
   * Forward SAMVED traffic/incident event to UrbanFlow Multi-Agent Pipeline
   */
  async analyzeEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const normalizedPayload = {
        incident_id: eventData.incident_id || `INC-${Date.now()}`,
        event_id: eventData.event_id || `EVT-${Date.now()}`,
        zone: eventData.zone || 'ZONE_12',
        event_type: eventData.event_type || 'road_blockage',
        vehicle_count: Number(eventData.vehicle_count || 145),
        average_speed: Number(eventData.average_speed || 18),
        severity: eventData.severity || 'HIGH',
        emergency_vehicle: Boolean(eventData.emergency_vehicle || false),
        near_hospital: Boolean(eventData.near_hospital || false),
        near_school: Boolean(eventData.near_school || false),
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

      if (!response.ok) {
        throw new Error(`UrbanFlow returned status ${response.status}`);
      }

      const result = await response.json();
      return {
        available: true,
        ...result
      };
    } catch (error) {
      console.warn(`⚠️ UrbanFlow AI error: ${error.message}. Returning fallback response.`);
      return {
        available: false,
        message: 'UrbanFlow AI unavailable',
        error: error.message,
        incident_id: eventData.incident_id || `INC-${Date.now()}`,
        decision: 'UrbanFlow AI unavailable — SAMVED operating in standard mode.',
        confidence: 0,
        policy_status: 'offline',
        agent_trace: [
          { agent: 'UrbanFlow Gateway', status: 'Offline', summary: 'UrbanFlow AI service is not running or unreachable on port 8001.' }
        ]
      };
    }
  }

  /**
   * Forward Infrastructure incident event (Pothole, Road Damage, etc.) to UrbanFlow Infrastructure Agent
   */
  async analyzeInfrastructureEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const normalizedPayload = {
        incident_id: eventData.incident_id || eventData.issueId || `INF-${Date.now()}`,
        zone: eventData.zone || eventData.locationName || 'ZONE_12_TEXTILE_MARKET',
        type: (eventData.type || eventData.issueType || 'pothole').toLowerCase().replace(/\s+/g, '_'),
        severity: (eventData.severity || 'HIGH').toUpperCase(),
        traffic_impact: eventData.traffic_impact || 'HIGH',
        near_hospital: Boolean(eventData.near_hospital || false),
        near_school: Boolean(eventData.near_school || false),
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🚧 Forwarding infrastructure incident to UrbanFlow (${this.baseUrl}/api/urbanflow/infrastructure/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/infrastructure/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`UrbanFlow Infrastructure service returned status ${response.status}`);
      }

      const result = await response.json();
      return {
        available: true,
        ...result
      };
    } catch (error) {
      console.warn(`⚠️ UrbanFlow Infrastructure AI error: ${error.message}. Returning fallback.`);
      return {
        available: false,
        message: 'UrbanFlow AI unavailable',
        error: error.message,
        incident_id: eventData.incident_id || `INF-${Date.now()}`,
        decision: 'UrbanFlow Infrastructure AI unavailable — SAMVED standard mode.',
        confidence: 0,
        policy_status: 'offline'
      };
    }
  }

  /**
   * Forward Acoustic / Noise event to UrbanFlow Noise Agent pipeline
   */
  async analyzeAcousticEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const normalizedPayload = {
        incident_id: eventData.incident_id || `NOISE-${Date.now()}`,
        zone: eventData.zone || 'ZONE_12_TEXTILE_HUB',
        noise_db: Number(eventData.noise_db || eventData.noise_level_db || 92.0),
        classification: eventData.classification || 'traffic_horn',
        event_type: eventData.event_type || 'noise_spike',
        vehicle_count: Number(eventData.vehicle_count || 160),
        average_speed: Number(eventData.average_speed || 12),
        near_hospital: Boolean(eventData.near_hospital || false),
        near_school: Boolean(eventData.near_school || false),
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🔊 Forwarding acoustic noise event to UrbanFlow (${this.baseUrl}/api/urbanflow/acoustic/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/acoustic/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`UrbanFlow Acoustic service returned status ${response.status}`);
      }

      const result = await response.json();
      return {
        available: true,
        ...result
      };
    } catch (error) {
      console.warn(`⚠️ UrbanFlow Acoustic AI error: ${error.message}. Returning fallback.`);
      return {
        available: false,
        message: 'UrbanFlow AI unavailable',
        error: error.message,
        incident_id: eventData.incident_id || `NOISE-${Date.now()}`,
        decision: 'UrbanFlow Acoustic AI unavailable — SAMVED standard mode.',
        confidence: 0,
        policy_status: 'offline'
      };
    }
  }

  /**
   * Forward Emergency V2X event (Ambulance AMB-07, ETA 4 min) to UrbanFlow Emergency Agent pipeline
   */
  async analyzeV2XEvent(eventData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const normalizedPayload = {
        incident_id: eventData.incident_id || `V2X-${Date.now()}`,
        vehicle_id: eventData.vehicle_id || 'AMB-07',
        vehicle_type: eventData.vehicle_type || 'ambulance',
        priority: (eventData.priority || 'HIGH').toUpperCase(),
        zone: eventData.zone || 'ZONE_12',
        destination: eventData.destination || 'CITY_GENERAL_HOSPITAL',
        eta_minutes: Number(eventData.eta_minutes || 4.0),
        route: eventData.route || ['J1', 'J2', 'J3'],
        near_hospital: true,
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      console.log(`🚑 Forwarding Emergency V2X event to UrbanFlow (${this.baseUrl}/api/urbanflow/v2x/analyze)...`);

      const response = await fetch(`${this.baseUrl}/api/urbanflow/v2x/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`UrbanFlow V2X service returned status ${response.status}`);
      }

      const result = await response.json();
      return {
        available: true,
        ...result
      };
    } catch (error) {
      console.warn(`⚠️ UrbanFlow V2X AI error: ${error.message}. Returning fallback.`);
      return {
        available: false,
        message: 'UrbanFlow AI unavailable',
        error: error.message,
        incident_id: eventData.incident_id || `V2X-${Date.now()}`,
        decision: 'UrbanFlow V2X AI unavailable — SAMVED standard mode.',
        confidence: 0,
        policy_status: 'offline'
      };
    }
  }
}

export const urbanflowService = new UrbanFlowService();




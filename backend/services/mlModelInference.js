/**
 * ML Model Inference Service
 * Integrates with actual ML models for detection tasks
 * Can be extended to use: YOLOv8, EasyOCR, TensorFlow, etc.
 */

/**
 * Mock implementation - Replace with actual model calls
 * In production, integrate with:
 * - Python backend with FastAPI/Flask for ML models
 * - YOLOv8 for vehicle detection
 * - Custom helmet detection model
 * - EasyOCR/PaddleOCR for number plates
 * - TensorFlow for crowd detection
 */

export class MLModelInference {
  constructor(config = {}) {
    this.config = {
      vehicleDetectionConfidence: config.vehicleDetectionConfidence || 0.6,
      helmetDetectionConfidence: config.helmetDetectionConfidence || 0.7,
      plateExtractionConfidence: config.plateExtractionConfidence || 0.75,
      crowdDetectionConfidence: config.crowdDetectionConfidence || 0.6,
      apiUrl: config.apiUrl || 'http://localhost:8000',  // Python ML backend
      timeout: config.timeout || 30000
    };
  }

  /**
   * Call Python ML backend for inference
   */
  async callMLBackend(endpoint, data) {
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeout: this.config.timeout
      });

      if (!response.ok) {
        throw new Error(`ML backend error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ML backend call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Detect vehicles in frame using YOLOv8
   */
  async detectVehicles(frameData) {
    try {
      const result = await this.callMLBackend('/detect/vehicles', {
        frame_url: frameData.frameUrl,
        confidence_threshold: this.config.vehicleDetectionConfidence
      });

      return result.detections.map(det => ({
        id: det.id,
        class: this.mapVehicleClass(det.class),
        confidence: det.confidence,
        bbox: {
          x1: det.bbox[0],
          y1: det.bbox[1],
          x2: det.bbox[2],
          y2: det.bbox[3]
        },
        centerX: det.center_x,
        centerY: det.center_y,
        plateNumber: det.plate_number || null
      }));
    } catch (error) {
      console.error('Vehicle detection failed:', error);
      // Return mock data for development
      return this.getMockVehicleDetections();
    }
  }

  /**
   * Detect helmet on 2-wheeler
   */
  async detectHelmet(frameData, vehicleBbox) {
    try {
      const result = await this.callMLBackend('/detect/helmet', {
        frame_url: frameData.frameUrl,
        bbox: vehicleBbox,
        confidence_threshold: this.config.helmetDetectionConfidence
      });

      return {
        helmetDetected: result.helmet_detected,
        confidence: result.confidence,
        helmetType: result.helmet_type // 'full_face', 'half_helmet', 'no_helmet'
      };
    } catch (error) {
      console.error('Helmet detection failed:', error);
      return { helmetDetected: true, confidence: 0.5 };  // Safer default
    }
  }

  /**
   * Extract number plate using OCR
   */
  async extractNumberPlate(frameData, vehicleBbox) {
    try {
      const result = await this.callMLBackend('/ocr/number-plate', {
        frame_url: frameData.frameUrl,
        bbox: vehicleBbox,
        confidence_threshold: this.config.plateExtractionConfidence
      });

      return {
        plateNumber: result.plate_number,
        confidence: result.confidence,
        plateImage: result.plate_image,
        rawText: result.raw_text
      };
    } catch (error) {
      console.error('Number plate extraction failed:', error);
      return { plateNumber: null, confidence: 0 };
    }
  }

  /**
   * Detect speed from vehicle motion
   * Requires dual-frame analysis or radar integration
   */
  async detectSpeed(frameData, vehicleBbox, speedLimit) {
    try {
      const result = await this.callMLBackend('/detect/speed', {
        frame_url: frameData.frameUrl,
        bbox: vehicleBbox,
        camera_calibration: frameData.cameraCalibration,
        fps: frameData.fps || 30
      });

      return {
        speed: result.speed_kmh,
        confidence: result.confidence,
        isSpecialized: result.use_specialized_detection
      };
    } catch (error) {
      console.error('Speed detection failed:', error);
      return { speed: 0, confidence: 0, isSpecialized: false };
    }
  }

  /**
   * Check if vehicle is in violation zone during red/yellow signal
   */
  async checkViolationZone(frameData, vehicleBbox, signalStatus) {
    try {
      const result = await this.callMLBackend('/detect/violation-zone', {
        frame_url: frameData.frameUrl,
        bbox: vehicleBbox,
        signal_status: signalStatus,
        zone_mask: frameData.violationZoneMask
      });

      return result.in_violation_zone;
    } catch (error) {
      console.error('Violation zone detection failed:', error);
      return false;
    }
  }

  /**
   * Detect crowd/pedestrian gathering
   */
  async detectCrowd(frameData) {
    try {
      const result = await this.callMLBackend('/detect/crowd', {
        frame_url: frameData.frameUrl,
        confidence_threshold: this.config.crowdDetectionConfidence
      });

      return {
        crowdDetected: result.crowd_detected,
        crowdSize: result.crowd_size,
        roadBlockagePercentage: result.road_blockage_percentage,
        confidence: result.confidence,
        crowdLocations: result.crowd_locations
      };
    } catch (error) {
      console.error('Crowd detection failed:', error);
      return {
        crowdDetected: false,
        crowdSize: 0,
        roadBlockagePercentage: 0,
        confidence: 0
      };
    }
  }

  /**
   * Detect hawkers/vendors (street encroachment)
   */
  async detectHawkers(frameData) {
    try {
      const result = await this.callMLBackend('/detect/hawkers', {
        frame_url: frameData.frameUrl,
        confidence_threshold: 0.65
      });

      return {
        hawkersDetected: result.hawkers_detected,
        hawkerCount: result.hawker_count,
        merchandiseItems: result.merchandise_items,
        roadBlockagePercentage: result.road_blockage_percentage,
        confidence: result.confidence
      };
    } catch (error) {
      console.error('Hawker detection failed:', error);
      return {
        hawkersDetected: false,
        hawkerCount: 0,
        roadBlockagePercentage: 0,
        confidence: 0
      };
    }
  }

  /**
   * Detect congestion level at signal
   */
  async detectCongestion(frameData) {
    try {
      const result = await this.callMLBackend('/detect/congestion', {
        frame_url: frameData.frameUrl,
        historic_data: frameData.historicData
      });

      return {
        congestionLevel: result.congestion_level,  // 0-100
        vehicleCount: result.vehicle_count,
        estimatedWaitTime: result.estimated_wait_time,  // seconds
        recommendedSignalTiming: result.recommended_signal_timing
      };
    } catch (error) {
      console.error('Congestion detection failed:', error);
      return {
        congestionLevel: 0,
        vehicleCount: 0,
        estimatedWaitTime: 0,
        recommendedSignalTiming: null
      };
    }
  }

  /**
   * Map vehicle class codes to names
   */
  mapVehicleClass(classCode) {
    const classMap = {
      0: 'bike',
      1: '2-wheeler',
      2: 'car',
      3: '4-wheeler',
      4: 'truck',
      5: 'bus',
      6: 'auto-rickshaw',
      7: 'other'
    };

    return classMap[classCode] || 'unknown';
  }

  /**
   * Mock vehicle detections for development
   */
  getMockVehicleDetections() {
    return [
      {
        id: 1,
        class: '2-wheeler',
        confidence: 0.92,
        bbox: { x1: 100, y1: 150, x2: 250, y2: 350 },
        centerX: 175,
        centerY: 250,
        plateNumber: null
      },
      {
        id: 2,
        class: '4-wheeler',
        confidence: 0.88,
        bbox: { x1: 300, y1: 100, x2: 600, y2: 400 },
        centerX: 450,
        centerY: 250,
        plateNumber: null
      }
    ];
  }
}

export default MLModelInference;

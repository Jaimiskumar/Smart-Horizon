/**
 * Mock ML Model Inference Service
 * Provides realistic mock detections for demonstration
 * Simulates: YOLOv8, Helmet Detection, OCR, Speed, Crowd Detection
 * Replace this with actual ML backend calls when ready
 */

export class MockMLInference {
  constructor(config = {}) {
    this.config = {
      vehicleDetectionConfidence: config.vehicleDetectionConfidence || 0.85,
      helmetDetectionConfidence: config.helmetDetectionConfidence || 0.88,
      plateExtractionConfidence: config.plateExtractionConfidence || 0.92,
      crowdDetectionConfidence: config.crowdDetectionConfidence || 0.80,
    };

    // Mock data constants
    this.indianStates = ['MH', 'KA', 'TG', 'DL', 'UP', 'GJ', 'WB'];
    this.vehicleClasses = ['2-wheeler', '4-wheeler', 'commercial', 'special'];
    this.helmetStatuses = ['full_helmet', 'half_helmet', 'no_helmet'];
  }

  /**
   * Generate realistic mock vehicle detections
   */
  async detectVehicles(frameData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const vehicleCount = Math.floor(Math.random() * 8) + 1; // 1-8 vehicles
        const detections = [];

        for (let i = 0; i < vehicleCount; i++) {
          detections.push({
            id: `det_${i}_${Date.now()}`,
            class: this.vehicleClasses[Math.floor(Math.random() * this.vehicleClasses.length)],
            confidence: 0.80 + Math.random() * 0.19,
            bbox: {
              x1: Math.random() * 800,
              y1: Math.random() * 400,
              x2: Math.random() * 800 + 50,
              y2: Math.random() * 400 + 50
            },
            centerX: Math.random() * 1000,
            centerY: Math.random() * 600,
            plateNumber: null  // Will be extracted by OCR
          });
        }

        resolve(detections);
      }, 100);
    });
  }

  /**
   * Generate realistic mock helmet detection
   */
  async detectHelmet(frameData, vehicleBbox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const random = Math.random();
        resolve({
          helmetDetected: random > 0.3,  // 70% have helmets
          confidence: 0.75 + Math.random() * 0.24,
          helmetType: this.helmetStatuses[Math.floor(Math.random() * this.helmetStatuses.length)]
        });
      }, 80);
    });
  }

  /**
   * Generate realistic mock number plate extraction
   */
  async extractNumberPlate(frameData, vehicleBbox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = this.indianStates[Math.floor(Math.random() * this.indianStates.length)];
        const district = String(Math.floor(Math.random() * 30) + 1).padStart(2, '0');
        const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                       String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const numbers = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        const plateNumber = `${state}${district}${letters}${numbers}`;

        resolve({
          plateNumber: plateNumber,
          confidence: 0.88 + Math.random() * 0.11,
          plateImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          rawText: plateNumber
        });
      }, 120);
    });
  }

  /**
   * Generate realistic mock speed detection
   */
  async detectSpeed(frameData, vehicleBbox, speedLimit = 60) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 30% chance of speeding
        const isSpeeding = Math.random() < 0.3;
        const baseSpeed = isSpeeding ? 
          speedLimit + Math.floor(Math.random() * 40) + 5 :  // 5-45 km/h over limit
          Math.floor(Math.random() * speedLimit * 0.8);      // Under limit

        resolve({
          speed: baseSpeed,
          confidence: 0.75 + Math.random() * 0.24,
          isSpecialized: false
        });
      }, 100);
    });
  }

  /**
   * Check if vehicle is in violation zone
   */
  async checkViolationZone(frameData, vehicleBbox, signalStatus) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 20% chance of violation based on signal status
        const violationChance = signalStatus === 'red' ? 0.15 : signalStatus === 'yellow' ? 0.05 : 0;
        const inViolation = Math.random() < violationChance;
        resolve(inViolation);
      }, 60);
    });
  }

  /**
   * Generate realistic mock crowd detection
   */
  async detectCrowd(frameData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 15% chance of crowd
        const hasCrowd = Math.random() < 0.15;
        
        if (hasCrowd) {
          resolve({
            crowdDetected: true,
            crowdSize: Math.floor(Math.random() * 30) + 5,  // 5-35 people
            roadBlockagePercentage: Math.floor(Math.random() * 50) + 20,  // 20-70%
            confidence: 0.75 + Math.random() * 0.24,
            crowdLocations: [
              { x: Math.random() * 1000, y: Math.random() * 600 }
            ]
          });
        } else {
          resolve({
            crowdDetected: false,
            crowdSize: 0,
            roadBlockagePercentage: 0,
            confidence: 0.95,
            crowdLocations: []
          });
        }
      }, 90);
    });
  }

  /**
   * Generate realistic mock hawker detection
   */
  async detectHawkers(frameData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 10% chance of hawkers
        const hasHawkers = Math.random() < 0.10;
        
        if (hasHawkers) {
          resolve({
            hawkersDetected: true,
            hawkerCount: Math.floor(Math.random() * 5) + 1,  // 1-5 hawkers
            merchandiseItems: Math.floor(Math.random() * 20) + 5,  // 5-25 items
            roadBlockagePercentage: Math.floor(Math.random() * 40) + 15,  // 15-55%
            confidence: 0.72 + Math.random() * 0.27
          });
        } else {
          resolve({
            hawkersDetected: false,
            hawkerCount: 0,
            roadBlockagePercentage: 0,
            confidence: 0.95
          });
        }
      }, 100);
    });
  }

  /**
   * Generate realistic mock congestion detection
   */
  async detectCongestion(frameData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const vehicleCount = Math.floor(Math.random() * 100) + 10;
        const congestionLevel = Math.min(100, (vehicleCount / 80) * 100);
        
        resolve({
          congestionLevel: Math.floor(congestionLevel),
          vehicleCount: vehicleCount,
          estimatedWaitTime: Math.floor((congestionLevel / 100) * 120) + 20,  // 20-140 seconds
          recommendedSignalTiming: Math.floor((congestionLevel / 100) * 60) + 30  // 30-90 seconds
        });
      }, 80);
    });
  }

  /**
   * Process entire frame with all detections
   */
  async processFrame(frameData) {
    try {
      const vehicles = await this.detectVehicles(frameData);
      
      // Process helmet detection for 2-wheelers only
      const helmetResults = [];
      for (const vehicle of vehicles) {
        if (vehicle.class === '2-wheeler') {
          const helmet = await this.detectHelmet(frameData, vehicle.bbox);
          helmetResults.push({
            vehicleId: vehicle.id,
            ...helmet
          });
        }
      }

      // Extract number plates for all vehicles
      const plateResults = [];
      for (const vehicle of vehicles) {
        const plate = await this.extractNumberPlate(frameData, vehicle.bbox);
        vehicle.plateNumber = plate.plateNumber;
        plateResults.push({
          vehicleId: vehicle.id,
          ...plate
        });
      }

      // Detect speed for all vehicles
      const speedResults = [];
      for (const vehicle of vehicles) {
        const speed = await this.detectSpeed(frameData, vehicle.bbox, frameData.speedLimit || 60);
        speedResults.push({
          vehicleId: vehicle.id,
          ...speed
        });
      }

      // Check signal violations
      const signalViolations = [];
      if (frameData.signalStatus && (frameData.signalStatus === 'red' || frameData.signalStatus === 'yellow')) {
        for (const vehicle of vehicles) {
          const isViolation = await this.checkViolationZone(frameData, vehicle.bbox, frameData.signalStatus);
          if (isViolation) {
            signalViolations.push({
              vehicleId: vehicle.id,
              violation: true
            });
          }
        }
      }

      // Crowd detection
      const crowd = await this.detectCrowd(frameData);
      
      // Hawker detection
      const hawkers = await this.detectHawkers(frameData);
      
      // Congestion detection
      const congestion = await this.detectCongestion(frameData);

      return {
        timestamp: new Date(),
        vehicles,
        helmets: helmetResults,
        plates: plateResults,
        speeds: speedResults,
        signalViolations,
        crowd,
        hawkers,
        congestion,
        processingTime: 450  // ~450ms processing time
      };
    } catch (error) {
      console.error('Error processing frame:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mockMLInference = new MockMLInference();

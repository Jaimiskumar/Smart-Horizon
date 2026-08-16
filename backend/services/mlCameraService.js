/**
 * ML Camera Service
 * Orchestrates ML model detections from camera feeds
 * Integrates: Vehicle detection, Helmet detection, Number plate recognition, Crowd detection, Speed detection
 * AUTO-GENERATES CHALLANS for all violations
 */

import MLDetectionLog from '../models/MLDetectionLog.js';
import TrafficViolation from '../models/TrafficViolation.js';
import HelmetViolation from '../models/HelmetViolation.js';
import StreetEncroachment from '../models/StreetEncroachment.js';
import Camera from '../models/Camera.js';
import { createChallanFromViolation } from './challanGenerationService.js';
import { io } from '../server.js';

/**
 * Process vehicle detection from frame
 * Uses YOLOv8 for real-time vehicle detection
 */
export async function processVehicleDetection(cameraId, frameData, modelInference) {
  try {
    const detections = await modelInference.detectVehicles(frameData);
    
    for (const detection of detections) {
      await MLDetectionLog.create({
        cameraId,
        detectionType: 'vehicle_detected',
        detectionDetails: {
          vehicleClass: detection.class,
          confidence: detection.confidence,
          boundingBox: detection.bbox
        },
        frameUrl: frameData.frameUrl
      });
    }
    
    return detections;
  } catch (error) {
    console.error(`Vehicle detection error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Process helmet detection for 2-wheelers
 */
export async function processHelmetDetection(cameraId, frameData, vehicleDetections, modelInference) {
  try {
    const helmetDetections = [];
    
    for (const vehicle of vehicleDetections) {
      if (vehicle.class === '2-wheeler') {
        const helmetResult = await modelInference.detectHelmet(frameData, vehicle.bbox);
        
        helmetDetections.push({
          vehicleId: vehicle.id,
          helmetDetected: helmetResult.helmetDetected,
          confidence: helmetResult.confidence
        });
        
        // Log detection
        await MLDetectionLog.create({
          cameraId,
          detectionType: helmetResult.helmetDetected ? 'helmet_detected' : 'helmet_missing',
          detectionDetails: {
            vehicleClass: '2-wheeler',
            confidence: helmetResult.confidence,
            boundingBox: vehicle.bbox
          },
          frameUrl: frameData.frameUrl
        });
        
        // Create violation if no helmet
        if (!helmetResult.helmetDetected) {
          const violation = await HelmetViolation.create({
            vehicleNumber: vehicle.plateNumber || 'PENDING_OCR',
            helmetStatus: 'no_helmet',
            signalLocation: frameData.location,
            latitude: frameData.latitude,
            longitude: frameData.longitude,
            cameraId,
            imageUrl: frameData.frameUrl,
            timestamp: new Date(),
            severity: 'violation',
            fineAmount: 500,
            status: 'pending'
          });
          
          // AUTO-CREATE CHALLAN
          const challan = await createChallanFromViolation(violation, 'HelmetViolation');
          if (challan) {
            console.log(`🎟️ Auto-Challan: ${challan.challanNumber} for ${vehicle.plateNumber}`);
          }
          
          // Broadcast real-time alert
          io.emit('helmet_violation_detected', {
            vehicleNumber: vehicle.plateNumber,
            cameraId,
            fine: 500,
            challanNumber: challan?.challanNumber,
            timestamp: new Date()
          });
          
          helmetDetections[helmetDetections.length - 1].violationId = violation._id;
        }
      }
    }
    
    return helmetDetections;
  } catch (error) {
    console.error(`Helmet detection error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Process number plate extraction using OCR
 * Uses EasyOCR or PaddleOCR for number plate recognition
 */
export async function extractNumberPlates(cameraId, frameData, vehicleDetections, modelInference) {
  try {
    const plateResults = [];
    
    for (const vehicle of vehicleDetections) {
      const plateOCR = await modelInference.extractNumberPlate(frameData, vehicle.bbox);
      
      if (plateOCR.plateNumber && plateOCR.confidence > 0.7) {
        plateResults.push({
          vehicleId: vehicle.id,
          plateNumber: plateOCR.plateNumber,
          confidence: plateOCR.confidence,
          plateImage: plateOCR.plateImage
        });
        
        // Log successful extraction
        await MLDetectionLog.create({
          cameraId,
          detectionType: 'number_plate_extracted',
          detectionDetails: {
            vehicleNumber: plateOCR.plateNumber,
            confidence: plateOCR.confidence,
            boundingBox: vehicle.bbox
          },
          frameUrl: frameData.frameUrl
        });
      }
    }
    
    return plateResults;
  } catch (error) {
    console.error(`Number plate extraction error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Detect speeding vehicles using frame analysis
 * Compares vehicle motion across frames with speed limit
 */
export async function processSpeedDetection(cameraId, frameData, vehicleDetections, speedLimit, modelInference) {
  try {
    const speedingVehicles = [];
    
    for (const vehicle of vehicleDetections) {
      const speedAnalysis = await modelInference.detectSpeed(frameData, vehicle.bbox, speedLimit);
      
      if (speedAnalysis.isSpecialized) {
        // Use specialized speed detection (radar/lidar integration)
        const speed = speedAnalysis.speed;
        
        if (speed > speedLimit) {
          const violation = await TrafficViolation.create({
            vehicleNumber: vehicle.plateNumber || 'PENDING_OCR',
            violationType: 'speeding',
            speedRecorded: speed,
            speedLimit: speedLimit,
            signalLocation: frameData.location,
            latitude: frameData.latitude,
            longitude: frameData.longitude,
            cameraId,
            imageUrl: frameData.frameUrl,
            timestamp: new Date(),
            severity: speed > speedLimit + 20 ? 'high' : 'medium',
            vehicleClass: vehicle.class,
            fineAmount: calculateSpeedingFine(speed, speedLimit),
            status: 'pending'
          });
          
          // AUTO-CREATE CHALLAN
          const challan = await createChallanFromViolation(violation, 'TrafficViolation');
          if (challan) {
            console.log(`🎟️ Auto-Challan: ${challan.challanNumber} for speeding violation`);
          }
          
          // Broadcast real-time alert
          io.emit('speeding_detected', {
            vehicleNumber: vehicle.plateNumber,
            speed: speed,
            limit: speedLimit,
            fine: violation.fineAmount,
            challanNumber: challan?.challanNumber,
            cameraId,
            timestamp: new Date()
          });
          
          speedingVehicles.push({
            vehicleId: vehicle.id,
            speed: speed,
            speedLimit: speedLimit,
            violationId: violation._id,
            challanNumber: challan?.challanNumber
          });
          
          await MLDetectionLog.create({
            cameraId,
            detectionType: 'speeding_detected',
            detectionDetails: {
              vehicleNumber: vehicle.plateNumber || 'PENDING_OCR',
              speed: speed,
              speedLimit: speedLimit,
              confidence: speedAnalysis.confidence
            },
            frameUrl: frameData.frameUrl,
            violationCreated: violation._id,
            challanGenerated: challan?.challanNumber
          });
        }
      }
    }
    
    return speedingVehicles;
  } catch (error) {
    console.error(`Speed detection error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Detect signal violations
 */
export async function processSignalViolation(cameraId, frameData, vehicleDetections, signalStatus, modelInference) {
  try {
    const violations = [];
    
    // If signal is red or yellow, detect vehicles crossing
    if (signalStatus === 'red' || signalStatus === 'yellow') {
      for (const vehicle of vehicleDetections) {
        const isInViolationZone = await modelInference.checkViolationZone(frameData, vehicle.bbox, signalStatus);
        
        if (isInViolationZone) {
          const violation = await TrafficViolation.create({
            vehicleNumber: vehicle.plateNumber || 'PENDING_OCR',
            violationType: 'signal_breaking',
            signalLocation: frameData.location,
            latitude: frameData.latitude,
            longitude: frameData.longitude,
            cameraId,
            imageUrl: frameData.frameUrl,
            timestamp: new Date(),
            severity: signalStatus === 'red' ? 'high' : 'medium',
            vehicleClass: vehicle.class,
            fineAmount: signalStatus === 'red' ? 1000 : 500,
            status: 'pending'
          });
          
          // AUTO-CREATE CHALLAN
          const challan = await createChallanFromViolation(violation, 'TrafficViolation');
          if (challan) {
            console.log(`🎟️ Auto-Challan: ${challan.challanNumber} for signal violation`);
          }
          
          // Broadcast real-time alert
          io.emit('signal_violation_detected', {
            vehicleNumber: vehicle.plateNumber,
            signal: signalStatus,
            fine: violation.fineAmount,
            challanNumber: challan?.challanNumber,
            cameraId,
            timestamp: new Date()
          });
          
          violations.push({
            vehicleId: vehicle.id,
            signal: signalStatus,
            violationId: violation._id,
            challanNumber: challan?.challanNumber
          });
          
          await MLDetectionLog.create({
            cameraId,
            detectionType: 'signal_violation',
            detectionDetails: {
              vehicleNumber: vehicle.plateNumber || 'PENDING_OCR',
              signalStatus: signalStatus,
              confidence: isInViolationZone
            },
            frameUrl: frameData.frameUrl,
            violationCreated: violation._id,
            challanGenerated: challan?.challanNumber
          });
        }
      }
    }
    
    return violations;
  } catch (error) {
    console.error(`Signal violation detection error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Detect crowd/pedestrian gathering (for street encroachment)
 */
export async function processCrowdDetection(cameraId, frameData, modelInference) {
  try {
    const crowdAnalysis = await modelInference.detectCrowd(frameData);
    
    if (crowdAnalysis.crowdDetected && crowdAnalysis.crowdSize > 5) {
      // Significant crowd detected
      const blockageLevel = crowdAnalysis.roadBlockagePercentage;
      
      const encroachment = await StreetEncroachment.create({
        encroachmentType: 'pedestrian_gathering',
        location: frameData.location,
        latitude: frameData.latitude,
        longitude: frameData.longitude,
        cameraId,
        crowdSize: crowdAnalysis.crowdSize,
        roadBlockagePercentage: blockageLevel,
        imageUrl: frameData.frameUrl,
        timestamp: new Date(),
        severity: blockageLevel > 60 ? 'critical' : blockageLevel > 30 ? 'high' : 'medium',
        status: blockageLevel > 60 ? 'reported' : 'detected'
      });
      
      await MLDetectionLog.create({
        cameraId,
        detectionType: 'crowd_detected',
        detectionDetails: {
          crowdSize: crowdAnalysis.crowdSize,
          roadBlockagePercentage: blockageLevel,
          confidence: crowdAnalysis.confidence
        },
        frameUrl: frameData.frameUrl,
        violationCreated: encroachment._id
      });
      
      return { encroachmentId: encroachment._id, ...crowdAnalysis };
    }
    
    return null;
  } catch (error) {
    console.error(`Crowd detection error for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Calculate speeding fine based on excess speed
 */
function calculateSpeedingFine(recordedSpeed, speedLimit) {
  const excessSpeed = recordedSpeed - speedLimit;
  
  if (excessSpeed <= 10) return 500;
  if (excessSpeed <= 20) return 1000;
  if (excessSpeed <= 30) return 1500;
  if (excessSpeed <= 40) return 2000;
  return 2500;  // Maximum fine for 40+ km/h overspeed
}

/**
 * Store frame for analysis
 */
export async function storeFrameForAnalysis(cameraId, frameData) {
  try {
    await MLDetectionLog.create({
      cameraId,
      detectionType: 'raw_frame',
      frameUrl: frameData.frameUrl,
      timestamp: new Date(),
      processingStatus: 'pending'
    });
  } catch (error) {
    console.error(`Error storing frame:`, error);
  }
}

/**
 * Update camera heartbeat
 */
export async function updateCameraHeartbeat(cameraId) {
  try {
    await Camera.updateOne(
      { cameraId },
      { lastHeartbeat: new Date() }
    );
  } catch (error) {
    console.error(`Error updating camera heartbeat:`, error);
  }
}

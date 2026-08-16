import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { realMLInference } from './realMLInference.js';
import TrafficViolation from '../models/TrafficViolation.js';
import HelmetViolation from '../models/HelmetViolation.js';
import MLDetectionLog from '../models/MLDetectionLog.js';
import { createChallanFromViolation } from './challanGenerationService.js';
import { io } from '../server.js';

// Configure multer for file uploads
const uploadPath = path.join(process.cwd(), 'uploads', 'evidence');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    cb(null, `${timestamp}-${randomStr}${path.extname(file.originalname)}`);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024  // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos allowed.'));
    }
  }
});

/**
 * Process uploaded file through ML pipeline
 */
export async function processUploadedFile(filePath, fileType = 'image', cameraId = 'UPLOAD-CAM-001') {
  try {
    console.log(`📸 Processing ${fileType}: ${filePath}`);

    const frameData = {
      frameUrl: `file://${filePath}`,
      imagePath: filePath,
      location: 'Upload Processing Station',
      cameraId: cameraId,
      signalStatus: 'green',
      speedLimit: 60,
      fps: 30,
      timestamp: new Date()
    };

    // Process through ML inference
    const detectionResult = await realMLInference.processFrame(frameData);

    // Create violation records for detected issues
    const violations = [];
    
    // Process helmet violations
    for (const helmet of detectionResult.helmets) {
      if (!helmet.helmetDetected) {
        const vehicle = detectionResult.vehicles.find(v => v.id === helmet.vehicleId);
        if (vehicle) {
          const violation = await HelmetViolation.create({
            vehicleNumber: vehicle.plateNumber || 'UPLOAD-DETECTION',
            helmetStatus: helmet.helmetType,
            signalLocation: frameData.location,
            latitude: 37.7749,
            longitude: -122.4194,
            cameraId: frameData.cameraId,
            imageUrl: filePath,
            timestamp: new Date(),
            severity: 'violation',
            fineAmount: 500,
            status: 'pending'
          });

          violations.push(violation);

          // Auto-create challan
          const challan = await createChallanFromViolation(violation, 'HelmetViolation');
          if (challan) {
            console.log(`  ✅ Helmet violation challan: ${challan.challanNumber}`);
          }
        }
      }
    }

    // Process speeding violations
    for (const speed of detectionResult.speeds) {
      if (speed.speed > frameData.speedLimit) {
        const vehicle = detectionResult.vehicles.find(v => v.id === speed.vehicleId);
        if (vehicle) {
          const fineAmount = (speed.speed - frameData.speedLimit) * 100;
          const violation = await TrafficViolation.create({
            vehicleNumber: vehicle.plateNumber || 'UPLOAD-DETECTION',
            violationType: 'speeding',
            speedRecorded: speed.speed,
            speedLimit: frameData.speedLimit,
            signalLocation: frameData.location,
            latitude: 37.7749,
            longitude: -122.4194,
            cameraId: frameData.cameraId,
            imageUrl: filePath,
            timestamp: new Date(),
            severity: 'high',
            vehicleClass: vehicle.class,
            fineAmount: fineAmount,
            status: 'pending'
          });

          violations.push(violation);

          // Auto-create challan
          const challan = await createChallanFromViolation(violation, 'TrafficViolation');
          if (challan) {
            console.log(`  ✅ Speeding violation challan: ${challan.challanNumber}`);
          }
        }
      }
    }

    // Process signal violations (if signal is red/yellow)
    for (const sigViolation of detectionResult.signalViolations) {
      const vehicle = detectionResult.vehicles.find(v => v.id === sigViolation.vehicleId);
      if (vehicle) {
        const violation = await TrafficViolation.create({
          vehicleNumber: vehicle.plateNumber || 'UPLOAD-DETECTION',
          violationType: 'signal_breaking',
          signalLocation: frameData.location,
          latitude: 37.7749,
          longitude: -122.4194,
          cameraId: frameData.cameraId,
          imageUrl: filePath,
          timestamp: new Date(),
          severity: 'high',
          vehicleClass: vehicle.class,
          fineAmount: 1000,
          status: 'pending'
        });

        violations.push(violation);

        // Auto-create challan
        const challan = await createChallanFromViolation(violation, 'TrafficViolation');
        if (challan) {
          console.log(`  ✅ Signal violation challan: ${challan.challanNumber}`);
        }
      }
    }

    // Log detection
    const detectionLog = await MLDetectionLog.create({
      cameraId: frameData.cameraId,
      detectionType: 'file_upload_analysis',
      detectionDetails: {
        fileType: fileType,
        vehiclesDetected: detectionResult.vehicles.length,
        helmetsAnalyzed: detectionResult.helmets.length,
        platesExtracted: detectionResult.plates.length,
        speedsDetected: detectionResult.speeds.length,
        signalViolations: detectionResult.signalViolations.length,
        crowdDetected: detectionResult.crowd.crowdDetected,
        hawkersDetected: detectionResult.hawkers.hawkersDetected,
        violationsCreated: violations.length
      },
      frameUrl: filePath,
      processingStatus: 'completed',
      processingTime: detectionResult.processingTime
    });

    // Broadcast result
    io.emit('file_processing_complete', {
      fileType,
      vehiclesDetected: detectionResult.vehicles.length,
      violationsCreated: violations.length,
      timestamp: new Date(),
      detectionLogId: detectionLog._id
    });

    return {
      success: true,
      detections: detectionResult,
      violationsCreated: violations.length,
      violations: violations.map(v => ({
        type: v.constructor.modelName,
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        fineAmount: v.fineAmount || 500
      })),
      detectionLogId: detectionLog._id
    };

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    throw error;
  }
}

/**
 * Convert video to frames and process
 */
export async function processVideoFrames(filePath, cameraId = 'UPLOAD-CAM-001', maxFrames = 5) {
  try {
    console.log(`🎬 Processing video: ${filePath} (max ${maxFrames} frames)`);

    // For demo: process video as a single frame
    // In production: extract actual frames using ffmpeg
    const allViolations = [];

    for (let i = 0; i < maxFrames; i++) {
      try {
        const result = await processUploadedFile(filePath, 'video_frame', cameraId);
        allViolations.push(...result.violations);
      } catch (error) {
        console.warn(`Could not process frame ${i}:`, error.message);
      }
    }

    return {
      success: true,
      framesProcessed: maxFrames,
      totalViolations: allViolations.length,
      violations: allViolations
    };

  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
}

/**
 * Generate thumbnail from image/video
 */
export async function generateThumbnail(filePath, outputPath) {
  try {
    await sharp(filePath)
      .resize(200, 200)
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

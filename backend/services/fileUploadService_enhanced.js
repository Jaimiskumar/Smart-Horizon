/**
 * Enhanced File Upload Service
 * Handles image and video processing with ML inference
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { realMLInference } from './realMLInference.js';
import MLDetectionLog from '../models/MLDetectionLog.js';

// Configure multer for file uploads
const uploadDir = 'uploads';
await fs.ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, file.fieldname);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

/**
 * Extract frames from video using ffmpeg
 */
export async function processVideoFrames(videoPath, outputDir, fps = 1) {
  return new Promise((resolve, reject) => {
    const framePath = path.join(outputDir, 'frame-%04d.jpg');
    
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=${fps}`,
      '-q:v', '2',
      framePath
    ]);

    let errorOutput = '';

    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        // Get list of extracted frames
        fs.readdir(outputDir)
          .then(files => {
            const frames = files
              .filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
              .sort()
              .map(f => path.join(outputDir, f));
            resolve(frames);
          })
          .catch(reject);
      } else {
        reject(new Error(`FFmpeg error: ${errorOutput}`));
      }
    });
  });
}

/**
 * Process uploaded image with ML
 */
export async function processUploadedFile(filePath, fileType = 'image') {
  try {
    console.log(`📸 Processing uploaded file: ${filePath}`);

    const fileBase64 = await fs.readFile(filePath, 'base64');
    const frameUrl = `data:image/jpeg;base64,${fileBase64}`;

    const frameData = {
      frameUrl,
      frameBase64: fileBase64,
      location: 'Uploaded File',
      latitude: 0,
      longitude: 0,
      speedLimit: 60,
      signalStatus: 'green'
    };

    // Process with real ML backend
    const result = await realMLInference.processFrame(frameData);
    
    // Save detection log
    const log = new MLDetectionLog({
      sourceType: 'upload',
      sourceFile: filePath,
      detectionResults: result,
      vehicleCount: result.vehicleCount,
      violationTypes: [],
      status: 'processed'
    });

    await log.save();

    return {
      success: true,
      detectionLogId: log._id,
      ...result
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
}

export { uploadMiddleware };

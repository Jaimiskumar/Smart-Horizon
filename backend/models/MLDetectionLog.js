import mongoose from 'mongoose';

const mlDetectionLogSchema = new mongoose.Schema({
  cameraId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  detectionType: {
    type: String,
    enum: [
      'vehicle_detected',
      'helmet_detected',
      'helmet_missing',
      'number_plate_extracted',
      'speeding_detected',
      'signal_violation',
      'crowd_detected',
      'wrong_parking',
      'hawker_detected',
      'congestion_high'
    ],
    required: true,
    index: true
  },
  detectionDetails: {
    vehicleClass: String,
    vehicleNumber: String,
    confidence: Number,
    boundingBox: {
      x1: Number,
      y1: Number,
      x2: Number,
      y2: Number
    },
    crowdSize: Number,
    speed: Number,
    additionalData: mongoose.Schema.Types.Mixed
  },
  frameUrl: String,
  processed: {
    type: Boolean,
    default: false
  },
  violationCreated: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    ref: 'Violation'
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String
}, { timestamps: true });

mlDetectionLogSchema.index({ cameraId: 1, timestamp: -1 });
mlDetectionLogSchema.index({ detectionType: 1, timestamp: -1 });

export default mongoose.model('MLDetectionLog', mlDetectionLogSchema);

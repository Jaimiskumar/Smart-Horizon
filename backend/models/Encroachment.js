import mongoose from 'mongoose';

const encroachmentSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    zone: {
      type: String,
      required: true,
      enum: ['footpath', 'road-lane', 'no-parking', 'restricted-area']
    },
    detectedObject: {
      type: String,
      required: true,
      enum: ['vendor', 'cart', 'vehicle', 'obstacle', 'hawker']
    },
    licensePlate: {
      type: String,
      default: null
    },
    imageUrl: {
      type: String,
      required: true
    },
    detectionTime: {
      type: Date,
      default: Date.now,
      index: true
    },
    status: {
      type: String,
      enum: ['detected', 'warning-issued', 'alert-sent', 'resolved', 'ignored'],
      default: 'detected',
      index: true
    },
    stationaryDuration: {
      type: Number,
      default: 0
    },
    warningIssuedAt: {
      type: Date,
      default: null
    },
    alertSentAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

encroachmentSchema.index({ status: 1, detectionTime: -1 });

export default mongoose.model('Encroachment', encroachmentSchema);

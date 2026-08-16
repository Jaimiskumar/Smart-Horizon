import mongoose from 'mongoose';

const trafficViolationSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    index: true
  },
  violationType: {
    type: String,
    enum: ['speeding', 'signal_breaking', 'lane_violation', 'rash_driving'],
    required: true
  },
  speedRecorded: {
    type: Number,
    default: null
  },
  speedLimit: {
    type: Number,
    default: null
  },
  signalLocation: {
    type: String,
    required: true
  },
  latitude: Number,
  longitude: Number,
  cameraId: {
    type: String,
    required: true
  },
  imageUrl: String,
  videoUrl: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  vehicleClass: {
    type: String,
    enum: ['2-wheeler', '4-wheeler', 'truck', 'bus', 'other'],
    required: true
  },
  driver: {
    name: String,
    licenseNumber: String,
    phone: String
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'challenged', 'paid', 'dismissed'],
    default: 'pending'
  },
  notes: String,
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date
}, { timestamps: true });

export default mongoose.model('TrafficViolation', trafficViolationSchema);

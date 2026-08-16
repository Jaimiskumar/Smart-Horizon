import mongoose from 'mongoose';

const helmetViolationSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    index: true
  },
  helmetStatus: {
    type: String,
    enum: ['no_helmet', 'improper_helmet', 'helmet_removed'],
    required: true
  },
  riderId: {
    name: String,
    phone: String
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
    enum: ['warning', 'violation'],
    default: 'violation'
  },
  fineAmount: {
    type: Number,
    default: 500  // Default fine for helmet violation
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'challenged', 'paid', 'dismissed'],
    default: 'pending'
  },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  notes: String
}, { timestamps: true });

export default mongoose.model('HelmetViolation', helmetViolationSchema);

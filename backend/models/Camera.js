import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  cameraId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cameraName: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  cameraType: {
    type: String,
    enum: ['fixed', 'ptz', 'thermal', 'high_speed'],
    default: 'fixed'
  },
  signalLocation: String,  // Associated traffic signal
  zoneId: mongoose.Schema.Types.ObjectId,  // Reference to ParkingZone if applicable
  streamUrl: {
    type: String,
    required: true
  },
  rtspUrl: String,
  resolution: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 }
  },
  fps: {
    type: Number,
    default: 30
  },
  vendor: String,
  model: String,
  ipAddress: String,
  macAddress: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'offline'],
    default: 'active'
  },
  mlModelsEnabled: {
    vehicleDetection: { type: Boolean, default: true },
    helmetDetection: { type: Boolean, default: true },
    numberPlateExtraction: { type: Boolean, default: true },
    crowdDetection: { type: Boolean, default: true },
    speedDetection: { type: Boolean, default: true },
    wrongParkingDetection: { type: Boolean, default: true }
  },
  detectionConfidenceThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.6
  },
  lastHeartbeat: Date,
  totalViolationsDetected: {
    type: Number,
    default: 0
  },
  installationDate: Date,
  maintenanceDate: Date,
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('Camera', cameraSchema);

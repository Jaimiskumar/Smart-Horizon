import mongoose from 'mongoose';

const streetEncroachmentSchema = new mongoose.Schema({
  encroachmentType: {
    type: String,
    enum: ['vendor', 'hawker', 'pedestrian_gathering', 'temporary_structure', 'merchandise_display'],
    required: true
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  latitude: Number,
  longitude: Number,
  cameraId: {
    type: String,
    required: true
  },
  crowdSize: {
    type: Number,
    default: 0  // Number of people detected
  },
  roadBlockagePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0  // Percentage of road blocked
  },
  imageUrl: String,
  videoUrl: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: {
    type: Number,
    default: 0  // Duration in minutes
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['detected', 'reported', 'action_taken', 'cleared', 'dismissed'],
    default: 'detected'
  },
  description: String,
  respondent: {
    name: String,
    department: String,
    phone: String
  },
  actionTaken: String,
  actionDate: Date,
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  notes: String
}, { timestamps: true });

export default mongoose.model('StreetEncroachment', streetEncroachmentSchema);

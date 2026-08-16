import mongoose from 'mongoose';

const citizenEncroachmentReportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['vendor', 'hawker', 'illegal_parking', 'road_blockage', 'construction', 'abandoned_vehicle'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    required: true  // S3 URL of uploaded image
  },
  videoUrl: String,  // Optional video evidence
  description: {
    type: String,
    required: true
  },
  crowdSize: Number,  // Estimated if applicable
  roadBlockagePercentage: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // ML Verification Fields
  mlVerification: {
    verified: {
      type: Boolean,
      default: false
    },
    detectionType: String,  // What ML detected: vendor, crowd, etc.
    confidence: Number,      // ML confidence score (0-1)
    verifiedAt: Date,
    mlModel: String,        // Which model was used
    details: mongoose.Schema.Types.Mixed
  },
  
  // Admin Review
  adminReview: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,
    adminVerified: Boolean,  // True if admin confirms ML verification
    notes: String
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: [
      'submitted',
      'ml_verification_pending',
      'ml_verified',
      'ml_rejected',
      'admin_review_pending',
      'admin_verified',
      'admin_rejected',
      'action_taken',
      'resolved',
      'dismissed'
    ],
    default: 'submitted',
    index: true
  },
  
  // Authority Response
  authorityResponse: {
    assignedTo: mongoose.Schema.Types.ObjectId,
    department: String,
    actionTaken: String,
    actionDate: Date,
    resolutionImage: String  // Before/after image
  },
  
  // Challan Generation
  challanGenerated: {
    type: Boolean,
    default: false
  },
  challanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan'
  },
  challanAmount: Number,
  
  // Reward for Citizen Reporting
  rewardAmount: Number,
  rewardStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: null
  },
  rewardPaidDate: Date,
  
  // Feedback
  citizenFeedback: String,
  citizenRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  notes: String
}, { timestamps: true });

// Indices for fast queries
citizenEncroachmentReportSchema.index({ reporterId: 1, timestamp: -1 });
citizenEncroachmentReportSchema.index({ status: 1, timestamp: -1 });
citizenEncroachmentReportSchema.index({ 'mlVerification.verified': 1 });
citizenEncroachmentReportSchema.index({ latitude: 1, longitude: 1 });  // Geo queries

export default mongoose.model('CitizenEncroachmentReport', citizenEncroachmentReportSchema);

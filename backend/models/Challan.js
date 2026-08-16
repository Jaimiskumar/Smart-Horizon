import mongoose from 'mongoose';

const challanSchema = new mongoose.Schema({
  challanNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  vehicleNumber: {
    type: String,
    required: true,
    index: true
  },
  ownerPhone: String,
  violationType: {
    type: String,
    enum: [
      'speeding',
      'helmet_violation',
      'signal_violation',
      'illegal_parking',
      'no_parking_zone',
      'wrong_parking',
      'encroachment',
      'expired_insurance',
      'expired_puc',
      'rash_driving',
      'lane_violation'
    ],
    required: true
  },
  violationLocation: {
    type: String,
    required: true
  },
  latitude: Number,
  longitude: Number,
  violationDateTime: {
    type: Date,
    required: true,
    index: true
  },
  cameraId: String,  // If detected from camera
  citizenReportId: mongoose.Schema.Types.ObjectId,  // If reported by citizen
  
  // Evidence
  imageUrl: String,
  videoUrl: String,
  
  // Details
  violationDetails: mongoose.Schema.Types.Mixed,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Fine Amount
  fineAmount: {
    type: Number,
    required: true
  },
  description: String,
  
  // Challan Status
  status: {
    type: String,
    enum: [
      'pending',
      'issued',
      'accepted',
      'challenged',
      'paid',
      'dismissed',
      'cancelled'
    ],
    default: 'issued',
    index: true
  },
  
  // Payment Details
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'card', 'upi'],
    default: null
  },
  paymentDate: Date,
  transactionId: String,
  
  // Challenge Details (if citizen challenges)
  challenge: {
    challenged: {
      type: Boolean,
      default: false
    },
    challengeDate: Date,
    challengeReason: String,
    challengeEvidence: String,
    challengeStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: null
    },
    decidedBy: mongoose.Schema.Types.ObjectId,
    decisionDate: Date,
    decisionNotes: String
  },
  
  // Issue Details
  issuedBy: mongoose.Schema.Types.ObjectId,
  issuedAt: {
    type: Date,
    default: Date.now
  },
  
  // Reminder/Notice
  firstReminderSent: Date,
  secondReminderSent: Date,
  
  // Auto-generated E-challan fields
  eChallanNumber: String,
  eChallanFormat: {  // Digital format details
    format: {
      type: String,
      enum: ['pdf', 'sms', 'email', 'web'],
      default: 'pdf'
    },
    sentTo: String,  // Email or phone
    sendDate: Date,
    deliveryStatus: String
  },
  
  notes: String
}, { timestamps: true });

// Indices for fast queries
challanSchema.index({ vehicleNumber: 1, status: 1 });
challanSchema.index({ violationDateTime: -1 });
challanSchema.index({ status: 1, paymentStatus: 1 });

export default mongoose.model('Challan', challanSchema);

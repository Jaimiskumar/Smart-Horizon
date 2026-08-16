import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema(
  {
    fineId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    violationType: {
      type: String,
      enum: [
        'illegal_parking',
        'no_parking_zone',
        'double_parking',
        'overtime_parking',
        'high_speed',
        'no_helmet',
        'rush_driving',
        'lane_violation',
        'signal_violation',
        'wrong_way'
      ],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    location: {
      name: String,
      address: String,
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 }
    },
    zone: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'disputed', 'cancelled', 'waived'],
      default: 'pending',
      index: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    warningIssued: {
      type: Boolean,
      default: false
    },
    warningTime: Date,
    imageUrl: String,
    evidenceUrls: [String],
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    paidAt: Date,
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction'
    },
    disputeReason: String,
    cancelReason: String,
    notes: String
  },
  {
    timestamps: true
  }
);

// Compound indexes for reporting and filtering
fineSchema.index({ vehicleNumber: 1, status: 1 });
fineSchema.index({ userId: 1, status: 1 });
fineSchema.index({ status: 1, issuedAt: -1 });
fineSchema.index({ violationType: 1, issuedAt: -1 });
fineSchema.index({ issuedAt: -1 });

export default mongoose.model('Fine', fineSchema);

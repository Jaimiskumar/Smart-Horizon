import mongoose from 'mongoose';

const vehicleInsuranceSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  insuranceProvider: {
    type: String,
    required: true
  },
  policyNumber: {
    type: String,
    required: true,
    unique: true
  },
  policyStartDate: {
    type: Date,
    required: true
  },
  policyExpiryDate: {
    type: Date,
    required: true,
    index: true
  },
  insuranceType: {
    type: String,
    enum: ['third_party', 'comprehensive'],
    default: 'comprehensive'
  },
  idvAmount: {
    type: Number,
    required: true
  },
  premiumAmount: {
    type: Number,
    required: true
  },
  documentUrl: String,  // S3 URL for insurance document
  documentVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  renewalAlert: {
    type: Boolean,
    default: false
  },
  renewalAlertDate: Date,
  status: {
    type: String,
    enum: ['valid', 'expired', 'expiring_soon', 'pending_renewal'],
    default: 'valid'
  },
  notes: String
}, { timestamps: true });

// Index for expiry alerts
vehicleInsuranceSchema.index({ policyExpiryDate: 1, userId: 1 });

export default mongoose.model('VehicleInsurance', vehicleInsuranceSchema);

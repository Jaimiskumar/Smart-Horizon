import mongoose from 'mongoose';

const vehiclePUCSchema = new mongoose.Schema({
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
  pucNumber: {
    type: String,
    required: true,
    unique: true
  },
  issuanceDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  testingCenter: {
    name: String,
    location: String,
    licenseNumber: String
  },
  emissionStandard: {
    type: String,
    enum: ['BS2', 'BS3', 'BS4', 'BS6'],
    default: 'BS6'
  },
  vehicleType: {
    type: String,
    enum: ['2-wheeler', '4-wheeler', 'commercial'],
    required: true
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'lpg', 'electric', 'hybrid'],
    required: true
  },
  testResults: {
    hcLevel: Number,      // Hydrocarbon levels
    coLevel: Number,       // Carbon Monoxide levels
    noLevel: Number,       // Nitrogen Oxide levels
    particulates: Number,
    passed: {
      type: Boolean,
      default: true
    }
  },
  documentUrl: String,  // S3 URL for PUC certificate
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
    enum: ['valid', 'expired', 'expiring_soon', 'pending_renewal', 'failed'],
    default: 'valid'
  },
  notes: String
}, { timestamps: true });

// Index for expiry alerts
vehiclePUCSchema.index({ expiryDate: 1, userId: 1 });
vehiclePUCSchema.index({ vehicleNumber: 1, userId: 1 });

export default mongoose.model('VehiclePUC', vehiclePUCSchema);

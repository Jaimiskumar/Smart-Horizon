import mongoose from 'mongoose';

const vehicleRCSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  ownerPhone: {
    type: String,
    required: true
  },
  ownerAddress: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  chassisNumber: {
    type: String,
    required: true
  },
  engineNumber: {
    type: String,
    required: true
  },
  vehicleMake: {
    type: String,
    required: true
  },
  vehicleModel: {
    type: String,
    required: true
  },
  vehicleColor: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    required: true
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'lpg', 'electric', 'hybrid'],
    required: true
  },
  class: {
    type: String,
    enum: ['2-wheeler', '4-wheeler', 'truck', 'bus', 'commercial'],
    required: true
  },
  seatingCapacity: {
    type: Number,
    required: true
  },
  grossVehicleWeight: {
    type: Number,
    required: true
  },
  documentUrl: String,  // S3 URL for RC document
  documentVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  status: {
    type: String,
    enum: ['valid', 'suspended', 'cancelled', 'pending_verification'],
    default: 'valid'
  },
  suspensionReason: String,
  notes: String
}, { timestamps: true });

vehicleRCSchema.index({ userId: 1, vehicleNumber: 1 });

export default mongoose.model('VehicleRC', vehicleRCSchema);

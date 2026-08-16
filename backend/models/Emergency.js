import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema(
  {
    emergencyId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    vehicleId: {
      type: String,
      required: true,
      index: true
    },
    vehicleType: {
      type: String,
      enum: ['ambulance', 'fire_truck', 'police', 'disaster_response'],
      required: true
    },
    vehicleNumber: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'en_route'],
      default: 'active',
      index: true
    },
    currentLocation: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      address: String,
      lastUpdated: { type: Date, default: Date.now }
    },
    destination: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      address: String,
      name: String
    },
    route: [
      {
        signalId: String,
        lat: Number,
        lng: Number,
        sequence: Number,
        cleared: { type: Boolean, default: false },
        clearedAt: Date
      }
    ],
    affectedZones: [String],
    estimatedArrival: Date,
    actualArrival: Date,
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    incidentType: String
  },
  {
    timestamps: true
  }
);

emergencySchema.index({ status: 1, startTime: -1 });
emergencySchema.index({ vehicleType: 1, status: 1 });
emergencySchema.index({ priority: 1, status: 1 });

export default mongoose.model('Emergency', emergencySchema);

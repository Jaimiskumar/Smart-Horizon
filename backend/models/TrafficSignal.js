import mongoose from 'mongoose';

const trafficSignalSchema = new mongoose.Schema(
  {
    signalId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: String,
    location: {
      name: String,
      address: String,
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 }
    },
    status: {
      type: String,
      enum: ['green', 'yellow', 'red', 'offline', 'flashing'],
      default: 'green',
      index: true
    },
    currentTimer: {
      type: Number,
      default: 30,
      min: 0,
      max: 300
    },
    // Timer settings for each state
    timings: {
      green: { type: Number, default: 30 },
      yellow: { type: Number, default: 5 },
      red: { type: Number, default: 30 }
    },
    vehicleCount: {
      type: Number,
      default: 0,
      min: 0
    },
    pedestrianCount: {
      type: Number,
      default: 0,
      min: 0
    },
    congestionLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true
    },
    connectedSignals: [String],
    mode: {
      type: String,
      enum: ['auto', 'manual', 'emergency', 'maintenance'],
      default: 'auto',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    // Historical stats
    stats: {
      avgVehicleCount: { type: Number, default: 0 },
      peakHour: Number,
      totalVehiclesToday: { type: Number, default: 0 }
    },
    // Weather-based adaptive timing metrics
    weatherMetrics: {
      temperature: Number,
      humidity: Number,
      rainIntensity: Number, // 0-100
      windSpeed: Number,
      weatherCondition: String, // 'clear', 'rainy', 'cloudy', etc.
      lastWeatherUpdate: Date,
      timingAdjustment: {
        reason: String,
        greenAdjustment: { type: Number, default: 0 },
        yellowAdjustment: { type: Number, default: 0 },
        redAdjustment: { type: Number, default: 0 }
      }
    },
    // Zone synchronization
    syncedZone: {
      type: String,
      uppercase: true
    },
    syncedAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastMaintenance: Date,
    installedAt: Date
  },
  {
    timestamps: true
  }
);

trafficSignalSchema.index({ mode: 1, isActive: 1 });
trafficSignalSchema.index({ congestionLevel: 1, isActive: 1 });
trafficSignalSchema.index({ lastUpdated: -1 });

export default mongoose.model('TrafficSignal', trafficSignalSchema);

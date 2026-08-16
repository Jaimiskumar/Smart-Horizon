import mongoose from 'mongoose';

/**
 * ParkingZone - represents a parking zone/area with aggregate stats
 */
const parkingZoneSchema = new mongoose.Schema(
  {
    zoneId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      name: String,
      address: String,
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 }
    },
    totalSpots: {
      type: Number,
      required: true,
      min: 0
    },
    pricePerHour: {
      type: Number,
      required: true,
      default: 20,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    operatingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' }
    },
    amenities: [{ type: String, enum: ['cctv', 'covered', 'ev_charging', 'handicap', 'security'] }],
    // Realtime stats (maintained by application layer)
    stats: {
      available: { type: Number, default: 0 },
      occupied: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('ParkingZone', parkingZoneSchema);

import mongoose from 'mongoose';

const parkingSpotSchema = new mongoose.Schema(
  {
    spotId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    zoneId: {
      type: String,
      required: true,
      uppercase: true
    },
    // Legacy field kept for compatibility
    zone: {
      type: String
    },
    location: {
      name: String,
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 }
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'maintenance'],
      default: 'available'
    },
    type: {
      type: String,
      enum: ['regular', 'disabled', 'ev', 'vip'],
      default: 'regular'
    },
    vehicleCategory: {
      type: String,
      enum: ['2-wheeler', '4-wheeler'],
      default: '4-wheeler'
    },
    floor: {
      type: Number,
      default: 0
    },
    pricePerHour: {
      type: Number,
      default: 20,
      min: 0
    },
    // Shadow parking with premium pricing
    isShadowParking: {
      type: Boolean,
      default: false
    },
    shadowPremium: {
      type: Number,
      default: 0.25, // 25% premium over base price
      min: 0,
      max: 1
    },
    // Amenities near this spot
    amenities: [{
      type: String,
      enum: ['ev_charging', 'cng_station', 'petrol_station', 'diesel_station', 'garage', 'car_wash']
    }],
    // Special features
    features: [{
      type: String
    }],
    // Customer rating
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    currentBooking: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingBooking' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vehicleNumber: String,
      startTime: Date,
      endTime: Date,
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      paymentTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentTransaction'
      }
    },
    lastOccupiedAt: Date,
    totalBookings: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Compound indexes for common queries
parkingSpotSchema.index({ zoneId: 1, status: 1 });
parkingSpotSchema.index({ zone: 1, status: 1 });
parkingSpotSchema.index({ zone: 1, type: 1 });
parkingSpotSchema.index({ 'currentBooking.userId': 1 });
parkingSpotSchema.index({ isActive: 1, status: 1 });

export default mongoose.model('ParkingSpot', parkingSpotSchema);

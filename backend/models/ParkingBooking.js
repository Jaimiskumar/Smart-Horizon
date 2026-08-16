import mongoose from 'mongoose';

/**
 * ParkingBooking - tracks the full lifecycle of a parking reservation
 * Separate from ParkingSpot to maintain booking history even after spot is released
 */
const parkingBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    spotId: {
      type: String,
      required: true,
      index: true
    },
    zoneId: {
      type: String,
      required: true,
      index: true
    },
    zone: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    durationHours: {
      type: Number,
      required: true,
      min: 0.5,
      max: 24
    },
    pricePerHour: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['reserved', 'active', 'completed', 'cancelled', 'overstay'],
      default: 'reserved',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction'
    },
    actualCheckIn: Date,
    actualCheckOut: Date,
    overstayMinutes: {
      type: Number,
      default: 0
    },
    overstayCharge: {
      type: Number,
      default: 0
    },
    cancelledAt: Date,
    cancelReason: String,
    notes: String
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
parkingBookingSchema.index({ userId: 1, status: 1 });
parkingBookingSchema.index({ zoneId: 1, status: 1 });
parkingBookingSchema.index({ spotId: 1, status: 1 });
parkingBookingSchema.index({ vehicleNumber: 1, status: 1 });
parkingBookingSchema.index({ startTime: 1, endTime: 1 });
parkingBookingSchema.index({ paymentStatus: 1, status: 1 });

export default mongoose.model('ParkingBooking', parkingBookingSchema);

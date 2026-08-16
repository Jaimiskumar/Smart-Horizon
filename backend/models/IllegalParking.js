import mongoose from 'mongoose';

const illegalParkingSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      index: true
    },
    location: {
      type: String,
      required: true
    },
    violationType: {
      type: String,
      required: true,
      enum: [
        'no-parking-zone',
        'blocking-traffic',
        'footpath-parking',
        'fire-lane',
        'disabled-spot',
        'double-parking',
        'bus-stop'
      ]
    },
    fineAmount: {
      type: Number,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    detectionTime: {
      type: Date,
      default: Date.now,
      index: true
    },
    status: {
      type: String,
      enum: ['detected', 'alert-sent', 'fine-issued', 'paid', 'dismissed'],
      default: 'detected',
      index: true
    },
    authority: {
      name: String,
      contact: String,
      distance: String
    },
    cameraId: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    alertSent: {
      type: Boolean,
      default: false
    },
    alertDetails: {
      alertId: String,
      sentAt: Date,
      recipient: String,
      method: String
    },
    finePaid: {
      type: Boolean,
      default: false
    },
    fineDetails: {
      fineId: String,
      dueDate: Date,
      paidAt: Date,
      paymentMethod: String,
      transactionId: String
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    notes: {
      type: String,
      default: ''
    },
    dismissedReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
illegalParkingSchema.index({ status: 1, detectionTime: -1 });
illegalParkingSchema.index({ licensePlate: 1, detectionTime: -1 });

export default mongoose.model('IllegalParking', illegalParkingSchema);

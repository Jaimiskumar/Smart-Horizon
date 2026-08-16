import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    // Razorpay order ID
    orderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    // Payment type
    type: {
      type: String,
      enum: ['parking', 'challan', 'fine', 'other'],
      required: true,
      index: true
    },
    // Backward compatibility
    transactionType: {
      type: String,
      enum: ['parking', 'fine', 'challan', 'other']
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Payment method
    paymentMethod: {
      type: String,
      enum: ['mock', 'razorpay', 'stripe', 'paypal'],
      default: 'razorpay'
    },
    // Razorpay/Payment specific fields
    paymentId: String,
    signature: String,
    refundId: String,
    transactionId: String,
    // Original fields for backward compatibility
    provider: {
      type: String,
      enum: ['mock', 'razorpay'],
      default: 'razorpay'
    },
    providerOrderId: {
      type: String,
      unique: true,
      sparse: true
    },
    providerPaymentId: String,
    providerSignature: String,
    // Amount
    amount: {
      type: Number,
      required: true
    },
    amountPaise: {
      type: Number
    },
    currency: {
      type: String,
      default: 'INR'
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },
    webhookVerified: {
      type: Boolean,
      default: false
    },
    // Timestamps
    completedAt: Date,
    failedAt: Date,
    refundedAt: Date,
    failureReason: String,
    // Metadata
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);

/**
 * Payment Gateway Integration Service
 * Handles Razorpay integration for parking bookings and fine payments
 */

import crypto from 'crypto';
import axios from 'axios';
import ParkingBooking from '../models/ParkingBooking.js';
import Challan from '../models/Challan.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { adminCitizenSyncService } from './adminCitizenSyncService.js';

export class PaymentGatewayService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'secret_key';
    this.razorpayBaseUrl = 'https://api.razorpay.com/v1';
  }

  /**
   * Create payment order for parking booking
   * Returns Razorpay order ID to be used in frontend
   */
  async createParkingPaymentOrder(bookingId, amount, userId) {
    try {
      const booking = await ParkingBooking.findById(bookingId);
      if (!booking) throw new Error('Booking not found');

      // Create Razorpay order
      const orderData = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `parking_${bookingId}`,
        notes: {
          bookingId: bookingId.toString(),
          userId: userId.toString(),
          spotId: booking.spotId,
          zoneId: booking.zoneId,
          type: 'parking',
          description: `Parking booking for ${booking.duration} hours`
        }
      };

      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');
      const response = await axios.post(`${this.razorpayBaseUrl}/orders`, orderData, {
        headers: { Authorization: `Basic ${auth}` }
      });

      const order = response.data;

      // Save transaction record
      const transaction = new PaymentTransaction({
        orderId: order.id,
        userId,
        amount,
        type: 'parking',
        referenceId: bookingId,
        status: 'pending',
        paymentMethod: 'razorpay',
        metadata: {
          spotId: booking.spotId,
          zoneId: booking.zoneId,
          duration: booking.duration
        }
      });

      await transaction.save();

      console.log(`💳 Parking payment order created: ${order.id}`);

      return {
        orderId: order.id,
        amount,
        currency: order.currency,
        bookingId,
        razorpayKeyId: this.razorpayKeyId
      };
    } catch (error) {
      console.error('Payment order creation error:', error);
      throw error;
    }
  }

  /**
   * Create payment order for challan/fine payment
   */
  async createChallanPaymentOrder(challanId, userId) {
    try {
      const challan = await Challan.findById(challanId);
      if (!challan) throw new Error('Challan not found');

      const amount = challan.fineAmount;

      const orderData = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `challan_${challanId}`,
        notes: {
          challanId: challanId.toString(),
          userId: userId.toString(),
          vehicleNumber: challan.vehicleNumber,
          challanNumber: challan.challanNumber,
          type: 'challan',
          violation: challan.violation,
          description: `Fine payment for ${challan.violation}`
        }
      };

      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');
      const response = await axios.post(`${this.razorpayBaseUrl}/orders`, orderData, {
        headers: { Authorization: `Basic ${auth}` }
      });

      const order = response.data;

      // Save transaction record
      const transaction = new PaymentTransaction({
        orderId: order.id,
        userId,
        amount,
        type: 'challan',
        referenceId: challanId,
        status: 'pending',
        paymentMethod: 'razorpay',
        metadata: {
          challanNumber: challan.challanNumber,
          vehicleNumber: challan.vehicleNumber,
          violation: challan.violation
        }
      });

      await transaction.save();

      console.log(`💳 Challan payment order created: ${order.id}`);

      return {
        orderId: order.id,
        amount,
        currency: order.currency,
        challanId,
        razorpayKeyId: this.razorpayKeyId
      };
    } catch (error) {
      console.error('Challan payment order creation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature from Razorpay webhook
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const message = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(message)
        .digest('hex');

      if (generatedSignature === signature) {
        console.log('✅ Payment signature verified');
        return true;
      } else {
        console.warn('❌ Payment signature verification failed');
        return false;
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle successful parking payment
   */
  async handleParkingPaymentSuccess(orderId, paymentId, transactionId) {
    try {
      // Find transaction
      const transaction = await PaymentTransaction.findOne({ orderId });
      if (!transaction) throw new Error('Transaction not found');

      // Get booking details
      const booking = await ParkingBooking.findById(transaction.referenceId);
      if (!booking) throw new Error('Booking not found');

      // Update transaction status
      transaction.status = 'completed';
      transaction.paymentId = paymentId;
      transaction.transactionId = transactionId;
      transaction.completedAt = new Date();
      await transaction.save();

      // Update booking status
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentId = paymentId;
      booking.paidAt = new Date();
      await booking.save();

      // Sync parking booking across portals
      await adminCitizenSyncService.syncParkingBooking(booking);

      // Sync parking availability
      await adminCitizenSyncService.syncParkingAvailability(
        booking.zoneId,
        booking.spotId,
        'occupied'
      );

      console.log(`✅ Parking payment successful: ${paymentId}`);

      return {
        success: true,
        booking,
        message: 'Parking payment completed successfully'
      };
    } catch (error) {
      console.error('Parking payment handling error:', error);
      throw error;
    }
  }

  /**
   * Handle successful challan payment
   */
  async handleChallanPaymentSuccess(orderId, paymentId, transactionId) {
    try {
      // Find transaction
      const transaction = await PaymentTransaction.findOne({ orderId });
      if (!transaction) throw new Error('Transaction not found');

      // Get challan details
      const challan = await Challan.findById(transaction.referenceId);
      if (!challan) throw new Error('Challan not found');

      // Update transaction status
      transaction.status = 'completed';
      transaction.paymentId = paymentId;
      transaction.transactionId = transactionId;
      transaction.completedAt = new Date();
      await transaction.save();

      // Update challan status
      challan.status = 'paid';
      challan.paymentId = paymentId;
      challan.paidAt = new Date();
      await challan.save();

      // Sync payment status across portals
      await adminCitizenSyncService.syncPaymentStatus(
        challan.challanNumber,
        'paid',
        transactionId
      );

      console.log(`✅ Challan payment successful: ${paymentId}`);

      return {
        success: true,
        challan,
        message: 'Challan payment completed successfully'
      };
    } catch (error) {
      console.error('Challan payment handling error:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(orderId, reason) {
    try {
      const transaction = await PaymentTransaction.findOne({ orderId });
      if (!transaction) return;

      transaction.status = 'failed';
      transaction.failureReason = reason;
      transaction.failedAt = new Date();
      await transaction.save();

      console.log(`❌ Payment failed for order ${orderId}: ${reason}`);

      return {
        success: false,
        message: 'Payment failed',
        reason
      };
    } catch (error) {
      console.error('Payment failure handling error:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(orderId) {
    try {
      const transaction = await PaymentTransaction.findOne({ orderId });
      if (!transaction) throw new Error('Transaction not found');

      return {
        status: transaction.status,
        amount: transaction.amount,
        type: transaction.type,
        paymentId: transaction.paymentId || null,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt || null
      };
    } catch (error) {
      console.error('Payment status error:', error);
      throw error;
    }
  }

  /**
   * Process refund for cancelled parking
   */
  async refundParkingPayment(bookingId) {
    try {
      const booking = await ParkingBooking.findById(bookingId);
      if (!booking) throw new Error('Booking not found');

      const transaction = await PaymentTransaction.findOne({
        referenceId: bookingId,
        type: 'parking',
        status: 'completed'
      });

      if (!transaction || !transaction.paymentId) {
        throw new Error('No completed payment found for this booking');
      }

      // Process refund via Razorpay API
      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');

      const refundResponse = await axios.post(
        `${this.razorpayBaseUrl}/payments/${transaction.paymentId}/refund`,
        {
          amount: Math.round(booking.totalAmount * 100),
          notes: {
            reason: 'Booking cancelled',
            bookingId: bookingId.toString()
          }
        },
        {
          headers: { Authorization: `Basic ${auth}` }
        }
      );

      // Update transaction
      transaction.status = 'refunded';
      transaction.refundId = refundResponse.data.id;
      transaction.refundedAt = new Date();
      await transaction.save();

      // Update booking
      booking.status = 'cancelled';
      booking.refundStatus = 'completed';
      await booking.save();

      // Sync availability
      await adminCitizenSyncService.syncParkingAvailability(
        booking.zoneId,
        booking.spotId,
        'available'
      );

      console.log(`♻️ Parking refund processed: ${refundResponse.data.id}`);

      return {
        success: true,
        refundId: refundResponse.data.id,
        amount: booking.totalAmount,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      console.error('Parking refund error:', error);
      throw error;
    }
  }

  /**
   * Get user payment history
   */
  async getUserPaymentHistory(userId, type = null) {
    try {
      const query = { userId };
      if (type) query.type = type;

      const transactions = await PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(20);

      const summary = {
        total: transactions.length,
        completed: transactions.filter(t => t.status === 'completed').length,
        pending: transactions.filter(t => t.status === 'pending').length,
        failed: transactions.filter(t => t.status === 'failed').length,
        totalAmount: transactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0)
      };

      return {
        transactions,
        summary
      };
    } catch (error) {
      console.error('Payment history error:', error);
      throw error;
    }
  }
}

export const paymentGatewayService = new PaymentGatewayService();

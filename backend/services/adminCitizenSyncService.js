/**
 * Admin-Citizen Real-time Synchronization Service
 * Syncs parking bookings, challans, and updates between admin and citizen portals
 */

import ParkingBooking from '../models/ParkingBooking.js';
import Challan from '../models/Challan.js';
import User from '../models/User.js';
import { io } from '../server.js';

export class AdminCitizenSyncService {
  constructor() {
    this.userSocketMap = new Map(); // Track online users
  }

  /**
   * Register user connection for real-time updates
   */
  registerUserConnection(userId, socketId) {
    this.userSocketMap.set(userId, socketId);
    console.log(`👤 User ${userId} connected for real-time updates`);
  }

  /**
   * Unregister user connection
   */
  unregisterUserConnection(userId) {
    this.userSocketMap.delete(userId);
    console.log(`👤 User ${userId} disconnected`);
  }

  /**
   * Sync parking booking across both portals
   * When citizen books → admin parking tab updated
   * When admin updates → citizen sees it in real-time
   */
  async syncParkingBooking(booking) {
    try {
      const { userId, spotId, zoneId, status, duration, startTime, totalAmount } = booking;

      // Get user details
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Prepare booking data
      const bookingData = {
        bookingId: booking._id?.toString(),
        spotId,
        zoneId,
        userId,
        userName: user.name,
        userPhone: user.phone,
        vehicleNumber: user.primaryVehicle?.number,
        status,
        duration,
        startTime,
        totalAmount,
        updatedAt: new Date()
      };

      // Broadcast to Admin Dashboard (Parking Tab)
      io.emit('admin_parking_booking_update', {
        type: 'booking_created',
        booking: bookingData,
        message: `🅿️ New parking booking: ${user.name} at ${spotId}`
      });

      // Send to specific citizen
      const citizenSocketId = this.userSocketMap.get(userId);
      if (citizenSocketId) {
        io.to(citizenSocketId).emit('citizen_parking_booking_confirmed', {
          type: 'booking_confirmed',
          booking: bookingData,
          message: '✅ Your parking booking is confirmed'
        });
      }

      console.log(`✅ Parking booking synced: ${spotId} for user ${user.name}`);

      return true;
    } catch (error) {
      console.error('Parking booking sync error:', error);
      throw error;
    }
  }

  /**
   * Sync challan/violation across both portals
   * When challan generated → citizen gets notification
   * Citizen can see all their challans in portal
   */
  async syncChallan(challan) {
    try {
      const { vehicleNumber, violation, fineAmount, challanNumber, status, userId, citizedEmail } = challan;

      // Find citizen by vehicle number or email
      const citizen = await User.findOne({
        $or: [
          { 'vehicles.number': vehicleNumber },
          { email: citizedEmail }
        ]
      });

      if (!citizen) {
        console.warn(`⚠️ Citizen not found for vehicle ${vehicleNumber}`);
        return false;
      }

      const challanData = {
        challanNumber,
        vehicleNumber,
        violationType: violation,
        fineAmount,
        status,
        generatedAt: challan.createdAt,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days to pay
      };

      // Broadcast to Admin Dashboard (Violations Tab)
      io.emit('admin_challan_generated', {
        type: 'new_challan',
        challan: challanData,
        message: `🎟️ New challan issued: ${vehicleNumber} (${violation})`,
        fine: fineAmount
      });

      // Send notification to citizen
      const citizenSocketId = this.userSocketMap.get(citizen._id.toString());
      if (citizenSocketId) {
        io.to(citizenSocketId).emit('citizen_challan_notification', {
          type: 'challan_received',
          challan: challanData,
          message: `⚠️ Traffic violation challan issued for ${vehicleNumber}`,
          dueDate: challanData.dueDate,
          paymentLink: `/citizen/payment/challan/${challanNumber}`
        });
      }

      console.log(`✅ Challan synced: ${challanNumber} for citizen ${citizen.email}`);

      return true;
    } catch (error) {
      console.error('Challan sync error:', error);
      throw error;
    }
  }

  /**
   * Sync parking availability updates
   * When spot booked/released → both portals updated
   */
  async syncParkingAvailability(zoneId, spotId, newStatus) {
    try {
      const statusData = {
        zoneId,
        spotId,
        newStatus, // available, occupied, reserved, maintenance
        updatedAt: new Date()
      };

      // Broadcast to both admin and citizens
      io.emit('parking_availability_updated', {
        type: 'availability_change',
        data: statusData,
        message: `🅿️ Spot ${spotId} is now ${newStatus}`
      });

      // Specifically notify admin parking panel
      io.emit('admin_parking_status_change', statusData);

      console.log(`✅ Parking availability synced: ${spotId} → ${newStatus}`);

      return true;
    } catch (error) {
      console.error('Parking availability sync error:', error);
      throw error;
    }
  }

  /**
   * Sync fine payment status
   * When citizen pays → admin sees payment received
   */
  async syncPaymentStatus(challanNumber, paymentStatus, transactionId) {
    try {
      const challan = await Challan.findOne({ challanNumber });
      if (!challan) throw new Error('Challan not found');

      const paymentData = {
        challanNumber,
        paymentStatus, // 'paid', 'partial', 'pending'
        transactionId,
        amount: challan.fineAmount,
        updatedAt: new Date()
      };

      // Broadcast to admin
      io.emit('admin_payment_received', {
        type: 'payment_status_change',
        payment: paymentData,
        message: `💳 Payment received for challan ${challanNumber}`
      });

      // Notify citizen
      const citizen = await User.findOne({ 'vehicles.number': challan.vehicleNumber });
      if (citizen) {
        const citizenSocketId = this.userSocketMap.get(citizen._id.toString());
        if (citizenSocketId) {
          io.to(citizenSocketId).emit('citizen_payment_confirmed', {
            type: 'payment_received',
            payment: paymentData,
            message: '✅ Payment received successfully',
            receipt: transactionId
          });
        }
      }

      console.log(`✅ Payment synced: ${challanNumber} - ${paymentStatus}`);

      return true;
    } catch (error) {
      console.error('Payment sync error:', error);
      throw error;
    }
  }

  /**
   * Sync zone-wide updates (signal changes, encroachment, etc.)
   */
  async syncZoneUpdate(zoneId, updateType, updateData) {
    try {
      const zoneUpdateData = {
        zoneId,
        updateType, // 'signal_change', 'traffic_alert', 'encroachment', etc.
        data: updateData,
        timestamp: new Date()
      };

      // Broadcast to admin zone monitoring
      io.emit('admin_zone_update', {
        type: updateType,
        zone: zoneUpdateData,
        message: `🔔 Zone ${zoneId} update: ${updateType}`
      });

      // Broadcast to citizens in that zone
      io.emit(`zone_${zoneId}_update`, zoneUpdateData);

      console.log(`✅ Zone update synced for ${zoneId}: ${updateType}`);

      return true;
    } catch (error) {
      console.error('Zone update sync error:', error);
      throw error;
    }
  }

  /**
   * Get citizen dashboard data (their bookings, challans, etc.)
   */
  async getCitizenDashboardData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get user's parking bookings
      const bookings = await ParkingBooking.find({ userId }).sort({ createdAt: -1 }).limit(10);

      // Get user's challans
      const vehicles = user.vehicles || user.primaryVehicle ? [user.primaryVehicle] : [];
      const vehicleNumbers = vehicles.map(v => v.number);
      const challans = await Challan.find({
        vehicleNumber: { $in: vehicleNumbers }
      }).sort({ createdAt: -1 }).limit(10);

      // Get pending payments
      const pendingChallans = challans.filter(c => c.status === 'pending');
      const totalDue = pendingChallans.reduce((sum, c) => sum + c.fineAmount, 0);

      return {
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          vehicles: vehicles
        },
        parking: {
          activeBookings: bookings.filter(b => b.status === 'active'),
          pastBookings: bookings.filter(b => b.status === 'completed'),
          totalBookings: bookings.length
        },
        violations: {
          totalChallans: challans.length,
          paidChallans: challans.filter(c => c.status === 'paid').length,
          pendingChallans: pendingChallans.length,
          totalDue,
          recent: challans.slice(0, 5)
        }
      };
    } catch (error) {
      console.error('Citizen dashboard error:', error);
      throw error;
    }
  }

  /**
   * Get admin dashboard data (updates from all zones)
   */
  async getAdminDashboardUpdates(filters = {}) {
    try {
      const query = {};

      // Recent bookings
      const recentBookings = await ParkingBooking.find(query)
        .sort({ createdAt: -1 })
        .limit(20);

      // Recent challans
      const recentChallans = await Challan.find(query)
        .sort({ createdAt: -1 })
        .limit(20);

      // Pending payments
      const pendingPayments = recentChallans.filter(c => c.status === 'pending');

      // Zone-wise summary
      const zoneBookings = {};
      recentBookings.forEach(b => {
        if (!zoneBookings[b.zoneId]) {
          zoneBookings[b.zoneId] = { count: 0, revenue: 0 };
        }
        zoneBookings[b.zoneId].count++;
        zoneBookings[b.zoneId].revenue += b.totalAmount || 0;
      });

      return {
        bookings: {
          total: recentBookings.length,
          recent: recentBookings
        },
        violations: {
          total: recentChallans.length,
          pending: pendingPayments.length,
          revenue: pendingPayments.reduce((sum, c) => sum + c.fineAmount, 0),
          recent: recentChallans
        },
        zones: zoneBookings,
        updates: {
          lastSync: new Date(),
          totalRecords: recentBookings.length + recentChallans.length
        }
      };
    } catch (error) {
      console.error('Admin dashboard error:', error);
      throw error;
    }
  }
}

export const adminCitizenSyncService = new AdminCitizenSyncService();

import express from 'express';
import mongoose from 'mongoose';
import ParkingSpot from '../models/ParkingSpot.js';
import ParkingBooking from '../models/ParkingBooking.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { io } from '../server.js';
import { adminCitizenSyncService } from '../services/adminCitizenSyncService.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

router.get('/spots', authMiddleware, requirePermission('parking:read'), async (req, res) => {
  try {
    const { zone, status } = req.query;
    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const spots = await ParkingSpot.find(filter).sort({ zone: 1, spotId: 1 });
    res.json(spots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/book', authMiddleware, requirePermission('parking:book'), async (req, res) => {
  try {
    const { spotId, vehicleNumber, duration } = req.body;
    const bookingDuration = Number(duration);

    if (!spotId || !vehicleNumber || Number.isNaN(bookingDuration) || bookingDuration <= 0 || bookingDuration > 24) {
      return res.status(400).json({ message: 'Invalid booking request' });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + bookingDuration * 60 * 60 * 1000);

    const spot = await ParkingSpot.findOneAndUpdate(
      { spotId, status: 'available' },
      {
        $set: {
          status: 'reserved',
          currentBooking: {
            userId: req.user.userId,
            vehicleNumber,
            startTime,
            endTime,
            paymentStatus: 'pending'
          }
        }
      },
      { new: true }
    );

    if (!spot) {
      return res.status(400).json({
        message: 'Spot is not available. It may have just been booked.',
        error: 'SPOT_UNAVAILABLE'
      });
    }

    const booking = await ParkingBooking.create({
      bookingId: new mongoose.Types.ObjectId().toString(),
      spotId: spot.spotId,
      zoneId: spot.zoneId || spot.zone,
      zone: spot.zone || spot.zoneId,
      userId: req.user.userId,
      vehicleNumber,
      startTime,
      endTime,
      duration,
      durationHours: bookingDuration,
      pricePerHour: spot.pricePerHour,
      totalAmount: spot.pricePerHour * bookingDuration,
      currency: spot.currency || 'INR',
      status: 'reserved',
      paymentStatus: 'pending'
    });

    spot.currentBooking.bookingId = booking._id;
    await spot.save();

    console.log(`[REAL-TIME] Parking spot ${spotId} BOOKED by citizen. Broadcasting city grid update.`);
    io.emit('parking-updated', {
        spotId,
        status: 'reserved',
        zone: spot.zone
    });

    await adminCitizenSyncService.syncParkingBooking({
      ...booking.toObject(),
      duration: bookingDuration,
      startTime,
      totalAmount: booking.totalAmount
    });

    return res.json({
      message: 'Parking reserved. Complete payment to finalize booking.',
      spot,
      booking: {
        bookingId: booking._id,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        duration: booking.durationHours
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/release/:spotId', authMiddleware, async (req, res) => {
  try {
    const { spotId } = req.params;
    const canReleaseAny = req.user.permissions?.includes('parking:release:any');

    const query = canReleaseAny
      ? { spotId, status: 'reserved' }
      : { spotId, status: 'reserved', 'currentBooking.userId': req.user.userId };

    const spot = await ParkingSpot.findOneAndUpdate(
      query,
      {
        $set: { status: 'available' },
        $unset: { currentBooking: '' }
      },
      { new: true }
    );

    if (!spot) {
      return res.status(403).json({
        message: 'Cannot release this spot. You may not own this booking.',
        error: 'INVALID_BOOKING'
      });
    }

    console.log(`[REAL-TIME] Parking spot ${spotId} RELEASED. Spot is now available.`);
    io.emit('parking-updated', {
        spotId,
        status: 'available',
        zone: spot.zone
    });

    return res.json({
      message: 'Spot released successfully',
      spot
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await ParkingSpot.find({
      'currentBooking.userId': req.user.userId,
      status: 'occupied'
    }).sort({ updatedAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  '/send-alert',
  authMiddleware,
  requirePermission('parking:send-alert'),
  async (req, res) => {
    try {
      const { vehicleNumber, violationType, zone, message } = req.body;

      io.emit('violation-alert', {
        timestamp: new Date(),
        vehicleNumber,
        violationType,
        zone,
        message,
        alertId: `ALERT${Date.now()}`,
        severity: violationType === 'No Parking Zone' ? 'high' : 'medium'
      });

      await logAudit({
        req,
        action: 'parking.send-alert',
        resourceType: 'parking_violation_alert',
        resourceId: vehicleNumber,
        metadata: { vehicleNumber, violationType, zone }
      });

      res.json({
        message: 'Alert sent successfully',
        alert: {
          vehicleNumber,
          violationType,
          zone,
          sentAt: new Date()
        }
      });
    } catch (error) {
      await logAudit({
        req,
        action: 'parking.send-alert',
        resourceType: 'parking_violation_alert',
        status: 'failure',
        metadata: { error: error.message }
      });
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

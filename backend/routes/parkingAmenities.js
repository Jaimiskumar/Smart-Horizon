/**
 * Parking Amenities and Shadow Parking Routes
 * API endpoints for shadow parking bookings and nearby amenities discovery
 */

import express from 'express';
import { ParkingAmenitiesService } from '../services/parkingAmenitiesService.js';
import { adminCitizenSyncService } from '../services/adminCitizenSyncService.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import ParkingSpot from '../models/ParkingSpot.js';
import ParkingZone from '../models/ParkingZone.js';
import ParkingBooking from '../models/ParkingBooking.js';
import User from '../models/User.js';

const router = express.Router();
const amenitiesService = new ParkingAmenitiesService();

/**
 * GET /api/parking-amenities/shadow/:zoneId
 * Get shadow parking options in a zone with premium pricing
 */
router.get('/shadow/:zoneId', authMiddleware, async (req, res) => {
  try {
    const { zoneId } = req.params;

    const parkingData = await amenitiesService.getShadowParkingOptions(zoneId);
    const shadowSpots = parkingData.shadowSpots || [];

    if (shadowSpots.length === 0) {
      return res.status(404).json({
        message: 'No shadow parking available in this zone',
        zone: zoneId
      });
    }

    res.json({
      zone: parkingData.zone,
      shadowParkingCount: shadowSpots.length,
      spots: shadowSpots.map(spot => ({
        spotId: spot.spotId,
        location: spot.location,
        basePrice: spot.pricePerHour,
        shadowPremium: spot.shadowPremium,
        finalPrice: Math.round(spot.pricePerHour * (1 + spot.shadowPremium)),
        amenities: spot.amenities || [],
        features: spot.features || [],
        rating: spot.rating || 0,
        status: spot.status
      }))
    });
  } catch (error) {
    console.error('Error fetching shadow parking options:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/parking-amenities/shadow/book
 * Book shadow parking with premium payment
 */
router.post('/shadow/book', authMiddleware, async (req, res) => {
  try {
    const { spotId, duration, vehicleNumber } = req.body;
    const userId = req.user.userId;

    if (!spotId || !duration || duration <= 0 || duration > 24) {
      return res.status(400).json({ 
        message: 'Invalid spot or duration' 
      });
    }

    // Get spot details
    const spot = await ParkingSpot.findOne({ spotId });
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found' });
    }

    if (!spot.isShadowParking) {
      return res.status(400).json({ 
        message: 'This is not a shadow parking spot' 
      });
    }

    if (spot.status !== 'available') {
      return res.status(409).json({ 
        message: 'Spot is not available',
        status: spot.status
      });
    }

    const user = await User.findById(userId);
    const bookingVehicleNumber = vehicleNumber || user?.vehicleNumber || 'UNKNOWN';

    // Book shadow parking
    const booking = await amenitiesService.bookShadowParking(
      spotId,
      userId,
      duration,
      bookingVehicleNumber
    );

    const totalAmount = booking.cost.total;

    // Sync booking across portals
    await adminCitizenSyncService.syncParkingBooking({
      ...booking,
      zoneId: spot.zoneId,
      userId,
      status: 'pending_payment',
      isShadowParking: true,
      vehicleNumber: bookingVehicleNumber,
      pricing: {
        baseAmount: booking.cost.base,
        premiumAmount: booking.cost.premium,
        shadowPremium: spot.shadowPremium * 100 + '%',
        totalAmount
      }
    });

    res.json({
      success: true,
      booking: {
        bookingId: booking.bookingId,
        spotId,
        spot: {
          location: spot.location,
          amenities: spot.amenities,
          features: spot.features,
          rating: spot.rating
        },
        pricing: {
          baseAmount: booking.cost.base,
          premiumAmount: booking.cost.premium,
          shadowPremium: spot.shadowPremium * 100 + '%',
          totalAmount
        },
        duration,
        message: 'Shadow parking booked - Proceed to payment'
      }
    });
  } catch (error) {
    console.error('Error booking shadow parking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/parking-amenities/nearby/:lat/:lng
 * Get nearby amenities within 2km of given coordinates
 * Returns: EV charging, CNG, petrol, diesel, garage, car wash
 */
router.get('/nearby/:latitude/:longitude', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const radius = req.query.radius || 2; // Default 2km

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Get nearby amenities
    const amenities = await amenitiesService.getNearbyAmenities(lat, lng, parseFloat(radius));

    // Group by type
    const amenitiesByType = {
      ev_charging: amenities.filter(a => a.type === 'ev_charging'),
      cng_station: amenities.filter(a => a.type === 'cng_station'),
      petrol_station: amenities.filter(a => a.type === 'petrol_station'),
      diesel_station: amenities.filter(a => a.type === 'diesel_station'),
      garage: amenities.filter(a => a.type === 'garage'),
      car_wash: amenities.filter(a => a.type === 'car_wash')
    };

    res.json({
      location: { latitude: lat, longitude: lng },
      radius: `${radius}km`,
      totalAmenities: amenities.length,
      amenities: amenitiesByType,
      summary: {
        evCharging: amenitiesByType.ev_charging.length,
        cngStations: amenitiesByType.cng_station.length,
        petrolStations: amenitiesByType.petrol_station.length,
        dieselStations: amenitiesByType.diesel_station.length,
        garages: amenitiesByType.garage.length,
        carWashes: amenitiesByType.car_wash.length
      }
    });
  } catch (error) {
    console.error('Error fetching nearby amenities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/parking-amenities/zone/:zoneId/full
 * Get complete zone view with parking spots and amenities
 * For citizen parking portal
 */
router.get('/zone/:zoneId/full', authMiddleware, async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Get zone with amenities
    const zoneData = await amenitiesService.getParkingZoneWithAmenities(zoneId);

    if (!zoneData) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    res.json(zoneData);
  } catch (error) {
    console.error('Error fetching zone with amenities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/parking-amenities/shadow/create
 * Create shadow parking spots in a zone (Admin only)
 */
router.post('/shadow/create', authMiddleware, requirePermission('admin:parking'), async (req, res) => {
  try {
    const { zoneId, count } = req.body;

    if (!zoneId || !count || count < 1) {
      return res.status(400).json({ 
        message: 'Invalid zone or count' 
      });
    }

    // Create shadow spots
    const spots = await amenitiesService.createShadowParkingSpots(zoneId, count);

    // Notify about new shadow parking availability
    await adminCitizenSyncService.syncZoneUpdate(
      zoneId,
      'shadow_parking_created',
      {
        count: spots.length,
        timestamp: new Date()
      }
    );

    res.json({
      success: true,
      zone: zoneId,
      spotsCreated: spots.length,
      spots: spots.map(s => ({
        spotId: s.spotId,
        location: s.location,
        shadowPremium: s.shadowPremium
      }))
    });
  } catch (error) {
    console.error('Error creating shadow parking spots:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/parking-amenities/recommendations/:userId
 * Get personalized parking recommendations based on user bookings
 */
router.get('/recommendations/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's recent bookings
    const recentBookings = await ParkingBooking.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Extract frequently used zones
    const frequentZones = {};
    recentBookings.forEach(booking => {
      frequentZones[booking.zoneId] = (frequentZones[booking.zoneId] || 0) + 1;
    });

    // Get top zones
    const topZones = Object.entries(frequentZones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([zone]) => zone);

    // Get shadow parking in top zones
    const recommendations = [];
    for (const zone of topZones) {
      const shadowSpots = await amenitiesService.getShadowParkingOptions(zone);
      if (shadowSpots.length > 0) {
        recommendations.push({
          zone,
          reason: 'Your frequent parking zone',
          shadowSpots: shadowSpots.slice(0, 3)
        });
      }
    }

    res.json({
      userId,
      bookingHistory: recentBookings.length,
      frequentZones: topZones,
      recommendations
    });
  } catch (error) {
    console.error('Error getting parking recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/parking-amenities/stats/:zoneId
 * Get parking and amenities statistics for a zone
 */
router.get('/stats/:zoneId', authMiddleware, async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Get parking stats
    const totalSpots = await ParkingSpot.countDocuments({ zoneId });
    const availableSpots = await ParkingSpot.countDocuments({ zoneId, status: 'available' });
    const shadowSpots = await ParkingSpot.countDocuments({ zoneId, isShadowParking: true });
    const occupiedSpots = totalSpots - availableSpots;

    // Get zone details
    const zone = await ParkingZone.findOne({ zoneId });

    res.json({
      zone: zoneId,
      parking: {
        total: totalSpots,
        available: availableSpots,
        occupied: occupiedSpots,
        shadowParking: shadowSpots,
        occupancyRate: totalSpots > 0 ? ((occupiedSpots / totalSpots) * 100).toFixed(2) + '%' : '0%'
      },
      amenities: zone?.amenities || [],
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching zone statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

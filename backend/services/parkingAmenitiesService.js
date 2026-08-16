/**
 * Shadow Parking & Nearby Facilities Service
 * Manages premium shadow parking spots and nearby amenities
 */

import ParkingSpot from '../models/ParkingSpot.js';
import ParkingZone from '../models/ParkingZone.js';
import ParkingBooking from '../models/ParkingBooking.js';
import { io } from '../server.js';

export class ParkingAmenitiesService {
  constructor() {
    // Nearby amenity locations (would be in separate collection in production)
    this.amenityTypes = {
      ev_charging: 'EV Charging Station',
      cng_station: 'CNG Station',
      petrol_pump: 'Petrol Pump',
      diesel_pump: 'Diesel Pump',
      garage: 'Car Garage/Repair',
      car_wash: 'Car Wash',
      toll_booth: 'Toll Booth',
      hospital: 'Hospital',
      police_station: 'Police Station'
    };
  }

  /**
   * Get or create shadow parking spots for a zone
   */
  async getShadowParkingOptions(zoneId) {
    try {
      let zone = await ParkingZone.findOne({ zoneId });
      if (!zone) {
        zone = await ParkingZone.findOneAndUpdate(
          { zoneId },
          {
            zoneId,
            name: zoneId,
            location: {
              name: zoneId,
              address: zoneId,
              lat: 17.6599,
              lng: 75.9064
            },
            totalSpots: 0,
            pricePerHour: 60,
            currency: 'INR',
            isActive: true,
            stats: { available: 0, occupied: 0, reserved: 0, revenue: 0 }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      let shadowSpots = await ParkingSpot.find({
        zoneId,
        isShadowParking: true,
        status: { $in: ['available', 'reserved'] }
      }).sort({ pricePerHour: -1 });

      if (shadowSpots.length === 0) {
        shadowSpots = await this.createShadowParkingSpots(zoneId, 4);
      }

      return {
        zone: zone.name,
        shadowParkingAvailable: shadowSpots.length > 0,
        totalShadowSpots: shadowSpots.length,
        regularSpots: await this._getRegularSpots(zoneId),
        shadowSpots: shadowSpots.map(spot => ({
          spotId: spot.spotId,
          location: spot.location,
          type: spot.type,
          pricePerHour: spot.pricePerHour,
          shadowPremium: spot.shadowPremium || 0.25,
          amenities: spot.amenities || [],
          features: spot.features || [],
          rating: spot.rating || 4.5,
          status: spot.status
        })),
        comparison: {
          regularPrice: await this._getAveragePrice(zoneId, false),
          shadowPrice: await this._getAveragePrice(zoneId, true),
          shadowPremiumPercent: 25
        }
      };
    } catch (error) {
      console.error('Shadow parking error:', error);
      throw error;
    }
  }

  /**
   * Create shadow parking spots in a zone
   */
  async createShadowParkingSpots(zoneId, count = 10) {
    try {
      const shadowSpots = [];
      let zone = await ParkingZone.findOne({ zoneId });
      if (!zone) {
        zone = await ParkingZone.create({
          zoneId,
          name: zoneId,
          location: {
            name: zoneId,
            address: zoneId,
            lat: 17.6599,
            lng: 75.9064
          },
          totalSpots: count,
          pricePerHour: 60,
          currency: 'INR',
          isActive: true,
          stats: { available: 0, occupied: 0, reserved: 0, revenue: 0 }
        });
      }

      for (let i = 0; i < count; i++) {
        const spotId = `${zoneId}-SHADOW-${String(i + 1).padStart(3, '0')}`;
        
        const spot = new ParkingSpot({
          spotId,
          zoneId,
          type: 'vip',
          isShadowParking: true,
          shadowPremium: 0.25,
          location: {
            name: `Shadow Parking ${i + 1} - ${zone.name}`,
            lat: zone.location?.lat + (Math.random() * 0.001),
            lng: zone.location?.lng + (Math.random() * 0.001)
          },
          pricePerHour: zone.pricePerHour || 60,
          features: ['Covered parking', 'CCTV', 'Security', 'EV charging nearby'],
          amenities: ['ev_charging', 'garage', 'car_wash'],
          status: 'available'
        });

        await spot.save();
        shadowSpots.push(spot);
      }

      console.log(`✅ Created ${shadowSpots.length} shadow parking spots for ${zoneId}`);
      return shadowSpots;
    } catch (error) {
      console.error('Error creating shadow parking:', error);
      throw error;
    }
  }

  /**
   * Find nearby amenities (EV charging, CNG, petrol, garage, etc.)
   */
  async getNearbyAmenities(latitude, longitude, radius = 2) {
    try {
      // Mock nearby amenities data
      // In production, this would query a separate Amenities collection
      const amenities = this._generateNearbyAmenities(latitude, longitude, radius);

      const grouped = {
        ev_charging: amenities.filter(a => a.type === 'ev_charging'),
        cng_station: amenities.filter(a => a.type === 'cng_station'),
        petrol_pump: amenities.filter(a => a.type === 'petrol_pump'),
        diesel_pump: amenities.filter(a => a.type === 'diesel_pump'),
        garage: amenities.filter(a => a.type === 'garage'),
        car_wash: amenities.filter(a => a.type === 'car_wash')
      };

      return {
        location: { latitude, longitude },
        radius: `${radius} km`,
        totalAmenities: amenities.length,
        amenities: grouped,
        summary: {
          ev_charging_count: grouped.ev_charging.length,
          cng_count: grouped.cng_station.length,
          petrol_count: grouped.petrol_pump.length,
          diesel_count: grouped.diesel_pump.length,
          garage_count: grouped.garage.length,
          car_wash_count: grouped.car_wash.length
        }
      };
    } catch (error) {
      console.error('Nearby amenities error:', error);
      return null;
    }
  }

  /**
   * Book shadow parking with premium pricing
   */
  async bookShadowParking(spotId, userId, duration, vehicleNumber = 'UNKNOWN') {
    try {
      const spot = await ParkingSpot.findOne({ spotId });
      
      if (!spot || !spot.isShadowParking) {
        throw new Error('Shadow parking spot not found or invalid');
      }

      if (spot.status !== 'available') {
        throw new Error('Spot not available');
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      const baseCost = spot.pricePerHour * duration;
      const premiumCost = baseCost * (spot.shadowPremium || 0.25);
      const totalCost = baseCost + premiumCost;

      const bookingId = `BK_${Date.now()}_${spotId}`;
      const parkingBooking = await ParkingBooking.create({
        bookingId,
        spotId: spot.spotId,
        zoneId: spot.zoneId,
        zone: spot.zone || spot.zoneId,
        userId,
        vehicleNumber: vehicleNumber.toUpperCase(),
        startTime,
        endTime,
        durationHours: duration,
        pricePerHour: spot.pricePerHour,
        totalAmount: totalCost,
        currency: 'INR',
        status: 'reserved',
        paymentStatus: 'pending'
      });

      const booking = await ParkingSpot.findByIdAndUpdate(
        spot._id,
        {
          status: 'occupied',
          bookedBy: userId,
          bookedAt: startTime,
          bookingDuration: duration,
          currentBooking: {
            bookingId: parkingBooking._id,
            userId,
            vehicleNumber: vehicleNumber.toUpperCase(),
            startTime,
            endTime,
            paymentStatus: 'pending'
          }
        },
        { new: true }
      );

      io.emit('shadow_parking_booked', {
        spotId,
        zoneId: spot.zoneId,
        userId,
        baseCost,
        premiumCost,
        totalCost,
        duration,
        features: spot.features,
        timestamp: new Date()
      });

      console.log(`✅ Shadow parking booked: ${spotId} for ${duration} hours`);

      return {
        success: true,
        booking: {
          bookingId: parkingBooking.bookingId,
          spotId,
          zoneId: spot.zoneId,
          cost: {
            base: baseCost,
            premium: premiumCost,
            total: totalCost,
            currency: 'INR'
          },
          duration,
          features: spot.features,
          bookedAt: startTime
        }
      };
    } catch (error) {
      console.error('Shadow parking booking error:', error);
      throw error;
    }
  }

  /**
   * Get parking zone with all nearby amenities
   */
  async getParkingZoneWithAmenities(zoneId) {
    try {
      const zone = await ParkingZone.findOne({ zoneId });
      if (!zone) throw new Error(`Zone not found: ${zoneId}`);

      const nearbyAmenities = await this.getNearbyAmenities(
        zone.coordinates.lat,
        zone.coordinates.lng,
        2 // 2km radius
      );

      const shadowParking = await this.getShadowParkingOptions(zoneId);

      return {
        zone: {
          zoneId: zone.zoneId,
          name: zone.name,
          location: zone.coordinates,
          totalSpots: zone.totalSpots,
          occupiedSpots: zone.occupiedSpots,
          availableSpots: zone.availableSpots
        },
        parking: shadowParking,
        amenities: nearbyAmenities,
        recommendations: this._getRecommendations(zone, nearbyAmenities)
      };
    } catch (error) {
      console.error('Zone amenities error:', error);
      throw error;
    }
  }

  /**
   * Get smart recommendations for parking
   */
  _getRecommendations(zone, amenities) {
    const recommendations = [];

    if (amenities?.summary?.ev_charging_count > 0) {
      recommendations.push({
        type: 'ev_charging',
        message: `${amenities.summary.ev_charging_count} EV charging stations nearby`,
        benefit: 'Charge while parked'
      });
    }

    if (amenities?.summary?.garage_count > 0) {
      recommendations.push({
        type: 'garage',
        message: `${amenities.summary.garage_count} mechanic garages nearby`,
        benefit: 'Emergency repair available'
      });
    }

    if (zone.availableSpots < 5) {
      recommendations.push({
        type: 'shadow_parking',
        message: 'Low availability - Shadow parking recommended',
        benefit: 'Premium spots usually available'
      });
    }

    return recommendations;
  }

  // ========== HELPER METHODS ==========

  _generateNearbyAmenities(lat, lng, radius) {
    const amenities = [];
    const amenityTypes = ['ev_charging', 'cng_station', 'petrol_pump', 'diesel_pump', 'garage', 'car_wash'];

    for (const type of amenityTypes) {
      const count = Math.floor(Math.random() * 4) + 1; // 1-4 per type

      for (let i = 0; i < count; i++) {
        amenities.push({
          id: `${type}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          name: this.amenityTypes[type] + ` #${i + 1}`,
          distance: {
            km: (Math.random() * radius).toFixed(2),
            minutes: Math.floor(Math.random() * 15) + 2
          },
          location: {
            lat: lat + (Math.random() - 0.5) * 0.05,
            lng: lng + (Math.random() - 0.5) * 0.05
          },
          rating: 3.5 + Math.random() * 1.5,
          status: Math.random() > 0.2 ? 'open' : 'closed',
          hours: {
            open: '06:00 AM',
            close: '11:00 PM'
          }
        });
      }
    }

    return amenities.sort((a, b) => parseFloat(a.distance.km) - parseFloat(b.distance.km));
  }

  async _getRegularSpots(zoneId) {
    const regularSpots = await ParkingSpot.find({
      zoneId,
      isShadowParking: { $ne: true },
      status: 'available'
    });

    return regularSpots.length;
  }

  async _getAveragePrice(zoneId, isShadow = false) {
    const query = { zoneId };
    if (isShadow) query.isShadowParking = true;
    else query.isShadowParking = { $ne: true };

    const spots = await ParkingSpot.find(query);
    if (spots.length === 0) return 0;

    const total = spots.reduce((sum, s) => sum + s.pricePerHour, 0);
    return Math.round(total / spots.length);
  }
}

export const parkingAmenitiesService = new ParkingAmenitiesService();

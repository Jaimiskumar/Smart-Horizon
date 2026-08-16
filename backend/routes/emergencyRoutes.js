/**
 * Emergency Vehicle Routes
 * API endpoints for emergency vehicle detection, management, and green corridor control
 */

import express from 'express';
import EmergencyVehicle from '../models/EmergencyVehicle.js';
import TrafficSignal from '../models/TrafficSignal.js';
import { authMiddleware } from '../middleware/auth.js';
import * as greenCorridorService from '../services/greenCorridorService.js';
import * as emergencyReroutingService from '../services/emergencyReroutingService.js';

const router = express.Router();

/**
 * POST /api/emergency-vehicles/register
 * Register a new emergency vehicle in the system
 */
router.post('/register', async (req, res) => {
  try {
    const { vehicleId, type, currentLocation, operators } = req.body;

    // Validate required fields
    if (!vehicleId || !type || !currentLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: vehicleId, type, currentLocation'
      });
    }

    // Validate emergency vehicle type
    const validTypes = ['ambulance', 'fire_truck', 'police_vehicle', 'vip_convoy', 'disaster_management'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check if vehicle already exists
    const existingVehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        message: 'Emergency vehicle already registered'
      });
    }

    // Create new emergency vehicle
    const newVehicle = new EmergencyVehicle({
      vehicleId: vehicleId,
      type: type,
      status: 'idle',
      location: {
        current: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address || 'Location',
          updateTime: new Date()
        }
      },
      operators: operators || []
    });

    await newVehicle.save();

    res.status(201).json({
      success: true,
      message: 'Emergency vehicle registered successfully',
      vehicle: {
        vehicleId: newVehicle.vehicleId,
        type: newVehicle.type,
        status: newVehicle.status,
        location: newVehicle.location.current
      }
    });
  } catch (error) {
    console.error('Error registering emergency vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering emergency vehicle',
      error: error.message
    });
  }
});

/**
 * POST /api/emergency-vehicles/dispatch
 * Dispatch an emergency vehicle to a destination with green corridor activation
 */
router.post('/dispatch', authMiddleware, async (req, res) => {
  try {
    const { vehicleId, destination, priority, reason } = req.body;

    // Validate required fields
    if (!vehicleId || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: vehicleId, destination'
      });
    }

    // Find vehicle
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    // Update destination
    vehicle.destination = {
      coordinates: {
        latitude: destination.latitude,
        longitude: destination.longitude
      },
      address: destination.address || 'Unknown Location',
      eta: new Date(Date.now() + 10 * 60000), // Default 10 minutes
      priority: priority || 'high'
    };

    vehicle.status = 'responding';

    // Store dispatch info
    vehicle.dispatchInfo = {
      dispatchedAt: new Date(),
      dispatchedBy: req.user.userId,
      reason: reason || 'Emergency response'
    };

    await vehicle.save();

    // Calculate optimal route to destination
    // This would be replaced with real route calculation in production
    const optimalRoute = await calculateOptimalRoute(vehicle, destination);

    // Activate green corridor for the route
    if (optimalRoute && optimalRoute.signalIds.length > 0) {
      await greenCorridorService.activateGreenCorridor(vehicleId, optimalRoute.signalIds);

      vehicle.route.currentPath = optimalRoute.signalIds.map((signalId, index) => ({
        signalId: signalId,
        location: { latitude: 0, longitude: 0 },
        estimatedArrival: new Date(Date.now() + (index + 1) * 30000)
      }));

      await vehicle.save();
    }

    res.status(200).json({
      success: true,
      message: 'Emergency vehicle dispatched successfully',
      dispatch: {
        vehicleId: vehicle.vehicleId,
        type: vehicle.type,
        status: vehicle.status,
        destination: vehicle.destination,
        routeActivated: optimalRoute ? optimalRoute.signalIds.length > 0 : false,
        dispatchedAt: vehicle.dispatchInfo.dispatchedAt
      }
    });
  } catch (error) {
    console.error('Error dispatching emergency vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error dispatching emergency vehicle',
      error: error.message
    });
  }
});

/**
 * POST /api/emergency-vehicles/:vehicleId/update-location
 * Update real-time location of emergency vehicle
 */
router.post('/:vehicleId/update-location', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { latitude, longitude, address, speed } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: latitude, longitude'
      });
    }

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    // Update location
    vehicle.location.current = {
      latitude: latitude,
      longitude: longitude,
      address: address || vehicle.location.current.address,
      updateTime: new Date()
    };

    // Update speed if provided
    if (speed !== undefined) {
      vehicle.speed.current = speed;
    }

    // Check for traffic ahead
    if (vehicle.status === 'in_transit' && vehicle.greenCorridor.active) {
      const trafficAnalysis = await emergencyReroutingService.analyzeTrafficAhead(vehicleId);

      if (trafficAnalysis.requiresReroute) {
        // Get alternative routes
        const alternatives = await emergencyReroutingService.calculateAlternativeRoutes(vehicleId);

        if (alternatives.recommendedRoute) {
          // Apply recommended reroute
          await emergencyReroutingService.applyReroute(vehicleId, alternatives.recommendedRoute.signals);
        }
      }
    }

    await vehicle.save();

    // Emit location update event via websocket
    const io = require('../server.js').io;
    io.emit('emergency_location_update', {
      vehicleId: vehicleId,
      location: vehicle.location.current,
      speed: vehicle.speed.current,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: vehicle.location.current
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

/**
 * POST /api/emergency-vehicles/:vehicleId/activate-corridor
 * Manually activate green corridor for a vehicle
 */
router.post('/:vehicleId/activate-corridor', authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { signalPath } = req.body;

    // Validate required fields
    if (!signalPath || !Array.isArray(signalPath) || signalPath.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signal path. Must be a non-empty array of signal IDs'
      });
    }

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    // Check if corridor already active
    if (vehicle.greenCorridor.active) {
      return res.status(409).json({
        success: false,
        message: 'Green corridor already active for this vehicle'
      });
    }

    // Activate green corridor
    const result = await greenCorridorService.activateGreenCorridor(vehicleId, signalPath);

    // Update vehicle route
    vehicle.route.currentPath = signalPath.map((signalId, index) => ({
      signalId: signalId,
      location: { latitude: 0, longitude: 0 },
      estimatedArrival: new Date(Date.now() + (index + 1) * 30000)
    }));

    vehicle.status = 'in_transit';
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Green corridor activated successfully',
      corridor: {
        vehicleId: vehicleId,
        signalsInCorridor: signalPath.length,
        status: 'active',
        activatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error activating corridor:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating green corridor',
      error: error.message
    });
  }
});

/**
 * POST /api/emergency-vehicles/:vehicleId/deactivate-corridor
 * Deactivate green corridor when emergency is resolved
 */
router.post('/:vehicleId/deactivate-corridor', authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    if (!vehicle.greenCorridor.active) {
      return res.status(400).json({
        success: false,
        message: 'No active green corridor for this vehicle'
      });
    }

    // Deactivate green corridor
    await greenCorridorService.deactivateGreenCorridor(vehicleId);

    vehicle.status = 'completed';
    vehicle.greenCorridor.deactivatedAt = new Date();

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Green corridor deactivated successfully',
      corridor: {
        vehicleId: vehicleId,
        status: 'inactive',
        deactivatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error deactivating corridor:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating green corridor',
      error: error.message
    });
  }
});

/**
 * POST /api/emergency-vehicles/:vehicleId/reroute
 * Manually request reroute due to congestion
 */
router.post('/:vehicleId/reroute', authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { reason } = req.body;

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    if (!vehicle.greenCorridor.active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reroute: No active green corridor'
      });
    }

    // Analyze traffic ahead
    const trafficAnalysis = await emergencyReroutingService.analyzeTrafficAhead(vehicleId);

    if (!trafficAnalysis.requiresReroute) {
      return res.status(400).json({
        success: false,
        message: 'No major traffic issues detected. Reroute not necessary.'
      });
    }

    // Get alternative routes
    const alternatives = await emergencyReroutingService.calculateAlternativeRoutes(vehicleId);

    if (!alternatives.recommendedRoute) {
      return res.status(400).json({
        success: false,
        message: 'No suitable alternative routes found'
      });
    }

    // Apply recommended reroute
    const rerouteResult = await emergencyReroutingService.applyReroute(vehicleId, alternatives.recommendedRoute.signals);

    res.status(200).json({
      success: true,
      message: 'Vehicle rerouted successfully',
      reroute: {
        vehicleId: vehicleId,
        reason: reason || 'traffic_congestion',
        oldRoute: rerouteResult.oldRoute,
        newRoute: rerouteResult.newRoute,
        rerouteNumber: rerouteResult.rerouteNumber,
        trafficSaved: alternatives.alternatives.length > 0 ? true : false
      }
    });
  } catch (error) {
    console.error('Error applying reroute:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying reroute',
      error: error.message
    });
  }
});

/**
 * GET /api/emergency-vehicles/active
 * Get all currently active emergency vehicles
 */
router.get('/active', async (req, res) => {
  try {
    const activeVehicles = await EmergencyVehicle.find({
      status: { $in: ['responding', 'in_transit'] }
    }).select('vehicleId type status location destination greenCorridor');

    res.status(200).json({
      success: true,
      count: activeVehicles.length,
      vehicles: activeVehicles.map(v => ({
        vehicleId: v.vehicleId,
        type: v.type,
        status: v.status,
        location: v.location.current,
        destination: v.destination,
        corridorActive: v.greenCorridor.active
      }))
    });
  } catch (error) {
    console.error('Error fetching active vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active vehicles',
      error: error.message
    });
  }
});

/**
 * GET /api/emergency-vehicles/:vehicleId/status
 * Get detailed status of a specific vehicle
 */
router.get('/:vehicleId/status', async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    // Get route status
    const routeStatus = await emergencyReroutingService.getRealTimeRouteStatus(vehicleId);

    res.status(200).json({
      success: true,
      vehicle: {
        vehicleId: vehicle.vehicleId,
        type: vehicle.type,
        status: vehicle.status,
        currentLocation: vehicle.location.current,
        destination: vehicle.destination,
        speed: {
          current: vehicle.speed.current,
          recommended: vehicle.speed.recommended,
          max: vehicle.speed.max
        },
        greenCorridor: {
          active: vehicle.greenCorridor.active,
          signalsCount: vehicle.greenCorridor.signals.length,
          activatedAt: vehicle.greenCorridor.activatedAt
        },
        route: {
          currentIndex: vehicle.route.currentRouteIndex,
          totalSignals: vehicle.route.currentPath.length,
          rerouteCount: vehicle.route.rerouteCount
        },
        trafficAhead: {
          count: vehicle.trafficAhead.length,
          details: vehicle.trafficAhead
        },
        routeStatus: routeStatus
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle status',
      error: error.message
    });
  }
});

/**
 * GET /api/emergency-vehicles/:vehicleId/corridor-stats
 * Get corridor performance statistics
 */
router.get('/:vehicleId/corridor-stats', async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Emergency vehicle not found'
      });
    }

    // Calculate statistics
    const stats = {
      totalCorridorsActivated: 1, // Increment tracking needed in model
      averageResponseTime: Math.random() * 5 + 2, // Mock calculation
      onTimeArrivalRate: (Math.random() * 100).toFixed(2) + '%',
      averageSignalWaitTime: Math.random() * 10,
      totalDistanceTraveled: vehicle.metrics.totalDistance || 0,
      totalTimeTaken: vehicle.metrics.totalTime || 0,
      delaysDue: {
        traffic: vehicle.trafficAhead.length,
        signalMalfunction: 0,
        accidents: 0
      }
    };

    res.status(200).json({
      success: true,
      vehicleId: vehicleId,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching corridor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * Helper Functions
 */

async function calculateOptimalRoute(vehicle, destination) {
  // In production, this would use A* algorithm with road network graph
  // For now, return a mock route connecting nearby traffic signals
  
  const nearestSignals = await TrafficSignal.find({})
    .sort({
      'location.lat': -1,
      'location.lng': 1
    })
    .limit(5)
    .select('signalId');

  return {
    signalIds: nearestSignals.map(s => s.signalId),
    estimatedTime: 300
  };
}

export default router;

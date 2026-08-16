/**
 * Emergency Vehicle Rerouting Service
 * Intelligent rerouting for emergency vehicles based on traffic conditions
 * Avoids congestion and suggests optimal paths
 */

import EmergencyVehicle from '../models/EmergencyVehicle.js';
import TrafficSignal from '../models/TrafficSignal.js';
import MLDetectionLog from '../models/MLDetectionLog.js';
import RoadNetwork from '../models/RoadNetwork.js';
import { io } from '../server.js';

/**
 * Analyze Traffic Ahead
 * Check for congestion on the current route
 */
export async function analyzeTrafficAhead(vehicleId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Emergency vehicle not found');
    }

    const currentPath = vehicle.route.currentPath;
    if (currentPath.length === 0) {
      return null;
    }

    const trafficIssues = [];

    // Check congestion level at each signal in the path
    for (const pathSegment of currentPath) {
      const signal = await TrafficSignal.findOne({
        signalId: pathSegment.signalId
      });

      if (signal) {
        // Record current congestion
        const congestionData = {
          signalId: pathSegment.signalId,
          location: signal.location,
          congestionLevel: signal.congestionLevel,
          vehicleCount: signal.vehicleCount,
          isBlocked: signal.congestionLevel === 'critical'
        };

        // Check for recent incidents at this location
        const recentIncidents = await MLDetectionLog.findOne(
          {
            cameraId: pathSegment.signalId,
            detectionType: { $in: ['accident', 'congestion_high', 'wrong_parking'] },
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
          },
          {},
          { sort: { timestamp: -1 } }
        );

        if (recentIncidents) {
          congestionData.hasIncident = true;
          congestionData.incident = recentIncidents.detectionType;
          trafficIssues.push(congestionData);
        }

        // Alert if critical congestion
        if (signal.congestionLevel === 'critical') {
          trafficIssues.push(congestionData);
        }
      }
    }

    // Update vehicle with traffic ahead information
    if (trafficIssues.length > 0) {
      vehicle.trafficAhead = trafficIssues.map(issue => ({
        location: {
          latitude: issue.location?.lat,
          longitude: issue.location?.lng,
          address: issue.location?.name
        },
        congestionLevel: issue.congestionLevel,
        detectedAt: new Date(),
        reason: issue.incident || 'traffic_congestion'
      }));

      await vehicle.save();

      // Emit alert
      io.emit('traffic_ahead_detected', {
        vehicleId: vehicleId,
        vehicleType: vehicle.type,
        trafficIssuesFound: trafficIssues.length,
        issues: trafficIssues,
        timestamp: new Date()
      });
    }

    return {
      vehicleId: vehicleId,
      issuesFound: trafficIssues.length,
      trafficIssues: trafficIssues,
      requiresReroute: trafficIssues.length > 2 // Reroute if multiple issues
    };
  } catch (error) {
    console.error('Error analyzing traffic ahead:', error);
    throw error;
  }
}

/**
 * Calculate Alternative Routes
 * Generate backup routes with lower congestion
 */
export async function calculateAlternativeRoutes(vehicleId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Emergency vehicle not found');
    }

    const currentRoute = vehicle.route.currentPath;
    const alternatives = [];

    // Strategy 1: Left turn alternative
    const leftRoute = await generateRouteByStrategy('left', vehicle, currentRoute);
    if (leftRoute) {
      alternatives.push({
        routeName: 'Left Turn (Northern Route)',
        signals: leftRoute.signalIds,
        estimatedTime: leftRoute.estimatedTime,
        congestionLevel: leftRoute.avgCongestion,
        isRecommended: leftRoute.congestionLevel === 'low'
      });
    }

    // Strategy 2: Right turn alternative
    const rightRoute = await generateRouteByStrategy('right', vehicle, currentRoute);
    if (rightRoute) {
      alternatives.push({
        routeName: 'Right Turn (Southern Route)',
        signals: rightRoute.signalIds,
        estimatedTime: rightRoute.estimatedTime,
        congestionLevel: rightRoute.avgCongestion,
        isRecommended: rightRoute.congestionLevel === 'low'
      });
    }

    // Strategy 3: Bypass route
    const bypassRoute = await generateRouteByStrategy('bypass', vehicle, currentRoute);
    if (bypassRoute) {
      alternatives.push({
        routeName: 'Ring Road Bypass',
        signals: bypassRoute.signalIds,
        estimatedTime: bypassRoute.estimatedTime,
        congestionLevel: bypassRoute.avgCongestion,
        isRecommended: bypassRoute.congestionLevel === 'low'
      });
    }

    // Find best alternative
    const bestAlternative = alternatives.length > 0
      ? alternatives.reduce((best, current) => {
          const currentScore = calculateRouteScore(current);
          const bestScore = calculateRouteScore(best);
          return currentScore < bestScore ? current : best;
        })
      : null;

    return {
      vehicleId: vehicleId,
      currentCongestion: await calculateRouteAvgCongestion(currentRoute),
      alternatives: alternatives,
      recommendedRoute: bestAlternative,
      shouldReroute: bestAlternative && bestAlternative.isRecommended
    };
  } catch (error) {
    console.error('Error calculating alternative routes:', error);
    throw error;
  }
}

/**
 * Apply Reroute
 * Implement the new route for the emergency vehicle
 */
export async function applyReroute(vehicleId, newRoute) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Emergency vehicle not found');
    }

    if (!vehicle.greenCorridor.active) {
      throw new Error('Green corridor not active. Cannot reroute.');
    }

    // Store old route for comparison
    const oldRoute = vehicle.route.currentPath.map(p => p.signalId);

    // Update vehicle route
    vehicle.route.currentPath = newRoute.map((signalId, index) => ({
      signalId: signalId,
      location: { latitude: 0, longitude: 0 }, // Will be updated
      estimatedArrival: new Date(Date.now() + (index + 1) * 30000), // 30s per signal
      congestionLevel: 'low',
      isBlocked: false
    }));

    vehicle.route.currentRouteIndex = 0;
    vehicle.route.lastRerouteAt = new Date();
    vehicle.route.rerouteCount += 1;

    await vehicle.save();

    // Update green corridor with new signal path
    // Deactivate old corridor
    await deactivateOldCorridor(vehicleId, oldRoute);

    // Activate new corridor
    const greenCorridorService = await import('./greenCorridorService.js');
    await greenCorridorService.default.activateGreenCorridor(vehicleId, newRoute);

    // Emit reroute event
    io.emit('emergency_reroute_applied', {
      vehicleId: vehicleId,
      vehicleType: vehicle.type,
      reason: 'traffic_congestion',
      oldRoute: oldRoute,
      newRoute: newRoute,
      rerouteCount: vehicle.route.rerouteCount,
      timestamp: new Date()
    });

    // Notify dispatch center
    await notifyDispatchCenter(vehicleId, `Vehicle rerouted to avoid congestion. Reroute #${vehicle.route.rerouteCount}`);

    return {
      success: true,
      vehicleId: vehicleId,
      oldRoute: oldRoute,
      newRoute: newRoute,
      rerouteNumber: vehicle.route.rerouteCount
    };
  } catch (error) {
    console.error('Error applying reroute:', error);
    throw error;
  }
}

/**
 * Detect Blocked Roads
 * Identify completely blocked segments and avoid them
 */
export async function detectBlockedRoads(vehicleId, currentPath) {
  try {
    const blockedSegments = [];

    for (const pathSegment of currentPath) {
      const signal = await TrafficSignal.findOne({
        signalId: pathSegment.signalId
      });

      if (!signal) continue;

      // Check for critical congestion
      if (signal.congestionLevel === 'critical' && signal.vehicleCount > 100) {
        blockedSegments.push({
          signalId: pathSegment.signalId,
          reason: 'severe_congestion',
          vehicleCount: signal.vehicleCount,
          blockageLevel: 95
        });
      }

      // Check for recent accidents
      const recentAccident = await MLDetectionLog.findOne(
        {
          cameraId: pathSegment.signalId,
          detectionType: 'accident',
          timestamp: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
        },
        {},
        { sort: { timestamp: -1 } }
      );

      if (recentAccident) {
        blockedSegments.push({
          signalId: pathSegment.signalId,
          reason: 'accident',
          detectedAt: recentAccident.timestamp,
          blockageLevel: 100
        });
      }

      // Check for road closure signals
      if (signal.status === 'offline' || signal.mode === 'maintenance') {
        blockedSegments.push({
          signalId: pathSegment.signalId,
          reason: 'signal_malfunction',
          blockageLevel: 100
        });
      }
    }

    if (blockedSegments.length > 0) {
      // Emit blocked road alert
      io.emit('blocked_segment_detected', {
        vehicleId: vehicleId,
        blockedSegments: blockedSegments,
        timestamp: new Date()
      });
    }

    return {
      vehicleId: vehicleId,
      blockedSegmentsFound: blockedSegments.length,
      blockedSegments: blockedSegments,
      routeIsBlocked: blockedSegments.length > 1
    };
  } catch (error) {
    console.error('Error detecting blocked roads:', error);
    throw error;
  }
}

/**
 * Get Real-time Route Status
 * Current status of the vehicle's active route
 */
export async function getRealTimeRouteStatus(vehicleId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const routeStatus = {
      vehicleId: vehicleId,
      vehicleType: vehicle.type,
      currentRouteIndex: vehicle.route.currentRouteIndex,
      totalSignalsInRoute: vehicle.route.currentPath.length,
      completedSegments: vehicle.route.currentRouteIndex,
      remainingSegments: vehicle.route.currentPath.length - vehicle.route.currentRouteIndex,
      progressPercentage: Math.round(
        (vehicle.route.currentRouteIndex / vehicle.route.currentPath.length) * 100
      ),
      trafficAheadCount: vehicle.trafficAhead.length,
      totalReroutes: vehicle.route.rerouteCount,
      currentSpeed: vehicle.speed.current,
      recommendedSpeed: vehicle.speed.recommended,
      estimatedArrival: vehicle.destination.eta,
      lastUpdated: new Date()
    };

    // Check for immediate traffic issues ahead (next 2 signals)
    const upcomingSignals = vehicle.route.currentPath.slice(
      vehicle.route.currentRouteIndex,
      vehicle.route.currentRouteIndex + 2
    );

    for (const signal of upcomingSignals) {
      const trafficSignal = await TrafficSignal.findOne({
        signalId: signal.signalId
      });

      if (trafficSignal && trafficSignal.congestionLevel === 'critical') {
        routeStatus.immediateCongestion = true;
        routeStatus.congestionAtSignal = trafficSignal.signalId;
      }
    }

    return routeStatus;
  } catch (error) {
    console.error('Error getting route status:', error);
    throw error;
  }
}

/**
 * Helper Functions
 */

async function generateRouteByStrategy(strategy, vehicle, currentRoute) {
  // Placeholder implementation
  // In production, this would use a real road network graph
  // and pathfinding algorithms (A*, Dijkstra)
  
  const mockRoute = {
    signalIds: currentRoute.map(p => p.signalId),
    estimatedTime: 300,
    avgCongestion: 'medium'
  };

  return mockRoute;
}

async function calculateRouteAvgCongestion(pathSegments) {
  if (pathSegments.length === 0) return 'low';

  let totalCongestion = 0;
  const congestionWeights = { low: 1, medium: 2, high: 3, critical: 4 };

  for (const segment of pathSegments) {
    const signal = await TrafficSignal.findOne({ signalId: segment.signalId });
    if (signal) {
      totalCongestion += congestionWeights[signal.congestionLevel] || 1;
    }
  }

  const avgCongestion = totalCongestion / pathSegments.length;
  
  if (avgCongestion <= 1.5) return 'low';
  if (avgCongestion <= 2.5) return 'medium';
  if (avgCongestion <= 3.5) return 'high';
  return 'critical';
}

function calculateRouteScore(route) {
  // Lower score is better
  const timeWeight = 1;
  const congestionWeight = 3;
  
  const congestionWeights = { low: 0, medium: 1, high: 2, critical: 3 };
  const congestionScore = congestionWeights[route.congestionLevel] || 0;
  
  return (route.estimatedTime * timeWeight) + (congestionScore * congestionWeight);
}

async function deactivateOldCorridor(vehicleId, oldSignalIds) {
  try {
    // Restore old signals to normal mode
    for (const signalId of oldSignalIds) {
      const signal = await TrafficSignal.findOne({ signalId: signalId });
      if (signal && signal.mode === 'emergency') {
        signal.mode = 'auto';
        signal.status = 'red';
        await signal.save();
      }
    }
  } catch (error) {
    console.error('Error deactivating old corridor:', error);
  }
}

async function notifyDispatchCenter(vehicleId, message) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    
    if (vehicle && vehicle.dispatchInfo) {
      vehicle.communications.push({
        type: 'reroute',
        message: message,
        recipient: vehicle.dispatchInfo.dispatchCenterId,
        sentAt: new Date(),
        acknowledged: false
      });

      await vehicle.save();

      // Emit notification event
      io.emit('dispatch_notification', {
        vehicleId: vehicleId,
        dispatchCenterId: vehicle.dispatchInfo.dispatchCenterId,
        message: message,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error notifying dispatch center:', error);
  }
}

export default {
  analyzeTrafficAhead,
  calculateAlternativeRoutes,
  applyReroute,
  detectBlockedRoads,
  getRealTimeRouteStatus
};

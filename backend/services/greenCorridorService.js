/**
 * Green Corridor Service
 * Manages green signal corridors for emergency vehicles
 * Handles signal activation and coordination for emergency response
 */

import EmergencyVehicle from '../models/EmergencyVehicle.js';
import TrafficSignal from '../models/TrafficSignal.js';
import { io } from '../server.js';

/**
 * Activate Green Corridor for Emergency Vehicle
 * Creates a path of green signals for the vehicle to pass through
 */
export async function activateGreenCorridor(vehicleId, signalPath) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    
    if (!vehicle) {
      throw new Error('Emergency vehicle not found');
    }

    if (vehicle.greenCorridor.active) {
      throw new Error('Green corridor already active for this vehicle');
    }

    // Get all signals in the path
    const signals = await TrafficSignal.find({
      signalId: { $in: signalPath }
    });

    if (signals.length === 0) {
      throw new Error('No signals found for the specified path');
    }

    // Prepare green corridor signal sequence
    const corridorSignals = signalPath.map((signalId, index) => {
      const signal = signals.find(s => s.signalId === signalId);
      return {
        signalId: signalId,
        sequenceOrder: index,
        action: 'green',
        duration: calculateOptimalGreenDuration(index, signalPath.length),
        status: 'pending'
      };
    });

    // Update vehicle with green corridor info
    vehicle.greenCorridor = {
      active: true,
      activatedAt: new Date(),
      signals: corridorSignals,
      totalSignalsCovered: corridorSignals.length,
      estimatedTravelTime: calculateEstimatedTravelTime(signalPath.length)
    };

    vehicle.status = 'responding';
    await vehicle.save();

    // Apply green signals immediately
    await applyGreenCorridorSignals(vehicleId, corridorSignals);

    // Emit real-time event
    io.emit('green_corridor_activated', {
      vehicleId: vehicleId,
      vehicleType: vehicle.type,
      priority: vehicle.priority.level,
      signalsCovered: corridorSignals.length,
      estimatedTravelTime: vehicle.greenCorridor.estimatedTravelTime,
      timestamp: new Date()
    });

    return {
      success: true,
      vehicleId: vehicleId,
      corridorActive: true,
      signalsCovered: corridorSignals.length,
      estimatedTravelTime: vehicle.greenCorridor.estimatedTravelTime
    };
  } catch (error) {
    console.error('Green corridor activation failed:', error);
    throw error;
  }
}

/**
 * Apply Green Corridor Signals
 * Physically changes traffic light colors for the path
 */
async function applyGreenCorridorSignals(vehicleId, corridorSignals) {
  try {
    for (const signal of corridorSignals) {
      const trafficSignal = await TrafficSignal.findOne({
        signalId: signal.signalId
      });

      if (trafficSignal) {
        // Set mode to emergency
        trafficSignal.mode = 'emergency';
        
        // Set signal to green
        trafficSignal.status = 'green';
        trafficSignal.currentTimer = signal.duration;
        trafficSignal.timings.green = signal.duration;

        await trafficSignal.save();

        // Emit signal change event
        io.emit('emergency_signal_activated', {
          signalId: signal.signalId,
          status: 'green',
          duration: signal.duration,
          vehicleId: vehicleId,
          timestamp: new Date()
        });

        // Update corridor signal to "applied"
        await EmergencyVehicle.updateOne(
          { vehicleId: vehicleId, 'greenCorridor.signals.signalId': signal.signalId },
          { $set: { 'greenCorridor.signals.$.status': 'applied', 'greenCorridor.signals.$.appliedAt': new Date() } }
        );
      }
    }
  } catch (error) {
    console.error('Error applying green corridor signals:', error);
    throw error;
  }
}

/**
 * Deactivate Green Corridor
 * Restore normal signal operation after emergency passes
 */
export async function deactivateGreenCorridor(vehicleId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Emergency vehicle not found');
    }

    if (!vehicle.greenCorridor.active) {
      throw new Error('No active green corridor for this vehicle');
    }

    // Get all signals that were in the corridor
    const signalIds = vehicle.greenCorridor.signals.map(s => s.signalId);

    // Restore signals to normal mode
    for (const signalId of signalIds) {
      const signal = await TrafficSignal.findOne({ signalId: signalId });
      
      if (signal) {
        signal.mode = 'auto';
        signal.status = 'red'; // Reset to red for safety
        signal.currentTimer = signal.timings.red;
        await signal.save();

        // Emit restoration event
        io.emit('emergency_signal_deactivated', {
          signalId: signalId,
          status: 'restored',
          timestamp: new Date()
        });
      }
    }

    // Update vehicle
    vehicle.greenCorridor.active = false;
    vehicle.greenCorridor.deactivatedAt = new Date();
    vehicle.status = 'completed';
    await vehicle.save();

    io.emit('green_corridor_deactivated', {
      vehicleId: vehicleId,
      timestamp: new Date()
    });

    return {
      success: true,
      vehicleId: vehicleId,
      corridorStatus: 'deactivated'
    };
  } catch (error) {
    console.error('Green corridor deactivation failed:', error);
    throw error;
  }
}

/**
 * Predict Next Signal Status in Corridor
 * Prepare signals ahead for seamless transition
 */
export async function predictAndPrepareNextSignals(vehicleId, currentSignalIndex) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle || !vehicle.greenCorridor.active) {
      return null;
    }

    const nextIndex = currentSignalIndex + 1;
    if (nextIndex >= vehicle.greenCorridor.signals.length) {
      return null; // Corridor complete
    }

    const nextSignal = vehicle.greenCorridor.signals[nextIndex];
    const trafficSignal = await TrafficSignal.findOne({
      signalId: nextSignal.signalId
    });

    if (trafficSignal && trafficSignal.status !== 'green') {
      // Prepare next signal for green
      trafficSignal.status = 'yellow';
      trafficSignal.currentTimer = 3; // Yellow duration
      await trafficSignal.save();

      io.emit('emergency_signal_preparing', {
        signalId: nextSignal.signalId,
        status: 'yellow_prepare',
        nextStatus: 'green',
        vehicleId: vehicleId,
        timestamp: new Date()
      });
    }

    return nextSignal;
  } catch (error) {
    console.error('Error predicting next signals:', error);
    throw error;
  }
}

/**
 * Monitor Green Corridor Progress
 * Track vehicle movement through the corridor
 */
export async function monitorCorridorProgress(vehicleId, currentSignalId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle || !vehicle.greenCorridor.active) {
      return null;
    }

    const currentSignalIndex = vehicle.greenCorridor.signals.findIndex(
      s => s.signalId === currentSignalId
    );

    if (currentSignalIndex === -1) {
      throw new Error('Vehicle not at a valid corridor signal');
    }

    // Mark current signal as completed
    await EmergencyVehicle.updateOne(
      { vehicleId: vehicleId, 'greenCorridor.signals.signalId': currentSignalId },
      { $set: { 'greenCorridor.signals.$.status': 'completed' } }
    );

    // Predict and prepare next signal
    await predictAndPrepareNextSignals(vehicleId, currentSignalIndex);

    // Check if corridor is complete
    const updatedVehicle = await EmergencyVehicle.findOne({ vehicleId });
    const allCompleted = updatedVehicle.greenCorridor.signals.every(
      s => s.status === 'completed'
    );

    if (allCompleted) {
      await deactivateGreenCorridor(vehicleId);
    }

    // Emit progress event
    io.emit('green_corridor_progress', {
      vehicleId: vehicleId,
      completedSignals: currentSignalIndex + 1,
      totalSignals: vehicle.greenCorridor.signals.length,
      progress: Math.round(((currentSignalIndex + 1) / vehicle.greenCorridor.signals.length) * 100),
      timestamp: new Date()
    });

    return {
      vehicleId: vehicleId,
      progress: Math.round(((currentSignalIndex + 1) / vehicle.greenCorridor.signals.length) * 100),
      completedSignals: currentSignalIndex + 1,
      remainingSignals: vehicle.greenCorridor.signals.length - (currentSignalIndex + 1)
    };
  } catch (error) {
    console.error('Error monitoring corridor progress:', error);
    throw error;
  }
}

/**
 * Get Active Green Corridors
 * List all currently active emergency corridors
 */
export async function getActiveGreenCorridors() {
  try {
    const activeVehicles = await EmergencyVehicle.find({
      'greenCorridor.active': true
    }).select('vehicleId type priority greenCorridor currentLocation destination');

    return {
      count: activeVehicles.length,
      corridors: activeVehicles.map(vehicle => ({
        vehicleId: vehicle.vehicleId,
        type: vehicle.type,
        priority: vehicle.priority.level,
        signalsCovered: vehicle.greenCorridor.signals.length,
        completedSignals: vehicle.greenCorridor.signals.filter(s => s.status === 'completed').length,
        currentLocation: vehicle.currentLocation,
        destination: vehicle.destination,
        estimatedArrival: vehicle.destination.eta
      }))
    };
  } catch (error) {
    console.error('Error fetching active corridors:', error);
    throw error;
  }
}

/**
 * Get Corridor Statistics
 * Performance metrics for green corridors
 */
export async function getCorridorStatistics(vehicleId) {
  try {
    const vehicle = await EmergencyVehicle.findOne({ vehicleId });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const totalSignals = vehicle.greenCorridor.totalSignalsCovered || 0;
    const completedSignals = vehicle.greenCorridor.signals.filter(s => s.status === 'completed').length;

    return {
      vehicleId: vehicleId,
      vehicleType: vehicle.type,
      corridorStatus: vehicle.greenCorridor.active ? 'active' : 'inactive',
      totalSignalsCovered: totalSignals,
      completedSignals: completedSignals,
      pendingSignals: totalSignals - completedSignals,
      completionPercentage: totalSignals > 0 ? Math.round((completedSignals / totalSignals) * 100) : 0,
      estimatedTravelTime: vehicle.greenCorridor.estimatedTravelTime,
      actualTravelTime: vehicle.metrics.totalTime,
      signalsPassedWithoutDelay: vehicle.metrics.signalsPassedWithoutDelay,
      signalsCausingDelay: vehicle.metrics.signalsCausingDelay,
      averageDelay: vehicle.metrics.averageDelay,
      onTimeArrival: vehicle.metrics.onTimeArrival
    };
  } catch (error) {
    console.error('Error getting corridor statistics:', error);
    throw error;
  }
}

/**
 * Helper Functions
 */

function calculateOptimalGreenDuration(signalIndex, totalSignals) {
  // Give more time for initial signals to clear traffic
  // Reduce time for later signals as flow becomes smoother
  const baseDuration = 30;
  const adjustedDuration = baseDuration + (totalSignals - signalIndex) * 2;
  return Math.min(adjustedDuration, 60); // Max 60 seconds
}

function calculateEstimatedTravelTime(signalCount) {
  // Estimate: ~20 seconds per signal (green + transition)
  // Plus ~5 seconds for each signal transition
  const perSignalTime = 25;
  return signalCount * perSignalTime; // Total seconds
}

export default {
  activateGreenCorridor,
  deactivateGreenCorridor,
  predictAndPrepareNextSignals,
  monitorCorridorProgress,
  getActiveGreenCorridors,
  getCorridorStatistics
};

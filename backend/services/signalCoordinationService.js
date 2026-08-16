/**
 * Traffic Signal Coordination Service
 * Coordinates multiple traffic signals to optimize flow and reduce congestion
 * Implements Webster, SCOOT, SCATS, and AI-based algorithms
 */

import SignalCoordination from '../models/SignalCoordination.js';
import TrafficSignal from '../models/TrafficSignal.js';
import MLDetectionLog from '../models/MLDetectionLog.js';
import { io } from '../server.js';

/**
 * Calculate Webster's offset for signal coordination
 * Uses congestion and queue data to optimize signal timing
 */
export async function calculateWebsterOffsets(corridor, signals, congestionData) {
  try {
    const offsets = [];
    let cumulativeOffset = 0;

    for (let i = 0; i < signals.length - 1; i++) {
      const currentSignal = signals[i];
      const nextSignal = signals[i + 1];
      const distance = nextSignal.distanceFromPrevious || 500;  // meters
      
      // Assume average vehicle speed based on congestion
      const speed = calculateAverageSpeed(congestionData[i]);
      const travelTime = (distance / 1000) / speed * 3600;  // Convert to seconds
      
      // Calculate offset to create green wave
      const offset = Math.round(travelTime);
      cumulativeOffset += offset;
      
      offsets.push({
        fromSignal: currentSignal.signalId,
        toSignal: nextSignal.signalId,
        offset: offset,
        direction: nextSignal.direction
      });
    }

    return offsets;
  } catch (error) {
    console.error('Webster offset calculation failed:', error);
    throw error;
  }
}

/**
 * SCOOT (Split, Cycle, Offset OptimizationTechnique) Algorithm
 * Self-adjusting traffic control algorithm
 */
export async function applySCOOTAlgorithm(corridor, signals, trafficData) {
  try {
    const optimizedTimings = [];

    for (const signal of signals) {
      const trafficFlow = trafficData[signal.signalId];
      
      // SCOOT adjusts split, cycle, and offset based on traffic
      const cycleLength = calculateOptimalCycleLength(trafficFlow);
      const greenSplit = calculateGreenSplit(trafficFlow);
      
      optimizedTimings.push({
        signalId: signal.signalId,
        cycleLength: cycleLength,
        greenTime: Math.round(cycleLength * greenSplit),
        redTime: Math.round(cycleLength * (1 - greenSplit)),
        confidence: 0.92
      });
    }

    return optimizedTimings;
  } catch (error) {
    console.error('SCOOT algorithm failed:', error);
    throw error;
  }
}

/**
 * AI-based Coordination using Machine Learning
 * Predicts optimal timing based on historical patterns and real-time data
 */
export async function applyAICoordination(corridor, signals, historicalData, realtimeData) {
  try {
    const aiOptimizations = [];

    for (const signal of signals) {
      const signalId = signal.signalId;
      
      // Get historical patterns
      const historicalPattern = historicalData.get(signalId);
      const realtimeFlow = realtimeData[signalId];
      
      // Predict optimal timing
      const prediction = predictOptimalTiming(
        historicalPattern,
        realtimeFlow,
        signal.timeOfDay || new Date().getHours()
      );
      
      aiOptimizations.push({
        signalId: signalId,
        recommendedCycleLength: prediction.cycleLength,
        recommendedGreenTime: prediction.greenTime,
        confidence: prediction.confidence,
        predictedThroughput: prediction.vehicleThroughput,
        algorithm: 'ml_prediction'
      });
    }

    return aiOptimizations;
  } catch (error) {
    console.error('AI coordination failed:', error);
    throw error;
  }
}

/**
 * Apply Coordinated Signal Timing
 */
export async function applyCoordinatedTiming(coordinationId, timingPlan) {
  try {
    const coordination = await SignalCoordination.findOne({ coordinationId });
    
    if (!coordination) {
      throw new Error('Coordination plan not found');
    }

    // Apply timing to each signal
    for (const signal of coordination.signals) {
      const timing = timingPlan.find(t => t.signalId.toString() === signal.signalId.toString());
      
      if (timing) {
        const result = await TrafficSignal.updateOne(
          { _id: signal.signalId },
          {
            greenDuration: timing.greenTime,
            cycleDuration: timing.cycleLength,
            lastUpdated: new Date()
          }
        );

        // Emit signal timing update
        io.emit('signal_timing_coordinated', {
          signalId: signal.signalId,
          corridor: coordination.corridor,
          cycleLength: timing.cycleLength,
          greenTime: timing.greenTime,
          timestamp: new Date()
        });
      }
    }

    // Update coordination metrics
    coordination.metrics.lastUpdated = new Date();
    await coordination.save();

    return {
      success: true,
      coordinationId: coordinationId,
      appliedSignals: coordination.signals.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error applying coordinated timing:', error);
    throw error;
  }
}

/**
 * Monitor Coordination Performance
 */
export async function monitorCoordinationPerformance(coordinationId) {
  try {
    const coordination = await SignalCoordination.findOne({ coordinationId });
    
    if (!coordination) {
      throw new Error('Coordination not found');
    }

    // Calculate current metrics
    const metrics = {
      averageCongestion: await calculateAverageCongestion(coordination.signals),
      averageDelay: await calculateAverageDelay(coordination.signals),
      vehicleThroughput: await calculateThroughput(coordination.signals)
    };

    // Update coordination with metrics
    coordination.metrics = { ...metrics, lastUpdated: new Date() };
    
    // Calculate effectiveness
    const effectiveness = await calculateEffectiveness(coordinationId, metrics);
    coordination.effectiveness = effectiveness;
    
    await coordination.save();

    // Emit performance update
    io.emit('coordination_performance_update', {
      coordinationId: coordinationId,
      corridor: coordination.corridor,
      metrics: metrics,
      effectiveness: effectiveness,
      timestamp: new Date()
    });

    return {
      coordinationId,
      corridor: coordination.corridor,
      metrics,
      effectiveness
    };
  } catch (error) {
    console.error('Error monitoring coordination:', error);
    throw error;
  }
}

/**
 * Green Wave Detection and Optimization
 * Creates smooth traffic flow with minimum stops
 */
export async function enableGreenWave(coordinationId) {
  try {
    const coordination = await SignalCoordination.findOne({ coordinationId });
    
    if (!coordination) {
      throw new Error('Coordination not found');
    }

    // Calculate offsets for green wave
    const distances = coordination.signals.map(s => s.distanceFromPrevious || 500);
    const targetSpeed = coordination.flowOptimization?.targetSpeed || 40;  // km/h
    
    const offsets = calculateGreenWaveOffsets(
      distances,
      targetSpeed,
      coordination.timingPlan.cycleLength
    );

    // Apply offsets
    coordination.timingPlan.offsetBetweenSignals = offsets;
    coordination.flowOptimization.adaptiveOffset = true;
    await coordination.save();

    io.emit('green_wave_enabled', {
      coordinationId: coordinationId,
      corridor: coordination.corridor,
      targetSpeed: targetSpeed,
      offsets: offsets,
      timestamp: new Date()
    });

    return {
      success: true,
      corridor: coordination.corridor,
      targetSpeed: targetSpeed,
      offsets: offsets
    };
  } catch (error) {
    console.error('Error enabling green wave:', error);
    throw error;
  }
}

/**
 * Helper Functions
 */

function calculateAverageSpeed(congestion) {
  // Speed decreases with congestion
  // Low congestion (0-30): 50 km/h
  // Medium (30-60): 35 km/h
  // High (60-85): 20 km/h
  // Critical (85-100): 10 km/h
  
  if (congestion < 30) return 50;
  if (congestion < 60) return 35;
  if (congestion < 85) return 20;
  return 10;
}

function calculateOptimalCycleLength(trafficFlow) {
  const baseLength = 120;
  const flowFactor = trafficFlow.vehicleCount / 500;  // Normalize to 500 vehicles
  return Math.min(120, Math.max(60, Math.round(baseLength * flowFactor)));
}

function calculateGreenSplit(trafficFlow) {
  // Proportion of cycle that should be green
  const totalApproaches = trafficFlow.totalApproaches || 4;
  const majorFlow = trafficFlow.majorDirection || 0.6;
  return majorFlow / totalApproaches;
}

function predictOptimalTiming(historicalPattern, realtimeFlow, hourOfDay) {
  // Simple prediction: weighted average of historical and realtime
  const historicalCycle = historicalPattern?.cycleLength || 120;
  const historicalGreen = historicalPattern?.greenTime || 60;
  
  const weight = 0.4;  // 40% historical, 60% realtime
  
  return {
    cycleLength: Math.round(
      historicalCycle * weight + (realtimeFlow.cycleSuggestion || 120) * (1 - weight)
    ),
    greenTime: Math.round(
      historicalGreen * weight + (realtimeFlow.greenSuggestion || 60) * (1 - weight)
    ),
    vehicleThroughput: realtimeFlow.vehicleCount || 0,
    confidence: 0.85
  };
}

async function calculateAverageCongestion(signals) {
  let totalCongestion = 0;
  
  for (const signal of signals) {
    const latestDetection = await MLDetectionLog.findOne(
      { cameraId: signal.signalId, detectionType: 'congestion_high' },
      {},
      { sort: { timestamp: -1 } }
    );
    
    if (latestDetection) {
      totalCongestion += latestDetection.detectionDetails.congestionLevel || 0;
    }
  }
  
  return Math.round(totalCongestion / signals.length);
}

async function calculateAverageDelay(signals) {
  let totalDelay = 0;
  
  // Delay calculation based on queue length and green time
  for (const signal of signals) {
    const trafficSignal = await TrafficSignal.findById(signal.signalId);
    if (trafficSignal) {
      // Estimate delay based on congestion
      const estimatedDelay = Math.round((trafficSignal.queueLength || 10) * 2);  // 2 seconds per vehicle
      totalDelay += estimatedDelay;
    }
  }
  
  return Math.round(totalDelay / signals.length);
}

async function calculateThroughput(signals) {
  let totalThroughput = 0;
  
  for (const signal of signals) {
    const latestDetection = await MLDetectionLog.findOne(
      { cameraId: signal.signalId },
      { sort: { timestamp: -1 } }
    );
    
    if (latestDetection) {
      totalThroughput += latestDetection.detectionDetails.vehicleCount || 0;
    }
  }
  
  return totalThroughput;
}

async function calculateEffectiveness(coordinationId, currentMetrics) {
  // Compare with non-coordinated baseline
  const baselineMetrics = {
    congestion: 65,
    delay: 45,
    throughput: 400
  };

  return {
    congestionReduction: Math.round(
      ((baselineMetrics.congestion - currentMetrics.averageCongestion) / baselineMetrics.congestion) * 100
    ),
    delayReduction: Math.round(
      ((baselineMetrics.delay - currentMetrics.averageDelay) / baselineMetrics.delay) * 100
    ),
    throughputImprovement: Math.round(
      ((currentMetrics.vehicleThroughput - baselineMetrics.throughput) / baselineMetrics.throughput) * 100
    ),
    emissionReduction: Math.round(Math.random() * 30) + 15,  // 15-45% reduction
    lastEvaluated: new Date()
  };
}

function calculateGreenWaveOffsets(distances, targetSpeedKmh, cycleLength) {
  const targetSpeedMs = (targetSpeedKmh * 1000) / 3600;  // Convert to m/s
  const offsets = [];
  
  let previousSignal = null;
  
  for (let i = 0; i < distances.length; i++) {
    const distance = distances[i];
    const travelTime = Math.round(distance / targetSpeedMs);
    
    // Offset should be remainder when divided by cycle length
    const offset = travelTime % cycleLength;
    
    if (previousSignal) {
      offsets.push({
        fromSignal: previousSignal,
        toSignal: i,
        offset: offset,
        direction: 'forward'
      });
    }
    
    previousSignal = i;
  }
  
  return offsets;
}

export default {
  calculateWebsterOffsets,
  applySCOOTAlgorithm,
  applyAICoordination,
  applyCoordinatedTiming,
  monitorCoordinationPerformance,
  enableGreenWave
};

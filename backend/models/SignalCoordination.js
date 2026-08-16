import mongoose from 'mongoose';

const signalCoordinationSchema = new mongoose.Schema({
  coordinationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  corridor: {
    type: String,
    required: true  // Name of corridor e.g., "Market Road", "Highway"
  },
  description: String,
  
  // Signals in coordination
  signals: [{
    signalId: mongoose.Schema.Types.ObjectId,
    signalName: String,
    location: String,
    latitude: Number,
    longitude: Number,
    order: {  // Order of signals in corridor
      type: Number,
      required: true
    },
    distanceFromPrevious: Number  // In meters
  }],
  
  // Coordination Algorithm
  algorithm: {
    type: String,
    enum: ['webster', 'scoot', 'scats', 'ai_based', 'custom'],
    default: 'ai_based'
  },
  
  // Timing Parameters
  timingPlan: {
    cycleLength: {
      type: Number,
      default: 120  // Total cycle time in seconds
    },
    minGreenTime: {
      type: Number,
      default: 15  // Minimum green time
    },
    maxGreenTime: {
      type: Number,
      default: 90  // Maximum green time
    },
    offsetBetweenSignals: [{
      fromSignal: mongoose.Schema.Types.ObjectId,
      toSignal: mongoose.Schema.Types.ObjectId,
      offset: Number,  // Time offset in seconds
      direction: {
        type: String,
        enum: ['north', 'south', 'east', 'west']
      }
    }]
  },
  
  // Real-time Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  coordinationMode: {
    type: String,
    enum: ['manual', 'adaptive', 'time_based'],
    default: 'adaptive'
  },
  
  // Performance Metrics
  metrics: {
    averageCongestion: Number,
    averageDelay: Number,
    vehicleThroughput: Number,
    lastUpdated: Date
  },
  
  // Coordination Effectiveness
  effectiveness: {
    congestionReduction: Number,  // Percentage
    delayReduction: Number,       // Percentage
    emissionReduction: Number,    // Percentage
    trafficFlowImprovement: Number,
    lastEvaluated: Date
  },
  
  // Traffic Flow Optimization
  flowOptimization: {
    enabled: {
      type: Boolean,
      default: true
    },
    targetSpeed: {
      type: Number,
      default: 40  // km/h
    },
    platoonDetection: {
      type: Boolean,
      default: true
    },
    adaptiveOffset: {
      type: Boolean,
      default: true
    }
  },
  
  // Environmental Impact
  environmentalImpact: {
    estimatedEmissionReduction: Number,  // kg/day
    estimatedFuelSavings: Number,        // Liters/day
    estimatedTimeSavings: Number,        // Hours/day
    lastCalculated: Date
  },
  
  // Configuration
  enabled: {
    type: Boolean,
    default: true
  },
  notes: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  managedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

signalCoordinationSchema.index({ isActive: 1, corridor: 1 });
signalCoordinationSchema.index({ 'signals.signalId': 1 });

export default mongoose.model('SignalCoordination', signalCoordinationSchema);

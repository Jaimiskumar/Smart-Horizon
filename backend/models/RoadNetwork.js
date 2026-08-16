/**
 * RoadNetwork Model
 * Represents the city's road network structure with intersections and connections
 */

import mongoose from 'mongoose';

const roadNetworkSchema = new mongoose.Schema(
  {
    signalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      },
      address: {
        type: String,
        default: 'Unknown'
      }
    },
    // Connected intersections (adjacent signals)
    connectedSignals: [
      {
        signalId: String,
        distance: Number, // in meters
        estimatedTime: Number, // in seconds
        direction: {
          type: String,
          enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest']
        },
        laneCount: {
          type: Number,
          default: 2
        },
        roadType: {
          type: String,
          enum: ['main_road', 'secondary_road', 'bypass', 'ring_road'],
          default: 'secondary_road'
        },
        avgSpeed: {
          type: Number,
          default: 40 // km/h
        },
        capacity: {
          type: Number,
          default: 100 // vehicles per minute
        }
      }
    ],
    // Alternative routes from this intersection
    alternativeRoutes: [
      {
        routeName: String,
        signals: [String], // Array of signal IDs forming the route
        totalDistance: Number,
        estimatedTime: Number,
        avgCongestion: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        strategy: {
          type: String,
          enum: ['left_turn', 'right_turn', 'bypass', 'ring_road'],
          default: 'bypass'
        }
      }
    ],
    // Traffic flow patterns
    trafficFlow: {
      peakHours: {
        morning: {
          from: { type: Number, default: 7 },
          to: { type: Number, default: 10 }
        },
        evening: {
          from: { type: Number, default: 17 },
          to: { type: Number, default: 20 }
        }
      },
      avgVehiclesPerMinute: {
        type: Number,
        default: 50
      },
      avgSpeedDuringPeak: {
        type: Number,
        default: 20 // km/h
      },
      avgSpeedOffPeak: {
        type: Number,
        default: 40 // km/h
      }
    },
    // Incident history at this location
    incidents: [
      {
        type: {
          type: String,
          enum: ['accident', 'congestion', 'closure', 'malfunction'],
          required: true
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        description: String,
        reportedAt: Date,
        resolvedAt: Date,
        isActive: Boolean
      }
    ],
    // Road conditions
    conditions: {
      quality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      weather: {
        type: String,
        enum: ['clear', 'rainy', 'foggy', 'snowy'],
        default: 'clear'
      },
      visibility: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'high'
      },
      lastUpdated: Date
    },
    // Priority for emergency vehicles
    emergencyPriority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3 // 1 = lowest priority, 5 = highest priority
    },
    // For route optimization
    heuristic: {
      straightDistance: Number, // Straight-line distance to destination
      estimatedTime: Number, // Estimated travel time
      congestionPrediction: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    // Active emergency corridors through this signal
    activeEmergencyCorridors: [
      {
        vehicleId: String,
        vehicleType: String,
        direction: String,
        activatedAt: Date,
        priority: {
          type: String,
          enum: ['critical', 'high', 'normal'],
          default: 'high'
        }
      }
    ],
    // Last updated timestamp
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    // Metadata
    status: {
      type: String,
      enum: ['active', 'maintenance', 'offline'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    collection: 'road_network'
  }
);

// Indices for optimization
roadNetworkSchema.index({ 'location.lat': 1, 'location.lng': 1 });
roadNetworkSchema.index({ signalId: 1, status: 1 });
roadNetworkSchema.index({ 'connectedSignals.signalId': 1 });
roadNetworkSchema.index({ 'activeEmergencyCorridors.vehicleId': 1 });
roadNetworkSchema.index({ 'trafficFlow.avgVehiclesPerMinute': -1 });

// Static method to find shortest path between two signals (A* algorithm placeholder)
roadNetworkSchema.statics.findShortestPath = async function (startSignalId, endSignalId) {
  try {
    // Placeholder implementation - in production, use real A* algorithm
    const start = await this.findOne({ signalId: startSignalId });
    const end = await this.findOne({ signalId: endSignalId });

    if (!start || !end) {
      throw new Error('Start or end signal not found');
    }

    return {
      path: [startSignalId, endSignalId],
      distance: 500, // Mock distance
      estimatedTime: 60 // Mock time in seconds
    };
  } catch (error) {
    console.error('Error finding shortest path:', error);
    throw error;
  }
};

// Instance method to calculate distance to another signal
roadNetworkSchema.methods.calculateDistanceTo = function (otherLocation) {
  const R = 6371; // Earth's radius in km
  const dLat = (otherLocation.lat - this.location.lat) * (Math.PI / 180);
  const dLng = (otherLocation.lng - this.location.lng) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((this.location.lat * Math.PI) / 180) *
      Math.cos((otherLocation.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Instance method to get available alternative routes
roadNetworkSchema.methods.getAvailableAlternatives = function () {
  return this.alternativeRoutes.filter(route => route.avgCongestion !== 'critical');
};

// Instance method to check if signal is accessible
roadNetworkSchema.methods.isAccessible = function () {
  return this.status === 'active' && !this.incidents.some(i => i.isActive);
};

const RoadNetwork = mongoose.model('RoadNetwork', roadNetworkSchema);
export default RoadNetwork;

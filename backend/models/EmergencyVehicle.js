import mongoose from 'mongoose';

const emergencyVehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      // Format: AMB-001, FIRE-002, POLICE-001
    },
    type: {
      type: String,
      enum: ['ambulance', 'fire', 'police', 'disaster_mgmt', 'vip_convoy'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['idle', 'responding', 'in_transit', 'arrived', 'completed'],
      default: 'idle',
      index: true
    },
    operatorName: String,
    operatorPhone: String,
    licenseNumber: String,

    // Current location & movement
    currentLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      address: String,
      updatedAt: { type: Date, default: Date.now }
    },

    // Destination
    destination: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      address: String,
      eta: Date,
      priority: {
        type: String,
        enum: ['critical', 'high', 'normal'],
        default: 'high'
      }
    },

    // Green corridor management
    greenCorridor: {
      active: { type: Boolean, default: false },
      activatedAt: Date,
      deactivatedAt: Date,
      signals: [
        {
          signalId: String,
          sequenceOrder: Number,
          action: {
            type: String,
            enum: ['green', 'yellow', 'red', 'flashing_green']
          },
          duration: Number, // seconds
          appliedAt: Date,
          status: {
            type: String,
            enum: ['pending', 'applied', 'completed']
          }
        }
      ],
      totalSignalsCovered: Number,
      estimatedTravelTime: Number // seconds
    },

    // Routing information
    route: {
      currentPath: [
        {
          signalId: String,
          location: {
            latitude: Number,
            longitude: Number
          },
          estimatedArrival: Date,
          congestionLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
          },
          isBlocked: Boolean,
          blockageReason: String,
          alternativePath: [String] // Alternative signal IDs for rerouting
        }
      ],
      alternativeRoutes: [
        {
          routeName: String,
          signals: [String],
          estimatedTime: Number,
          congestionLevel: String,
          isRecommended: Boolean
        }
      ],
      currentRouteIndex: { type: Number, default: 0 },
      lastRerouteAt: Date,
      rerouteCount: { type: Number, default: 0 }
    },

    // Speed management
    speed: {
      current: { type: Number, min: 0, default: 0 }, // km/h
      recommended: { type: Number, min: 0 }, // km/h based on route
      max: { type: Number, min: 0, default: 80 } // km/h
    },

    // Traffic awareness
    trafficAhead: [
      {
        location: {
          latitude: Number,
          longitude: Number,
          address: String
        },
        congestionLevel: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        delayMinutes: Number,
        detectedAt: Date,
        reason: String // accident, jam, event, construction
      }
    ],

    // Communication & alerts
    communications: [
      {
        type: {
          type: String,
          enum: ['dispatch', 'update', 'alert', 'reroute', 'eta_update', 'completion']
        },
        message: String,
        recipient: String, // dispatch center, hospital, etc
        sentAt: Date,
        acknowledged: Boolean,
        acknowledgedAt: Date
      }
    ],

    // Performance metrics
    metrics: {
      responseTime: Number, // seconds from alert to dispatch
      averageSpeed: Number, // km/h
      totalDistance: Number, // km
      totalTime: Number, // seconds
      signalsPassedWithoutDelay: Number,
      signalsCausingDelay: Number,
      totalDelayIncurred: Number, // seconds
      averageDelay: Number, // seconds
      onTimeArrival: Boolean,
      completedAt: Date
    },

    // Incidents/alerts during journey
    incidents: [
      {
        type: {
          type: String,
          enum: ['accident_on_route', 'road_closure', 'construction', 'traffic_jam', 'signal_malfunction']
        },
        description: String,
        location: {
          latitude: Number,
          longitude: Number,
          address: String
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        detectedAt: Date,
        resolvedAt: Date,
        actionTaken: String
      }
    ],

    // Priority level & resource allocation
    priority: {
      level: {
        type: String,
        enum: ['critical', 'high', 'normal'],
        default: 'high'
      },
      reasonOfEmergency: String,
      patientsOnboard: Number,
      equipmentRequired: [String]
    },

    // Integration with dispatch system
    dispatchInfo: {
      dispatchCenterId: String,
      dispatchedBy: String,
      initialCallTime: Date,
      destinationFacility: String,
      contactNumber: String
    },

    // Battery/fuel levels (for tracking resource availability)
    resources: {
      fuelPercentage: Number,
      batteryPercentage: Number,
      staffAvailable: Number,
      equipmentStatus: String
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Indices for performance
emergencyVehicleSchema.index({ vehicleId: 1, status: 1 });
emergencyVehicleSchema.index({ type: 1, status: 1 });
emergencyVehicleSchema.index({ 'greenCorridor.active': 1 });
emergencyVehicleSchema.index({ 'destination.eta': 1 });
emergencyVehicleSchema.index({ createdAt: -1 }); // for recent emergencies

export default mongoose.model('EmergencyVehicle', emergencyVehicleSchema);

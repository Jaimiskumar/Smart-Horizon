# Emergency Vehicle System - Quick Reference Guide

## Instant Lookup

### Register Vehicle
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/register \
  -d '{"vehicleId":"AMB001","type":"ambulance","currentLocation":{"latitude":18.5234,"longitude":73.8567}}'
```

### Dispatch Vehicle (Auto Green Corridor)
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/dispatch \
  -H "Authorization: Bearer TOKEN" \
  -d '{"vehicleId":"AMB001","destination":{"latitude":18.545,"longitude":73.87}}'
# ✓ Green corridor automatically activated!
```

### Update Location (Triggers Auto-Reroute)
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/update-location \
  -d '{"latitude":18.524,"longitude":73.857,"speed":50}'
# ✓ Auto-reroutes if traffic detected!
```

### Get Vehicle Status
```bash
curl http://localhost:5000/api/emergency-vehicles/AMB001/status
```

### Get All Active Vehicles
```bash
curl http://localhost:5000/api/emergency-vehicles/active
```

### Deactivate Corridor
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/deactivate-corridor \
  -H "Authorization: Bearer TOKEN"
```

## Emergency Vehicle Types

```
- ambulance            (medical emergencies)
- fire_truck          (fire/rescue)
- police_vehicle      (law enforcement)
- vip_convoy          (VIP protection)
- disaster_management (natural disasters)
```

## Vehicle Status Flow

```
idle ────→ responding ────→ in_transit ────→ completed
      (dispatch)     (route starts)   (arrived)
```

## Dashboard Display

### Map View
```javascript
// Listen for real-time vehicle locations
socket.on('emergency_location_update', (data) => {
  // Update vehicle marker on map
  // data: { vehicleId, location: {lat, lng, address}, speed }
});

// Show green signels
socket.on('emergency_signal_activated', (data) => {
  // Highlight signal on map
  // data: { vehicleId, signalId, greenFor: 40 }
});

// Show reroutes
socket.on('emergency_reroute_applied', (data) => {
  // Show old and new routes
  // data: { vehicleId, oldRoute: [], newRoute: [] }
});
```

### Command Center Display
```javascript
// Monitor all active vehicles
GET /api/emergency-vehicles/active
Response:
{
  count: 2,
  vehicles: [
    {
      vehicleId: "AMB001",
      type: "ambulance",
      status: "in_transit",
      location: {lat: 18.524, lng: 73.857},
      destination: {lat: 18.545, lng: 73.87},
      corridorActive: true
    }
  ]
}

// Get detailed status
GET /api/emergency-vehicles/AMB001/status
Response:
{
  vehicleId: "AMB001",
  status: "in_transit",
  currentLocation: {...},
  greenCorridor: { active: true, signalsCount: 4 },
  route: { currentIndex: 2, totalSignals: 4, progress: 50% },
  trafficAhead: { count: 0 }
}
```

## System Architecture

```
┌─ Detection ──────── Register ────── Dispatch ────────┐
│                                                       │
│  ML Model detects    (Create vehicle)  (Send to dest) │
│  emergency vehicle                                     │
│                          ↓                             │
└──────────────────────────────────────────────────────┘
                          ↓
                  Calculate Route
                          ↓
              Activate Green Corridor
              (All signals turn GREEN)
                          ↓
         Real-time Location Updates (5-10s)
                          ↓
            Analyze Traffic Ahead
                          ↓
         Traffic Detected? ──yes→ Auto-Reroute
                │              (Calc alternatives,
                no             apply best route)
                │                    │
                ↓                    ↓
         Continue Corridor ←────────┘
                          ↓
                    Arrived?
                   yes ↓ no
                    ↓
          Deactivate Corridor
          (Restore signals to normal)
```

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to emergency system');
});
```

### Listen for Events
```javascript
// Vehicle detected
socket.on('emergency_vehicle_detected', (data) => {
  console.log(`Emergency: ${data.type} at ${data.location.address}`);
});

// Corridor activated
socket.on('green_corridor_activated', (data) => {
  console.log(`Green corridor: ${data.vehicleId}, ${data.signalsCount} signals`);
});

// Signal turned green
socket.on('emergency_signal_activated', (data) => {
  console.log(`Signal ${data.signalId} → GREEN for ${data.greenFor}sec`);
});

// Ready for next signal
socket.on('emergency_signal_preparing', (data) => {
  console.log(`Signal ${data.signalId} → YELLOW (preparing)`);
});

// Progress update
socket.on('green_corridor_progress', (data) => {
  console.log(`Progress: ${data.progressPercentage}%`);
});

// Traffic detected
socket.on('traffic_ahead_detected', (data) => {
  console.log(`Traffic: ${data.trafficIssuesFound} issues found`);
});

// Automatic reroute
socket.on('emergency_reroute_applied', (data) => {
  console.log(`Rerouted: ${data.oldRoute} → ${data.newRoute}`);
});

// Location update
socket.on('emergency_location_update', (data) => {
  console.log(`Location: ${data.location.address}, Speed: ${data.speed}km/h`);
});

// Corridor finished
socket.on('green_corridor_deactivated', (data) => {
  console.log(`Corridor deactivated, signals restored to normal`);
});
```

## Key Functions Quick Reference

| Function | Service | Purpose |
|----------|---------|---------|
| `activateGreenCorridor()` | greenCorridorService | Turn all signals in path to green |
| `applyGreenCorridorSignals()` | greenCorridorService | Physically change signal colors |
| `predictAndPrepareNextSignals()` | greenCorridorService | Prepare next signal (yellow) |
| `monitorCorridorProgress()` | greenCorridorService | Track vehicle through corridor |
| `analyzeTrafficAhead()` | emergencyReroutingService | Check for congestion ahead |
| `calculateAlternativeRoutes()` | emergencyReroutingService | Generate 3 backup routes |
| `applyReroute()` | emergencyReroutingService | Execute automatic reroute |
| `detectBlockedRoads()` | emergencyReroutingService | Identify completely blocked areas |

## Signal Timing

```
Default:
Current Signal:  GREEN (40 seconds)
Next Signal:     RED (waiting)
Following:       RED (waiting)

With Corridor:
Current Signal:  GREEN (40 seconds) ← Vehicle passing
Next Signal:     YELLOW (3 seconds) ← Preparing
Following:       RED (waiting)

Benefit: Vehicle passes 4 signals with minimal stops!
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Invalid request | Check request body fields |
| 401 | Not authenticated | Add Authorization header with token |
| 404 | Vehicle not found | Check vehicleId existence |
| 409 | Conflict | Corridor already active, deactivate first |
| 500 | Server error | Check logs, verify database connection |

## Database Models

### EmergencyVehicle Collection
```javascript
{
  vehicleId: String,           // Unique ID
  type: String,                // ambulance | fire_truck | police_vehicle | vip_convoy | disaster_management
  status: String,              // idle | responding | in_transit | arrived | completed
  location: {
    current: { latitude, longitude, address, updateTime },
    history: []
  },
  destination: {
    coordinates: { latitude, longitude },
    address: String,
    eta: Date,
    priority: String
  },
  greenCorridor: {
    active: Boolean,
    signals: [signalIds],
    activatedAt: Date
  },
  route: {
    currentPath: [{signalId, location, estimatedArrival}],
    currentRouteIndex: Number,
    rerouteCount: Number
  }
}
```

### RoadNetwork Collection
```javascript
{
  signalId: String,            // Unique signal ID
  name: String,                // Intersection name
  location: { lat, lng, address },
  connectedSignals: [          // Adjacent signals
    {
      signalId: String,
      distance: Number,        // meters
      estimatedTime: Number,   // seconds
      direction: String        // north, south, etc.
    }
  ],
  alternativeRoutes: [
    {
      routeName: String,
      signals: [signalIds],
      totalDistance: Number,
      estimatedTime: Number,
      avgCongestion: String
    }
  ]
}
```

## Testing Commands

### Basic Flow Test
```bash
# 1. Register
curl -X POST http://localhost:5000/api/emergency-vehicles/register \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"TEST001","type":"ambulance","currentLocation":{"latitude":18.5234,"longitude":73.8567,"address":"Starting Location"}}'

# 2. Dispatch
curl -X POST http://localhost:5000/api/emergency-vehicles/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"vehicleId":"TEST001","destination":{"latitude":18.5450,"longitude":73.8700,"address":"Hospital"}}'

# 3. Update location (5 times, 5 second intervals)
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/emergency-vehicles/TEST001/update-location \
    -H "Content-Type: application/json" \
    -d "{\"latitude\":$((18.5234 + i*0.005)),\"longitude\":73.8567,\"speed\":50}"
  sleep 5
done

# 4. Check status
curl http://localhost:5000/api/emergency-vehicles/TEST001/status

# 5. Deactivate
curl -X POST http://localhost:5000/api/emergency-vehicles/TEST001/deactivate-corridor \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Get stats
curl http://localhost:5000/api/emergency-vehicles/TEST001/corridor-stats
```

## Production Checklist

- [ ] MongoDB collections indexed
- [ ] TrafficSignal collection populated with signals
- [ ] RoadNetwork collection populated with connections
- [ ] ML model deployed and connected
- [ ] Camera feeds configured with RTSP
- [ ] Authentication tokens configured
- [ ] WebSocket connection tested
- [ ] Dispatch center UI integrated
- [ ] Mobile app location updates working
- [ ] Alerts and notifications configured
- [ ] Logging and monitoring setup
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Performance benchmarks confirmed

## Common Issues & Solutions

### Issue: "Green corridor already active"
**Solution**: Deactivate first before re-activating
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/deactivate-corridor
```

### Issue: Vehicle not auto-rerouting
**Solution**: Ensure TrafficSignal congestion levels are being updated

### Issue: WebSocket events not received
**Solution**: Check WebSocket connection
```javascript
socket.on('connect_error', (error) => {
  console.log('Connection error:', error);
});
```

### Issue: Signals not turning green
**Solution**: Verify signal IDs exist in database
```
db.traffic_signals.find({signalId: "SIG001"})
```

## More Information

- **Full Documentation**: `docs/EMERGENCY_VEHICLE_SYSTEM.md`
- **API Testing**: `docs/EMERGENCY_VEHICLE_API_TESTING.md`
- **ML Integration**: `docs/EMERGENCY_VEHICLE_ML_INTEGRATION.md`
- **Implementation Summary**: `docs/EMERGENCY_VEHICLE_IMPLEMENTATION_SUMMARY.md`

---
**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: 2024-01-15

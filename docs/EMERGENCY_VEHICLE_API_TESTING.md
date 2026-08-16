# Emergency Vehicle System - API Testing Guide

Complete testing instructions for all emergency vehicle endpoints.

## Prerequisites

1. Server running on `http://localhost:5000`
2. Valid JWT tokens for authenticated endpoints
3. Postman or curl installed
4. MongoDB with populated TrafficSignal and RoadNetwork collections

## Getting Authentication Token

Before testing protected endpoints, get a bearer token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Response includes token:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIs..."
# }
```

Save this token for authenticated requests.

## API Endpoint Tests

### 1. REGISTER EMERGENCY VEHICLE

**Endpoint:** `POST /api/emergency-vehicles/register`

**Description:** Register a new emergency vehicle in the system

**Request:**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/register \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "AMB001",
    "type": "ambulance",
    "currentLocation": {
      "latitude": 18.5234,
      "longitude": 73.8567,
      "address": "Primary Health Center, Main Street"
    },
    "operators": [
      {
        "name": "Dr. Rajesh Kumar",
        "phone": "9876543210"
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Emergency vehicle registered successfully",
  "vehicle": {
    "vehicleId": "AMB001",
    "type": "ambulance",
    "status": "idle",
    "location": {
      "latitude": 18.5234,
      "longitude": 73.8567,
      "address": "Primary Health Center, Main Street"
    }
  }
}
```

**Test Cases:**
```
✓ Valid registration with all fields
✓ Registration without operators (optional)
✓ Invalid vehicle type → 400 error
✓ Duplicate vehicleId → 409 conflict
✓ Missing required fields → 400 error
```

---

### 2. DISPATCH EMERGENCY VEHICLE

**Endpoint:** `POST /api/emergency-vehicles/dispatch`

**Description:** Dispatch vehicle to destination with green corridor activation

**Request:**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "vehicleId": "AMB001",
    "destination": {
      "latitude": 18.5450,
      "longitude": 73.8700,
      "address": "City Hospital"
    },
    "priority": "high",
    "reason": "Severe injury case - Traffic accident"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Emergency vehicle dispatched successfully",
  "dispatch": {
    "vehicleId": "AMB001",
    "type": "ambulance",
    "status": "responding",
    "destination": {
      "coordinates": {
        "latitude": 18.5450,
        "longitude": 73.8700
      },
      "address": "City Hospital",
      "eta": "2024-01-15T14:30:00Z",
      "priority": "high"
    },
    "routeActivated": true,
    "dispatchedAt": "2024-01-15T14:20:00Z"
  }
}
```

**Expected Behavior:**
- ✓ Vehicle status changes to "responding"
- ✓ Green corridor automatically activated
- ✓ All signals in path turn green
- ✓ 4 WebSocket events emitted:
  - `green_corridor_activated`
  - Multiple `emergency_signal_activated` (one per signal)
  - `dispatch_notification` (to command center)

**Test Cases:**
```
✓ Valid dispatch with all fields
✓ Dispatch overrides existing route
✓ Missing destination → 400 error
✓ Invalid vehicleId → 404 error
✓ Requires authentication → 401 if no token
```

---

### 3. UPDATE REAL-TIME LOCATION

**Endpoint:** `POST /api/emergency-vehicles/:vehicleId/update-location`

**Description:** Update vehicle location and trigger traffic analysis

**Request (Every 5-10 seconds):**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/update-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 18.5240,
    "longitude": 73.8570,
    "address": "Main Street near Signal SIG001",
    "speed": 52
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "latitude": 18.5240,
    "longitude": 73.8570,
    "address": "Main Street near Signal SIG001",
    "updateTime": "2024-01-15T14:20:30Z"
  }
}
```

**Auto-Rerouting Behavior:**
When traffic is detected ahead, the system automatically:
1. Detects accident/congestion at upcoming signals
2. Calculates alternative routes (left, right, bypass)
3. Scores routes by travel time and congestion
4. **Automatically applies** the best alternative
5. Emits `emergency_reroute_applied` WebSocket event
6. Notifies dispatch center

**No manual action required by dispatch!**

**WebSocket Events Emitted:**
```javascript
// If traffic is detected
{
  "event": "traffic_ahead_detected",
  "vehicleId": "AMB001",
  "trafficIssuesFound": 2,
  "issues": [
    {
      "type": "accident",
      "signalId": "SIG003",
      "congestionLevel": "critical"
    }
  ]
}

// If reroute is applied
{
  "event": "emergency_reroute_applied",
  "vehicleId": "AMB001",
  "reason": "traffic_congestion",
  "oldRoute": ["SIG001", "SIG002", "SIG003"],
  "newRoute": ["SIG001", "SIG005", "SIG006", "SIG007"],
  "rerouteCount": 1
}

// Location update broadcast
{
  "event": "emergency_location_update",
  "vehicleId": "AMB001",
  "location": { "latitude": 18.5240, "longitude": 73.8570, "speed": 52 },
  "timestamp": "2024-01-15T14:20:30Z"
}
```

**Test Cases:**
```
✓ Location update triggers traffic analysis
✓ Auto-rerouting when congestion detected
✓ Multiple reroutes on single journey
✓ Speed update
✓ Missing coordinates → 400 error
✓ Non-existent vehicle → 404 error
```

**Simulation Script:**
```javascript
// Update location every 5 seconds for testing
setInterval(async () => {
  const newLat = 18.5234 + (Math.random() * 0.001);
  const newLng = 73.8567 + (Math.random() * 0.001);
  
  await fetch('http://localhost:5000/api/emergency-vehicles/AMB001/update-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: newLat,
      longitude: newLng,
      speed: 40 + Math.random() * 20
    })
  });
}, 5000);
```

---

### 4. MANUALLY ACTIVATE GREEN CORRIDOR

**Endpoint:** `POST /api/emergency-vehicles/:vehicleId/activate-corridor`

**Description:** Manually activate green corridor (used if auto-dispatch doesn't trigger)

**Request:**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/activate-corridor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "signalPath": ["SIG001", "SIG002", "SIG003", "SIG004"]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Green corridor activated successfully",
  "corridor": {
    "vehicleId": "AMB001",
    "signalsInCorridor": 4,
    "status": "active",
    "activatedAt": "2024-01-15T14:20:00Z"
  }
}
```

**Behavior:**
- ✓ All signals in path turn green
- ✓ Vehicle status → "in_transit"
- ✓ Route stored in vehicle document
- ✓ WebSocket events emitted for each signal

**Test Cases:**
```
✓ Valid signal path
✓ Invalid signal ID → 400 error
✓ Empty signal path → 400 error
✓ Corridor already active → 409 conflict
✓ Requires authentication
```

---

### 5. DEACTIVATE GREEN CORRIDOR

**Endpoint:** `POST /api/emergency-vehicles/:vehicleId/deactivate-corridor`

**Description:** Restore signals to normal operation (emergency resolved)

**Request:**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/deactivate-corridor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Green corridor deactivated successfully",
  "corridor": {
    "vehicleId": "AMB001",
    "status": "inactive",
    "deactivatedAt": "2024-01-15T14:45:00Z"
  }
}
```

**Behavior:**
- ✓ All signals restored to normal operation (red/auto mode)
- ✓ Vehicle status → "completed"
- ✓ Corridor deactivation logged
- ✓ `green_corridor_deactivated` event emitted

**Test Cases:**
```
✓ Valid deactivation
✓ Deactivate when no corridor active → 400 error
✓ Requires authentication
```

---

### 6. REQUEST MANUAL REROUTE

**Endpoint:** `POST /api/emergency-vehicles/:vehicleId/reroute`

**Description:** Manually request reroute (if dispatch center wants to change route)

**Request:**
```bash
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/reroute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "reason": "Road closure due to construction"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Vehicle rerouted successfully",
  "reroute": {
    "vehicleId": "AMB001",
    "reason": "traffic_congestion",
    "oldRoute": ["SIG001", "SIG002", "SIG003"],
    "newRoute": ["SIG001", "SIG005", "SIG006", "SIG007"],
    "rerouteNumber": 2,
    "trafficSaved": true
  }
}
```

**Behavior:**
- ✓ System analyzes traffic ahead
- ✓ Calculates 3 alternative routes
- ✓ Selects best route
- ✓ Deactivates old corridor
- ✓ Activates new corridor
- ✓ Notifies dispatch center
- ✓ Increments reroute counter

**Test Cases:**
```
✓ Valid reroute request
✓ No traffic → 400 error (reroute not needed)
✓ No alternatives available → 400 error
✓ Vehicle not in transit → 400 error
✓ Requires authentication
```

---

### 7. GET ALL ACTIVE VEHICLES

**Endpoint:** `GET /api/emergency-vehicles/active`

**Description:** List all currently active emergency vehicles

**Request:**
```bash
curl -X GET http://localhost:5000/api/emergency-vehicles/active \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "count": 2,
  "vehicles": [
    {
      "vehicleId": "AMB001",
      "type": "ambulance",
      "status": "in_transit",
      "location": {
        "latitude": 18.5240,
        "longitude": 73.8570,
        "address": "Main Street",
        "updateTime": "2024-01-15T14:20:30Z"
      },
      "destination": {
        "coordinates": {
          "latitude": 18.5450,
          "longitude": 73.8700
        },
        "address": "City Hospital",
        "eta": "2024-01-15T14:30:00Z"
      },
      "corridorActive": true
    },
    {
      "vehicleId": "FIRE001",
      "type": "fire_truck",
      "status": "responding",
      "location": {...},
      "destination": {...},
      "corridorActive": true
    }
  ]
}
```

**Test Cases:**
```
✓ Returns all active vehicles (status: responding OR in_transit)
✓ Excludes idle/completed vehicles
✓ Returns accurate count
```

---

### 8. GET VEHICLE DETAILED STATUS

**Endpoint:** `GET /api/emergency-vehicles/:vehicleId/status`

**Description:** Get complete status of specific vehicle

**Request:**
```bash
curl -X GET http://localhost:5000/api/emergency-vehicles/AMB001/status \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "vehicle": {
    "vehicleId": "AMB001",
    "type": "ambulance",
    "status": "in_transit",
    "currentLocation": {
      "latitude": 18.5240,
      "longitude": 73.8570,
      "address": "Main Street near Signal SIG001",
      "updateTime": "2024-01-15T14:20:30Z"
    },
    "destination": {
      "coordinates": { "latitude": 18.5450, "longitude": 73.8700 },
      "address": "City Hospital",
      "eta": "2024-01-15T14:30:00Z",
      "priority": "high"
    },
    "speed": {
      "current": 52,
      "recommended": 50,
      "max": 80
    },
    "greenCorridor": {
      "active": true,
      "signalsCount": 4,
      "activatedAt": "2024-01-15T14:20:00Z"
    },
    "route": {
      "currentIndex": 1,
      "totalSignals": 4,
      "rerouteCount": 1
    },
    "trafficAhead": {
      "count": 0,
      "details": []
    },
    "routeStatus": {
      "vehicleId": "AMB001",
      "vehicleType": "ambulance",
      "currentRouteIndex": 1,
      "totalSignalsInRoute": 4,
      "completedSegments": 1,
      "remainingSegments": 3,
      "progressPercentage": 25,
      "trafficAheadCount": 0,
      "totalReroutes": 1,
      "currentSpeed": 52,
      "recommendedSpeed": 50,
      "estimatedArrival": "2024-01-15T14:30:00Z",
      "lastUpdated": "2024-01-15T14:20:30Z"
    }
  }
}
```

**Test Cases:**
```
✓ Valid vehicle returns complete status
✓ Non-existent vehicle → 404 error
✓ Includes real-time route status
✓ Traffic ahead updates in real-time
```

---

### 9. GET CORRIDOR STATISTICS

**Endpoint:** `GET /api/emergency-vehicles/:vehicleId/corridor-stats`

**Description:** Get performance metrics for completed corridors

**Request:**
```bash
curl -X GET http://localhost:5000/api/emergency-vehicles/AMB001/corridor-stats \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "vehicleId": "AMB001",
  "statistics": {
    "totalCorridorsActivated": 1,
    "averageResponseTime": 4.5,
    "onTimeArrivalRate": "100%",
    "averageSignalWaitTime": 1.2,
    "totalDistanceTraveled": 8.5,
    "totalTimeTaken": 620,
    "delaysDue": {
      "traffic": 0,
      "signalMalfunction": 0,
      "accidents": 0
    }
  }
}
```

**Test Cases:**
```
✓ Returns valid statistics
✓ Non-existent vehicle → 404 error
✓ Metrics accurate for journey
```

---

## WebSocket Testing

Connect to WebSocket and listen for real-time events:

```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to emergency vehicle system');
});

// Listen for all emergency events
socket.on('green_corridor_activated', (data) => {
  console.log('Green Corridor Activated:', data);
});

socket.on('emergency_signal_activated', (data) => {
  console.log('Signal Turned Green:', data);
});

socket.on('emergency_signal_preparing', (data) => {
  console.log('Signal Preparing (Yellow):', data);
});

socket.on('green_corridor_progress', (data) => {
  console.log('Corridor Progress:', data);
});

socket.on('green_corridor_deactivated', (data) => {
  console.log('Corridor Deactivated:', data);
});

socket.on('traffic_ahead_detected', (data) => {
  console.log('Traffic Detected:', data);
});

socket.on('emergency_reroute_applied', (data) => {
  console.log('Vehicle Rerouted:', data);
});

socket.on('emergency_location_update', (data) => {
  console.log('Location Updated:', data);
});

socket.on('dispatch_notification', (data) => {
  console.log('Dispatch Notification:', data);
});
```

---

## Complete Test Scenario

**Full end-to-end test simulating real emergency:**

```bash
# 1. Register ambulance
curl -X POST http://localhost:5000/api/emergency-vehicles/register \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"AMB001","type":"ambulance","currentLocation":{"latitude":18.5234,"longitude":73.8567,"address":"Station"}}'

# 2. Dispatch to hospital
curl -X POST http://localhost:5000/api/emergency-vehicles/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"vehicleId":"AMB001","destination":{"latitude":18.5450,"longitude":73.8700,"address":"Hospital"}}'
# ✓ Green corridor activated
# ✓ Signals turn green

# 3. Update location every 5 seconds (simulate movement)
for i {1..20}; do
  curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/update-location \
    -H "Content-Type: application/json" \
    -d "{\"latitude\":$((18.5234 + i*0.001)),\"longitude\":73.8567,\"speed\":50}"
  sleep 5
done

# 4. Get status updates
curl -X GET http://localhost:5000/api/emergency-vehicles/AMB001/status

# 5. Deactivate when arrived
curl -X POST http://localhost:5000/api/emergency-vehicles/AMB001/deactivate-corridor \
  -H "Authorization: Bearer YOUR_TOKEN"
# ✓ Signals restored to normal

# 6. Get final statistics
curl -X GET http://localhost:5000/api/emergency-vehicles/AMB001/corridor-stats
```

---

## Expected Test Results

All endpoints should:
- ✅ Return appropriate HTTP status codes (200, 201, 400, 401, 404, 409)
- ✅ Emit WebSocket events in real-time
- ✅ Update database correctly
- ✅ Validate all inputs
- ✅ Handle errors gracefully
- ✅ Support concurrent emergency vehicles

## Debugging Tips

1. **Check logs** for errors
2. **Monitor WebSocket events** in browser console
3. **Verify database** collections have required fields
4. **Ensure signals** exist in TrafficSignal collection
5. **Check authentication token** validity

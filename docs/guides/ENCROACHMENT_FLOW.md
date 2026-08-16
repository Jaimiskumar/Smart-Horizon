# Encroachment Monitoring System Flow

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAMERA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  CAM001    CAM002    CAM003    CAM004    CAM005                 │
│  MG Road   Brigade   Commercial Indiranagar Koramangala         │
│  (Footpath)(Road)    (No-Park)  (Restricted)(Footpath)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AI DETECTION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  • Object Detection (Vendor/Hawker/Cart/Vehicle/Obstacle)       │
│  • License Plate Recognition (for vehicles)                     │
│  • Zone Violation Detection                                     │
│  • Duration Tracking                                            │
│  • Image Capture & Assignment                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                                │
│                  (server-standalone.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  In-Memory Storage                                        │  │
│  │  • encroachments[] array                                  │  │
│  │  • Real-time status tracking                              │  │
│  │  • Image URL mapping                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Image Mapping Function                                   │  │
│  │  getImageForObject(type, zone)                            │  │
│  │  • Vendor → hawker1.jpg, hawker2.jpg                      │  │
│  │  • Hawker → hawker1.jpg, hawker2.jpg                      │  │
│  │  • Cart → hawker1.jpg                                     │  │
│  │  • Vehicle → hawker2.jpg                                  │  │
│  │  • Obstacle → hawker1.jpg                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints                                       │  │
│  │  GET  /api/encroachments          (List all)             │  │
│  │  GET  /api/encroachments/:id      (Get single)           │  │
│  │  PUT  /api/encroachments/:id/resolve (Mark resolved)     │  │
│  │  PUT  /api/encroachments/:id/ignore  (Dismiss)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Socket.io Events                                         │  │
│  │  • encroachment-detected   (New detection)               │  │
│  │  • encroachment-warning    (5 min threshold)             │  │
│  │  • encroachment-alert      (10 min threshold)            │  │
│  │  • encroachment-resolved   (Admin action)                │  │
│  │  • encroachment-ignored    (Admin action)                │  │
│  │  • encroachment-update     (Periodic refresh)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Simulation Loop (Every 10 seconds)                       │  │
│  │  1. Update duration for active encroachments             │  │
│  │  2. Progress status (detected→warning→alert)             │  │
│  │  3. 20% chance: Create new detection                     │  │
│  │  4. Emit real-time updates                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND CLIENT                               │
│              (EncroachmentMonitoring.jsx)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Statistics Dashboard                                     │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │  │
│  │  │Total │ │Active│ │Alerts│ │Resolv│                    │  │
│  │  │  12  │ │  5   │ │  2   │ │  7   │                    │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Filter Buttons                                           │  │
│  │  [All] [Active] [Detected] [Warning] [Alert] [Resolved]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Encroachment Cards (with Images)                        │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ ┌──────────┐  ┌──────────────────────────────────┐ │  │  │
│  │  │ │          │  │ [Status Badge]                    │ │  │  │
│  │  │ │  CAMERA  │  │ VENDOR in footpath               │ │  │  │
│  │  │ │  FEED    │  │                                   │ │  │  │
│  │  │ │  IMAGE   │  │ 📍 MG Road                        │ │  │  │
│  │  │ │          │  │ ⏱️  Duration: 5m 30s              │ │  │  │
│  │  │ │ [CAM001] │  │                                   │ │  │  │
│  │  │ │ [HIGH]   │  │ [Resolve] [Ignore]                │ │  │  │
│  │  │ └──────────┘  └──────────────────────────────────┘ │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  (More cards...)                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Real-time Updates                                        │  │
│  │  • Auto-refresh every 5 seconds                          │  │
│  │  • Socket.io connection for instant updates              │  │
│  │  • Smooth animations on changes                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Detection Flow Timeline

```
Time: 0 minutes
┌─────────────────────────────────────────┐
│ 📷 Camera detects object in zone        │
│ Status: DETECTED                        │
│ Color: Yellow                           │
│ Action: Monitor                         │
└─────────────────────────────────────────┘
                 │
                 ▼
Time: 5 minutes
┌─────────────────────────────────────────┐
│ ⚠️  Object still present                │
│ Status: WARNING ISSUED                  │
│ Color: Orange                           │
│ Action: Warning sent to authorities     │
└─────────────────────────────────────────┘
                 │
                 ▼
Time: 10 minutes
┌─────────────────────────────────────────┐
│ 🚨 Object still blocking zone           │
│ Status: ALERT SENT                      │
│ Color: Red                              │
│ Action: High-priority alert dispatched  │
└─────────────────────────────────────────┘
                 │
                 ▼
Admin Action
┌─────────────────────────────────────────┐
│ ✅ Resolved OR ❌ Ignored                │
│ Status: RESOLVED / IGNORED              │
│ Color: Green / Gray                     │
│ Action: Case closed                     │
└─────────────────────────────────────────┘
```

## Image Display Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Detection Created                                         │
│    • Object type identified (vendor/hawker/cart/etc.)       │
│    • Zone determined (footpath/road-lane/etc.)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Image Assignment                                          │
│    • getImageForObject(type, zone) called                   │
│    • Random image selected from pool                        │
│    • Image URL stored with encroachment                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend Receives Data                                    │
│    • Encroachment object includes imageUrl                  │
│    • Example: "/images/encroachment/hawker1.jpg"            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Image Rendering                                           │
│    • <img> tag loads image from public folder               │
│    • Overlays added (Camera ID, Severity)                   │
│    • Fallback if image not found                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Display Result                                            │
│    • User sees camera feed image                            │
│    • Professional card layout                               │
│    • Clear visual context                                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Structure

### Encroachment Object
```javascript
{
  id: "ENC001",                              // Unique identifier
  cameraId: "CAM001",                        // Camera that detected
  location: "MG Road",                       // Location name
  zone: "footpath",                          // Zone type
  detectedObject: "vendor",                  // Object type
  licensePlate: "KA-01-AB-1234",            // For vehicles only
  imageUrl: "/images/encroachment/hawker1.jpg", // 🖼️ Image path
  detectionTime: "2026-03-21T10:30:00Z",    // When detected
  status: "detected",                        // Current status
  stationaryDuration: 180,                   // Seconds stationary
  coordinates: {                             // GPS coordinates
    lat: 12.9716,
    lng: 77.5946
  },
  severity: "medium",                        // Priority level
  notes: "vendor detected in footpath",      // Description
  warningIssuedAt: null,                     // Warning timestamp
  alertSentAt: null,                         // Alert timestamp
  resolvedAt: null                           // Resolution timestamp
}
```

## User Interaction Flow

```
Admin Login
    │
    ▼
Navigate to "Encroachment Monitor" Tab
    │
    ▼
View Dashboard
    ├─→ See Statistics (Total, Active, Alerts, Resolved)
    ├─→ View Camera Feed Images
    ├─→ Check Status of Each Case
    └─→ Monitor Real-time Updates
    │
    ▼
Filter Encroachments (Optional)
    ├─→ All
    ├─→ Active
    ├─→ Detected
    ├─→ Warning Issued
    ├─→ Alert Sent
    ├─→ Resolved
    └─→ Ignored
    │
    ▼
Review Specific Encroachment
    ├─→ View Camera Feed Image
    ├─→ Check Location & Duration
    ├─→ Assess Severity
    └─→ Read Notes
    │
    ▼
Take Action
    ├─→ Click "Resolve" (if cleared)
    │   └─→ Status → Resolved
    │       └─→ Removed from active list
    │
    └─→ Click "Ignore" (if false positive)
        └─→ Status → Ignored
            └─→ Removed from active list
```

## System Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Current System                            │
├─────────────────────────────────────────────────────────────┤
│  • Traffic Monitoring                                        │
│  • Parking Management                                        │
│  • Violation Management                                      │
│  • Emergency Control                                         │
│  • Analytics                                                 │
│  • Encroachment Monitor ← NEW                               │
└─────────────────────────────────────────────────────────────┘

Future Integration Possibilities:
├─→ Fine Management (auto-issue fines for violations)
├─→ Mobile App (field officer notifications)
├─→ GIS Mapping (visualize on city map)
├─→ Analytics Dashboard (trends and patterns)
└─→ Reporting System (generate reports)
```

## Technology Stack

```
Frontend
├─→ React (UI framework)
├─→ TailwindCSS (styling)
├─→ Lucide Icons (icons)
├─→ Socket.io-client (real-time)
└─→ Vite (build tool)

Backend
├─→ Node.js (runtime)
├─→ Express (web framework)
├─→ Socket.io (real-time)
├─→ JWT (authentication)
└─→ In-memory storage (demo)

Images
├─→ JPG/PNG format
├─→ Public folder serving
└─→ Fallback handling
```

---

**This diagram shows the complete flow from camera detection to admin action, including the new image display feature!**

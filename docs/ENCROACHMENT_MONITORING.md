# Encroachment & Obstruction Monitoring Module

## Overview
The Encroachment & Obstruction Monitoring Module is an AI-powered system that uses CCTV camera feeds and computer vision to detect unauthorized hawkers, vendors, and road obstructions in real-time.

## Features

### Real-time Detection
- Continuous monitoring of designated no-encroachment zones
- AI-based object detection using computer vision
- Automatic identification of:
  - Unauthorized vendors and hawkers
  - Carts and temporary structures
  - Illegally parked vehicles
  - Road obstructions and obstacles

### Zone Management
The system monitors four types of restricted zones:
1. **Footpaths** - Pedestrian walkways
2. **Road Lanes** - Active traffic lanes
3. **No-Parking Zones** - Designated no-parking areas
4. **Restricted Areas** - Government-restricted zones

### Alert System

#### Three-Stage Alert Process
1. **Detection** (0-5 minutes)
   - Object detected in restricted zone
   - System begins tracking stationary duration
   - Status: "Detected"

2. **Warning Issued** (5-10 minutes)
   - Object remains stationary for 5+ minutes
   - Warning notification sent to authorities
   - Status: "Warning Issued"

3. **Alert Sent** (10+ minutes)
   - Object still present after 10 minutes
   - High-priority alert sent to enforcement teams
   - Status: "Alert Sent"

### Severity Levels
- **High Priority**: Road lanes and restricted areas
- **Medium Priority**: Footpaths and no-parking zones
- **Low Priority**: Minor obstructions

## Technical Implementation

### Backend Components

#### Data Model
```javascript
{
  id: "ENC001",
  cameraId: "CAM001",
  location: "MG Road",
  zone: "footpath",
  detectedObject: "vendor",
  licensePlate: "KA-01-AB-1234", // For vehicles only
  imageUrl: "/api/camera-feed/CAM001/snapshot",
  detectionTime: "2026-03-21T10:30:00Z",
  status: "detected",
  stationaryDuration: 180, // seconds
  coordinates: { lat: 12.9716, lng: 77.5946 },
  severity: "medium",
  notes: "vendor detected in footpath"
}
```

#### API Endpoints

**Get All Encroachments**
```
GET /api/encroachments
Authorization: Bearer <token>
```

**Get Single Encroachment**
```
GET /api/encroachments/:id
Authorization: Bearer <token>
```

**Resolve Encroachment**
```
PUT /api/encroachments/:id/resolve
Authorization: Bearer <token>
Role: Admin only
```

**Ignore Encroachment**
```
PUT /api/encroachments/:id/ignore
Authorization: Bearer <token>
Role: Admin only
```

### Frontend Components

#### Admin Dashboard Tab
Located at: `/admin/encroachment`

**Features:**
- Real-time encroachment list
- Status filtering (All, Active, Detected, Warning, Alert, Resolved, Ignored)
- Statistics dashboard showing:
  - Total detections
  - Active cases
  - Alerts sent
  - Resolved cases
- Action buttons for each encroachment:
  - Resolve: Mark as cleared
  - Ignore: Dismiss false positive

#### Visual Indicators
- Color-coded status badges
- Severity level indicators
- Duration tracking
- Location mapping
- Camera feed references

### Real-time Updates

The system uses Socket.io for real-time communication:

**Events:**
- `encroachment-detected`: New encroachment found
- `encroachment-warning`: Warning threshold reached
- `encroachment-alert`: Alert threshold reached
- `encroachment-resolved`: Case resolved by admin
- `encroachment-ignored`: Case dismissed by admin
- `encroachment-update`: Periodic status updates

## AI Detection Simulation

The current implementation simulates AI camera detection with:
- Random object detection from camera feeds
- Automatic status progression based on duration
- License plate recognition for vehicles
- Coordinate mapping for location tracking

### Future AI Integration
For production deployment, integrate with:
- YOLOv8 or similar object detection models
- License plate recognition (LPR) systems
- Real CCTV camera feeds
- Geographic Information Systems (GIS)

## Usage Guide

### For Administrators

1. **Access the Module**
   - Login to admin dashboard
   - Navigate to "Encroachment Monitor" tab

2. **Monitor Active Cases**
   - View real-time detections
   - Filter by status or severity
   - Check location and duration

3. **Take Action**
   - Click "Resolve" when obstruction is cleared
   - Click "Ignore" for false positives
   - Review statistics for trends

4. **Alert Response**
   - High-priority alerts require immediate attention
   - Dispatch enforcement teams to location
   - Update status after resolution

### Best Practices

1. **Regular Monitoring**
   - Check dashboard every 15-30 minutes
   - Prioritize high-severity alerts
   - Respond to warnings before they escalate

2. **False Positive Management**
   - Use "Ignore" for non-issues
   - Document patterns for AI training
   - Adjust detection zones if needed

3. **Enforcement Coordination**
   - Share real-time data with field teams
   - Use location coordinates for navigation
   - Verify resolution before closing cases

## Benefits

### For Traffic Management
- Improved traffic flow
- Reduced congestion from obstructions
- Better lane utilization
- Enhanced road safety

### For City Administration
- Automated monitoring (24/7)
- Data-driven enforcement
- Reduced manual inspection needs
- Evidence-based decision making

### For Citizens
- Clearer footpaths and roads
- Safer pedestrian zones
- Better traffic conditions
- Fair enforcement

## Statistics & Analytics

The system tracks:
- Total detections per day/week/month
- Average resolution time
- Most affected locations
- Peak obstruction hours
- Enforcement effectiveness

## Integration Points

### Current Integrations
- Admin dashboard
- Real-time notification system
- Authentication & authorization

### Future Integrations
- Mobile app for field officers
- SMS/Email alerts
- GIS mapping systems
- Traffic analytics platform
- Fine management system

## Configuration

### Camera Setup
Add cameras in `server-standalone.js`:
```javascript
const CAMERA_LOCATIONS = [
  { cameraId: 'CAM001', location: 'MG Road', zone: 'footpath' },
  // Add more cameras
];
```

### Timing Thresholds
Adjust in `encroachmentDetector.js`:
```javascript
this.detectionThreshold = 300; // 5 minutes
this.warningPeriod = 300; // 5 minutes
```

## Troubleshooting

### Common Issues

**No detections showing:**
- Check if backend simulation is running
- Verify API endpoint connectivity
- Check authentication token

**Real-time updates not working:**
- Verify Socket.io connection
- Check browser console for errors
- Ensure backend is emitting events

**Actions not working:**
- Verify admin role permissions
- Check API endpoint responses
- Review browser network tab

## Future Enhancements

1. **AI Model Integration**
   - Real YOLOv8 object detection
   - Custom model training
   - Improved accuracy

2. **Advanced Features**
   - Automatic fine issuance
   - Repeat offender tracking
   - Predictive analytics
   - Heat map visualization

3. **Mobile Application**
   - Field officer app
   - Real-time notifications
   - Photo evidence upload
   - GPS-based navigation

4. **Reporting**
   - Daily/weekly reports
   - Trend analysis
   - Performance metrics
   - Export capabilities

## Support

For issues or questions:
- Check system logs
- Review API documentation
- Contact system administrator
- Submit bug reports

---

**Version:** 1.0.0  
**Last Updated:** March 21, 2026  
**Module Status:** Active

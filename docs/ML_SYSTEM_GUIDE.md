# ML-Based Traffic & Parking Enforcement System - Implementation Guide

## System Overview

This comprehensive ML-based system integrates computer vision, deep learning, and real-time processing for:

- **Vehicle Detection & Classification**: Identify vehicle types (2-wheeler, 4-wheeler, truck, bus)
- **Helmet Detection**: Detect missing helmets on 2-wheelers
- **Number Plate Recognition**: Extract vehicle registration numbers using OCR
- **Congestion Detection**: Real-time traffic congestion analysis and adaptive signal timing
- **Speed Detection**: Identify overspeeding vehicles
- **Signal Violation Detection**: Detect vehicles crossing red/yellow signals
- **Street Encroachment**: Detect hawkers, vendors, and pedestrian gatherings blocking roads
- **Wrong Parking Detection**: Identify illegally parked vehicles

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CCTV Camera Feed                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              ML Detection Processing Service                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Vehicle Detection (YOLO + ResNet)                 │   │
│  │ 2. Helmet Detection (Custom CNN)                     │   │
│  │ 3. Number Plate OCR (EasyOCR/PaddleOCR)              │   │
│  │ 4. Speed Detection (Motion Analysis)                 │   │
│  │ 5. Signal Violation (Zone Detection)                 │   │
│  │ 6. Crowd Detection (YOLO + People Counter)           │   │
│  │ 7. Congestion Analysis (Vehicle Density)             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
┌─────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│  Database  │ │ Real-time │ │  Frontend  │
│  Storage   │ │ WebSocket │ │ Dashboard  │
└────────────┘ │ Alerts    │ └────────────┘
               └───────────┘
```

## Database Models

### 1. Camera Model
Stores camera registration and ML configuration.

```javascript
{
  cameraId: "CAM-001",
  cameraName: "Main Signal - Market Area",
  location: "Market Junction",
  latitude: 17.6756,
  longitude: 75.8986,
  cameraType: "fixed", // fixed, ptz, thermal, high_speed
  streamUrl: "rtsp://camera-ip:554/stream",
  mlModelsEnabled: {
    vehicleDetection: true,
    helmetDetection: true,
    numberPlateExtraction: true,
    crowdDetection: true,
    speedDetection: true,
    wrongParkingDetection: true
  },
  status: "active"
}
```

### 2. Traffic Violation Model
Records speeding, signal breaking, and other traffic violations.

```javascript
{
  vehicleNumber: "MH12AB1234",
  violationType: "speeding", // speeding, signal_breaking, lane_violation
  speedRecorded: 75,
  speedLimit: 60,
  signalLocation: "Market Junction",
  cameraId: "CAM-001",
  imageUrl: "s3://violations/image.jpg",
  severity: "high",
  fineAmount: 1500,
  status: "pending"
}
```

### 3. Helmet Violation Model
Specific records for helmet violations on 2-wheelers.

```javascript
{
  vehicleNumber: "MH12XY9876",
  helmetStatus: "no_helmet",
  signalLocation: "Main Signal",
  cameraId: "CAM-001",
  fineAmount: 500,
  status: "pending"
}
```

### 4. Street Encroachment Model
Records hawkers, vendors, and crowd gatherings.

```javascript
{
  encroachmentType: "vendor", // vendor, hawker, pedestrian_gathering
  location: "Market Area",
  crowdSize: 25,
  roadBlockagePercentage: 45,
  cameraId: "CAM-001",
  severity: "high",
  status: "detected"
}
```

### 5. ML Detection Log Model
Stores all detection events for audit and analysis.

```javascript
{
  cameraId: "CAM-001",
  detectionType: "vehicle_detected",
  detectionDetails: {
    vehicleClass: "2-wheeler",
    confidence: 0.92,
    boundingBox: { x1: 100, y1: 150, x2: 250, y2: 350 }
  },
  processingStatus: "completed"
}
```

## API Endpoints

### Camera Management

#### Register Camera
```
POST /api/cameras
Content-Type: application/json
Authorization: Bearer {token}

{
  "cameraId": "CAM-001",
  "cameraName": "Main Signal - Market",
  "location": "Market Junction",
  "latitude": 17.6756,
  "longitude": 75.8986,
  "streamUrl": "rtsp://camera-ip:554/stream",
  "mlModelsEnabled": {
    "vehicleDetection": true,
    "helmetDetection": true,
    "numberPlateExtraction": true,
    "crowdDetection": true
  }
}
```

#### Get All Cameras
```
GET /api/cameras?status=active&limit=50&page=1
Authorization: Bearer {token}
```

#### Update Camera Settings
```
PATCH /api/cameras/{cameraId}
Authorization: Bearer {token}

{
  "status": "maintenance",
  "mlModelsEnabled": {
    "vehicleDetection": true,
    "helmetDetection": false
  }
}
```

### ML Detection Processing

#### Process Camera Frame
```
POST /api/ml-detection/process-frame
Content-Type: application/json

{
  "cameraId": "CAM-001",
  "frameUrl": "https://s3.bucket.com/frame.jpg",
  "location": "Market Junction",
  "latitude": 17.6756,
  "longitude": 75.8986,
  "signalStatus": "red",
  "speedLimit": 60,
  "fps": 30
}

Response:
{
  "violationsDetected": 3,
  "detections": {
    "vehicles": [...],
    "helmets": [...],
    "plates": [...],
    "speeding": [...],
    "signalViolations": [...],
    "crowd": {...},
    "congestion": {...}
  },
  "violations": [
    { "type": "helmet", "violationId": "..." },
    { "type": "speeding", "violationId": "..." }
  ]
}
```

### Traffic Violations

#### Create Traffic Violation
```
POST /api/violations/traffic
Authorization: Bearer {token}

{
  "vehicleNumber": "MH12AB1234",
  "violationType": "speeding",
  "speedRecorded": 85,
  "speedLimit": 60,
  "signalLocation": "Market Junction",
  "cameraId": "CAM-001",
  "vehicleClass": "4-wheeler",
  "fineAmount": 1500,
  "severity": "high"
}
```

#### Get All Violations
```
GET /api/violations/traffic?status=pending&severity=high&limit=50
Authorization: Bearer {token}
```

#### Get Violation Statistics
```
GET /api/violations/statistics?cameraId=CAM-001
Authorization: Bearer {token}
```

### Helmet Violations

#### Record Helmet Violation
```
POST /api/violations/helmet
Authorization: Bearer {token}

{
  "vehicleNumber": "MH12XY9876",
  "helmetStatus": "no_helmet",
  "signalLocation": "Main Signal",
  "cameraId": "CAM-001",
  "imageUrl": "s3://violations/helmet.jpg"
}
```

### Street Encroachment

#### Create Encroachment Record
```
POST /api/street-encroachment
Authorization: Bearer {token}

{
  "encroachmentType": "vendor",
  "location": "Market Area",
  "latitude": 17.6756,
  "longitude": 75.8986,
  "cameraId": "CAM-001",
  "crowdSize": 20,
  "roadBlockagePercentage": 45,
  "imageUrl": "s3://encroachment/image.jpg",
  "severity": "high"
}
```

#### Get Encroachments
```
GET /api/street-encroachment?status=detected&severity=high
Authorization: Bearer {token}
```

#### Send Alert to Authorities
```
POST /api/street-encroachment/{id}/send-alert
Authorization: Bearer {token}
```

### Traffic Signals

#### Get Signal Status
```
GET /api/traffic-signals?location=Market
Authorization: Bearer {token}
```

#### Analyze Congestion
```
POST /api/traffic-signals/{signalId}/analyze-congestion
Authorization: Bearer {token}

{
  "vehicleCount": 450,
  "congestionLevel": 78
}

Response:
{
  "recommendedTiming": {
    "duration": 45,
    "confidence": 0.92,
    "algorithm": "adaptive_congestion_based"
  }
}
```

#### Apply Adaptive Signal Timing
```
POST /api/traffic-signals/{signalId}/apply-adaptive-timing
Authorization: Bearer {token}

{
  "recommendedDuration": 45,
  "congestionLevel": 78
}
```

#### Toggle Adaptive Control
```
PATCH /api/traffic-signals/{signalId}/toggle-adaptive-control
Authorization: Bearer {token}

{
  "adaptiveControl": true
}
```

## ML Model Integration

### Using Python ML Backend

Create a separate Python service (FastAPI/Flask) that handles model inference:

```python
# ml_service.py
from fastapi import FastAPI
from ultralytics import YOLO
import easyocr
import cv2

app = FastAPI()

# Load models
vehicle_model = YOLO("yolov8n.pt")
helmet_model = YOLO("helmet_detection_model.pt")
ocr_reader = easyocr.Reader(['en'])

@app.post("/detect/vehicles")
async def detect_vehicles(frame_url: str, confidence_threshold: float):
    # Download frame
    image = download_frame(frame_url)
    
    # Run detection
    results = vehicle_model.predict(image, conf=confidence_threshold)
    
    # Parse results
    detections = []
    for result in results[0].boxes:
        detections.append({
            "class": int(result.cls),
            "confidence": float(result.conf),
            "bbox": result.xyxy[0].tolist()
        })
    
    return {"detections": detections}

@app.post("/ocr/number-plate")
async def extract_number_plate(frame_url: str, bbox: dict):
    image = download_frame(frame_url)
    
    # Crop to bounding box
    x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
    roi = image[int(y1):int(y2), int(x1):int(x2)]
    
    # OCR
    results = ocr_reader.readtext(roi)
    plate_number = ''.join([text[1] for text in results])
    
    return {
        "plate_number": plate_number,
        "confidence": sum([text[2] for text in results]) / len(results) if results else 0
    }
```

### Python Service Endpoint Configuration

Update `.env`:
```
ML_BACKEND_URL=http://localhost:8000
ML_API_TIMEOUT=30000
```

## Real-Time Alerts via WebSocket

Events emitted to connected clients:

```javascript
// Helmet violation detected
io.emit('helmet_violation_detected', {
  cameraId: 'CAM-001',
  count: 2,
  timestamp: new Date()
});

// Speeding detected
io.emit('speeding_detected', {
  cameraId: 'CAM-001',
  count: 1,
  maxSpeed: 85,
  speedLimit: 60
});

// Signal violation
io.emit('signal_violation_detected', {
  cameraId: 'CAM-001',
  count: 3,
  signal: 'red'
});

// Street encroachment
io.emit('street_encroachment_detected', {
  cameraId: 'CAM-001',
  crowdSize: 25,
  blockagePercentage: 45
});

// High congestion
io.emit('high_congestion_alert', {
  cameraId: 'CAM-001',
  congestionLevel: 85,
  vehicleCount: 650
});

// Signal timing adjustment
io.emit('signal_timing_adjusted', {
  signalId: 'SIGNAL-001',
  oldDuration: 30,
  newDuration: 45,
  congestionLevel: 78
});
```

## Dashboard Integration

### Admin Dashboard Sections

1. **Traffic Monitoring**
   - Real-time signal status
   - Congestion levels
   - Adaptive signal timing (ON/OFF)
   - Vehicle count by zone

2. **Violation Management**
   - List of detected violations
   - Filter by type, severity, status
   - Issue challan/fines
   - Fine payment tracking

3. **Illegal Parking Detection**
   - Detection from ML models
   - Wrong parking locations
   - Issue fines

4. **Encroachment Monitoring**
   - Street vendor/hawker detection
   - Crowd gathering alerts
   - Send authorities notifications
   - Track resolution

5. **Test

ing**
   - Camera health status
   - ML model confidence scores
   - Detection accuracy metrics
   - Processing time analysis

## Fine Calculation

### Traffic Violations
- Speeding:
  - 10 km/h over limit: ₹500
  - 20 km/h over limit: ₹1,000
  - 30 km/h over limit: ₹1,500
  - 40+ km/h over limit: ₹2,500

- Signal Breaking:
  - Red signal: ₹1,000
  - Yellow signal: ₹500

- Lane Violation: ₹500

### Helmet Violations
- No helmet on 2-wheeler: ₹500

### Parking Violations
- Illegal parking: ₹200-₹1,000 (based on duration)
- Wrong parking: ₹500

## Performance Metrics

### Model Accuracy Targets
- Vehicle Detection: 95%+
- Helmet Detection: 92%+
- Number Plate OCR: 90%+
- Speed Detection: 85%+
- Crowd Detection: 88%+

### Processing Speed
- Frame processing: < 500ms
- Number plate extraction: < 1s
- Crowd analysis: < 300ms

## Deployment

### Requirements
- Node.js 16+
- MongoDB 5+
- Python 3.8+ (for ML models)
- CUDA 11+ (for GPU acceleration)
- 8GB+ RAM minimum

### Recommended Setup
1. Deploy Node.js backend on main server
2. Deploy Python ML service on GPU-enabled machine
3. Setup Redis for caching
4. Configure MongoDB Atlas for cloud database
5. Use S3/Cloud storage for images/videos

## Testing

Send test frame to system:

```bash
curl -X POST http://localhost:5000/api/ml-detection/process-frame \
  -H "Content-Type: application/json" \
  -d '{
    "cameraId": "CAM-001",
    "frameUrl": "https://example.com/frame.jpg",
    "location": "Market Junction",
    "latitude": 17.6756,
    "longitude": 75.8986,
    "signalStatus": "red",
    "speedLimit": 60
  }'
```

## Next Steps

1. **Deploy Python ML backend** with YOLOv8 and EasyOCR
2. **Connect CCTV cameras** and register them in system
3. **Configure detection thresholds** based on local conditions
4. **Set up monitoring dashboard** in frontend
5. **Enable WebSocket alerts** for real-time notifications
6. **Train custom models** on local traffic data for better accuracy
7. **Integrate payment system** for fine collection
8. **Train authorities** on using the system

This comprehensive ML system provides automated enforcement without human intervention, reducing corruption and improving traffic safety and parking management across the city.

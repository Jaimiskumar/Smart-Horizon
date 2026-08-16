# Python ML Service Setup Guide

This guide covers setting up the Python FastAPI backend for ML model inference that integrates with the Node.js traffic management system.

## Prerequisites

- Python 3.8+
- pip (Python package manager)
- CUDA 11+ (for GPU acceleration - optional but recommended)
- At least 4GB RAM (8GB+ recommended for multiple concurrent detections)

## Installation

### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv ml_service_env

# Activate environment
# On Windows:
ml_service_env\Scripts\activate
# On Linux/Mac:
source ml_service_env/bin/activate
```

### 2. Install Dependencies

```bash
pip install fastapi uvicorn python-multipart
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install ultralytics  # YOLOv8
pip install opencv-python
pip install pillow numpy
pip install easyocr  # For number plate OCR
pip install requests
pip install python-dotenv
```

### 3. Download Pre-trained Models

```bash
# Models will be downloaded automatically on first use, or:
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
python -c "from ultralytics import YOLO; YOLO('yolov8m.pt')"

# Download EasyOCR models
python -c "import easyocr; easyocr.Reader(['en'])"
```

## ML Service Implementation

Create `ml_service/main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import easyocr
import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

app = FastAPI(title="ML Traffic Enforcement Service")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load models (lazy loaded on first use)
_vehicle_model = None
_helmet_model = None
_ocr_reader = None

executor = ThreadPoolExecutor(max_workers=4)

def get_vehicle_model():
    global _vehicle_model
    if _vehicle_model is None:
        _vehicle_model = YOLO("yolov8m.pt")
    return _vehicle_model

def get_helmet_model():
    global _helmet_model
    if _helmet_model is None:
        # Use a fine-tuned model if available
        try:
            _helmet_model = YOLO("helmet_detection_model.pt")
        except:
            # Fallback to generic model
            _helmet_model = YOLO("yolov8m.pt")
    return _helmet_model

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(['en'])
    return _ocr_reader

def download_frame(frame_url):
    """Download image from URL"""
    response = requests.get(frame_url, timeout=10)
    image = Image.open(BytesIO(response.content))
    image_array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return image_array

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ML Traffic Enforcement"}

@app.post("/detect/vehicles")
async def detect_vehicles(frame_url: str, confidence_threshold: float = 0.6):
    """
    Detect vehicles in frame using YOLOv8
    Returns vehicle class, confidence, and bounding boxes
    """
    try:
        # Download frame
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Run detection
        model = get_vehicle_model()
        results = model.predict(image, conf=confidence_threshold, verbose=False)
        
        detections = []
        vehicle_classes = {
            0: 'bike',
            1: '2-wheeler',
            2: 'car',
            3: '4-wheeler',
            4: 'truck',
            5: 'bus',
            6: 'auto-rickshaw'
        }
        
        for result in results[0].boxes:
            class_id = int(result.cls[0])
            bbox = result.xyxy[0].tolist()
            
            # Calculate center
            center_x = (bbox[0] + bbox[2]) / 2
            center_y = (bbox[1] + bbox[3]) / 2
            
            detections.append({
                "id": str(len(detections) + 1),
                "class": vehicle_classes.get(class_id, 'unknown'),
                "class_id": class_id,
                "confidence": float(result.conf[0]),
                "bbox": bbox,
                "center_x": center_x,
                "center_y": center_y
            })
        
        logger.info(f"Detected {len(detections)} vehicles in frame {frame_url}")
        
        return {
            "total_detections": len(detections),
            "detections": detections,
            "frame_url": frame_url
        }
    except Exception as e:
        logger.error(f"Vehicle detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/helmet")
async def detect_helmet(frame_url: str, bbox: dict, confidence_threshold: float = 0.7):
    """
    Detect helmet on motorcycle/scooter rider
    Returns helmet_detected (bool) and confidence
    """
    try:
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Crop to vehicle bounding box
        x1, y1, x2, y2 = int(bbox['x1']), int(bbox['y1']), int(bbox['x2']), int(bbox['y2'])
        roi = image[y1:y2, x1:x2]
        
        # Run detection
        model = get_helmet_model()
        results = model.predict(roi, conf=confidence_threshold, verbose=False)
        
        # Check if helmet detected in results
        helmet_detected = len(results[0].boxes) > 0
        confidence = float(max([box.conf[0] for box in results[0].boxes])) if helmet_detected else 0.0
        
        logger.info(f"Helmet detection: {helmet_detected}, Confidence: {confidence}")
        
        return {
            "helmet_detected": helmet_detected,
            "confidence": confidence,
            "helmet_type": "full_face" if helmet_detected else "no_helmet"
        }
    except Exception as e:
        logger.error(f"Helmet detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ocr/number-plate")
async def extract_number_plate(frame_url: str, bbox: dict, confidence_threshold: float = 0.75):
    """
    Extract number plate using OCR
    Returns plate number and confidence
    """
    try:
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Crop to vehicle area
        x1, y1, x2, y2 = int(bbox['x1']), int(bbox['y1']), int(bbox['x2']), int(bbox['y2'])
        roi = image[y1:y2, x1:x2]
        
        # Enhance contrast for better OCR
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced_roi = cv2.merge([l, a, b])
        enhanced_roi = cv2.cvtColor(enhanced_roi, cv2.COLOR_LAB2BGR)
        
        # Run OCR
        reader = get_ocr_reader()
        results = reader.readtext(enhanced_roi)
        
        # Extract text with confidence > threshold
        plates = [text[1] for text in results if text[2] > confidence_threshold]
        plate_number = ''.join(plates).replace(" ", "").upper()
        
        # Calculate average confidence
        confidences = [text[2] for text in results]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        logger.info(f"Number plate extracted: {plate_number}, Confidence: {avg_confidence}")
        
        return {
            "plate_number": plate_number if plate_number else None,
            "confidence": float(avg_confidence),
            "raw_text": ''.join([text[1] for text in results]),
            "detected_text": plates
        }
    except Exception as e:
        logger.error(f"Number plate extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/speed")
async def detect_speed(frame_url: str, bbox: dict, camera_calibration: dict = None, fps: int = 30):
    """
    Detect vehicle speed from frame analysis
    In production, integrate with radar/lidar data
    """
    try:
        # This is a placeholder - actual speed detection requires:
        # 1. Multiple consecutive frames
        # 2. Camera calibration parameters
        # 3. Vehicle tracking across frames
        # 4. Potentially radar/lidar sensor fusion
        
        logger.info(f"Speed detection requested for bbox: {bbox}")
        
        # For now, return a mock value with 'isSpecialized' = False
        # This indicates the system should use other methods (radar)
        return {
            "speed_kmh": 0,
            "confidence": 0.0,
            "use_specialized_detection": False,
            "note": "Speed detection requires radar/lidar integration or multi-frame analysis"
        }
    except Exception as e:
        logger.error(f"Speed detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/violation-zone")
async def check_violation_zone(frame_url: str, bbox: dict, signal_status: str, zone_mask: list = None):
    """
    Check if vehicle is in violation zone (crossing line)
    """
    try:
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Check if center of vehicle is beyond stop line
        center_x = (bbox['x1'] + bbox['x2']) / 2
        
        # Stop line is typically at 80% of frame width for approaching vehicles
        stop_line_threshold = image.shape[1] * 0.8
        
        in_violation_zone = center_x > stop_line_threshold
        
        logger.info(f"Violation zone check: {in_violation_zone} for signal {signal_status}")
        
        return {
            "in_violation_zone": in_violation_zone,
            "center_position": center_x,
            "stop_line_threshold": stop_line_threshold
        }
    except Exception as e:
        logger.error(f"Violation zone detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/crowd")
async def detect_crowd(frame_url: str, confidence_threshold: float = 0.6):
    """
    Detect crowd/pedestrian gatherings
    """
    try:
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Use YOLO to detect people
        model = get_vehicle_model()
        results = model.predict(image, conf=confidence_threshold, verbose=False, classes=0)  # Class 0 = person
        
        crowd_size = len(results[0].boxes)
        crowd_detected = crowd_size > 5
        
        # Estimate road blockage based on crowd bounding box areas
        total_crowd_area = 0
        crowd_locations = []
        
        for box in results[0].boxes:
            bbox = box.xyxy[0].tolist()
            area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            total_crowd_area += area
            crowd_locations.append({
                "x": (bbox[0] + bbox[2]) / 2,
                "y": (bbox[1] + bbox[3]) / 2,
                "width": bbox[2] - bbox[0],
                "height": bbox[3] - bbox[1]
            })
        
        frame_area = image.shape[0] * image.shape[1]
        blockage_percentage = min(100, (total_crowd_area / frame_area) * 100)
        
        logger.info(f"Crowd detected: {crowd_size} people, Blockage: {blockage_percentage}%")
        
        return {
            "crowd_detected": crowd_detected,
            "crowd_size": crowd_size,
            "road_blockage_percentage": float(blockage_percentage),
            "crowd_locations": crowd_locations,
            "confidence": float(max([box.conf[0] for box in results[0].boxes])) if crowd_size > 0 else 0.0
        }
    except Exception as e:
        logger.error(f"Crowd detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/hawkers")
async def detect_hawkers(frame_url: str, confidence_threshold: float = 0.65):
    """
    Detect hawkers/vendors (similar to crowd detection but with merchandise analysis)
    """
    try:
        # For now, use crowd detection as basis
        image = await asyncio.to_thread(download_frame, frame_url)
        model = get_vehicle_model()
        
        # Detect people (class 0)
        results = model.predict(image, conf=confidence_threshold, verbose=False, classes=0)
        
        hawker_count = len(results[0].boxes)
        hawkers_detected = hawker_count > 3
        
        # Estimate blockage
        total_area = 0
        for box in results[0].boxes:
            bbox = box.xyxy[0].tolist()
            area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            total_area += area
        
        frame_area = image.shape[0] * image.shape[1]
        blockage = min(100, (total_area / frame_area) * 100)
        
        return {
            "hawkers_detected": hawkers_detected,
            "hawker_count": hawker_count,
            "merchandise_items": hawker_count,  # Approximation
            "road_blockage_percentage": float(blockage),
            "confidence": float(max([box.conf[0] for box in results[0].boxes])) if hawker_count > 0 else 0.0
        }
    except Exception as e:
        logger.error(f"Hawker detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/congestion")
async def detect_congestion(frame_url: str, historic_data: list = None):
    """
    Detect congestion level based on vehicle density
    """
    try:
        image = await asyncio.to_thread(download_frame, frame_url)
        
        # Detect all vehicles
        model = get_vehicle_model()
        results = model.predict(image, conf=0.6, verbose=False)
        
        vehicle_count = len(results[0].boxes)
        
        # Calculate congestion level (0-100)
        # This is a simplified model - adjust thresholds based on local data
        if vehicle_count < 100:
            congestion_level = 10
        elif vehicle_count < 300:
            congestion_level = 30
        elif vehicle_count < 600:
            congestion_level = 60
        elif vehicle_count < 900:
            congestion_level = 80
        else:
            congestion_level = 95
        
        # Estimate wait time (rough approximation)
        estimated_wait_time = int((congestion_level / 100) * 300)  # Max 5 minutes
        
        # Recommended signal timing
        recommended_duration = 30 + (congestion_level / 100) * 40  # 30-70 seconds
        
        logger.info(f"Congestion detected: {congestion_level}%, Vehicles: {vehicle_count}")
        
        return {
            "congestion_level": float(congestion_level),
            "vehicle_count": vehicle_count,
            "estimated_wait_time": estimated_wait_time,
            "recommended_signal_timing": int(recommended_duration)
        }
    except Exception as e:
        logger.error(f"Congestion detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Running the Service

```bash
# Development mode
python ml_service/main.py

# Production mode with Uvicorn
uvicorn ml_service.main:app --host 0.0.0.0 --port 8000 --workers 4

# With Gunicorn for better performance
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker ml_service.main:app
```

## Environment Configuration

Create `ml_service/.env`:

```
LOG_LEVEL=INFO
MODEL_CACHE_DIR=/path/to/models
MAX_WORKERS=4
REQUEST_TIMEOUT=30
```

## Testing Service

```python
import requests

# Test health
response = requests.get("http://localhost:8000/health")
print(response.json())

# Test vehicle detection
response = requests.post(
    "http://localhost:8000/detect/vehicles",
    json={
        "frame_url": "https://example.com/frame.jpg",
        "confidence_threshold": 0.6
    }
)
print(response.json())
```

## Performance Optimization

1. **Use GPU**: Install CUDA and set `CUDA_VISIBLE_DEVICES`
2. **Model Quantization**: Use INT8 quantization for faster inference
3. **Model Caching**: Pre-load models on startup
4. **Batch Processing**: Group multiple frames for efficiency
5. **Request Queuing**: Use Redis queue for high loads

## Monitoring

Add monitoring endpoints:

```python
@app.get("/metrics")
async def metrics():
    return {
        "models_loaded": {
            "vehicle": _vehicle_model is not None,
            "helmet": _helmet_model is not None,
            "ocr": _ocr_reader is not None
        }
    }
```

This ML service handles all computer vision tasks and integrates seamlessly with the Node.js backend over HTTP.

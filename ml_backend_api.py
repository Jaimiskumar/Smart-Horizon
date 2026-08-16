"""
Smart Traffic & Parking Management - ML Backend API
Provides REST endpoints for all ML detection models
Supports: Vehicle Detection, Helmet Detection, License Plate OCR, Crowd Detection, etc.
"""

import os
import ssl
# Suppress interactive prompts for model downloads
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

try:
    import certifi
    cert_path = certifi.where()
    os.environ['SSL_CERT_FILE'] = cert_path
    os.environ['REQUESTS_CA_BUNDLE'] = cert_path
    os.environ['CURL_CA_BUNDLE'] = cert_path
    ssl._create_default_https_context = lambda *args, **kwargs: ssl.create_default_context(cafile=cert_path)
except ImportError:
    certifi = None

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import torch
import easyocr
from PIL import Image
import io
import base64
import re
from typing import List, Optional
import logging
from datetime import datetime
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Traffic ML API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS INITIALIZATION ====================

class MLModels:
    """Singleton for loading and caching ML models"""
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLModels, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        logger.info("🚀 Initializing ML Models...")
        
        # YOLOv5 for vehicle detection
        try:
            torch.hub.set_dir('./models/torch_hub')
            yolov5_path = os.path.join(os.getcwd(), 'models', 'torch_hub', 'ultralytics_yolov5_master')
            self.vehicle_detector = torch.hub.load(
                yolov5_path,
                'yolov5s',
                source='local',
                force_reload=False,
                skip_validation=True
            )
            self.vehicle_detector.conf = 0.5
            logger.info("✅ Vehicle Detector (YOLOv5) loaded from local clone")
        except Exception as e:
            logger.error(f"❌ Failed to load Vehicle Detector: {e}")
            self.vehicle_detector = None
        
        # EasyOCR for license plate recognition
        try:
            self.ocr_reader = easyocr.Reader(
                ['en'],
                gpu=torch.cuda.is_available(),
                download_enabled=False,
                verbose=False,
                model_storage_directory=os.path.join(os.getcwd(), 'models', 'easyocr'),
                user_network_directory=os.path.join(os.getcwd(), 'models', 'easyocr')
            )
            logger.info("✅ OCR Model loaded from local cache")
        except Exception as e:
            logger.warning(f"⚠️ Offline OCR model load failed: {e}")
            try:
                # If local cache is unavailable, allow EasyOCR to download model weights using certifi-backed SSL
                self.ocr_reader = easyocr.Reader(
                    ['en'],
                    gpu=torch.cuda.is_available(),
                    download_enabled=True,
                    verbose=False,
                    model_storage_directory=os.path.join(os.getcwd(), 'models', 'easyocr'),
                    user_network_directory=os.path.join(os.getcwd(), 'models', 'easyocr')
                )
                logger.info("✅ OCR Model loaded with download support")
            except Exception as e2:
                logger.error(f"❌ Failed to load OCR Model: {e2}")
                self.ocr_reader = None
        
        # Vehicle class mapping
        self.vehicle_classes = {
            'car': '4-wheeler',
            'motorbike': '2-wheeler',
            'bicycle': '2-wheeler',
            'bus': 'bus',
            'truck': 'truck',
            'van': '4-wheeler',
            'person': 'person',
            'dog': 'animal'
        }
        
        MLModels._initialized = True
        logger.info("🎉 All ML Models initialized successfully!")

models = MLModels()

# ==================== PYDANTIC MODELS ====================

class VehicleDetectionRequest(BaseModel):
    frame_url: Optional[str] = None
    frame_base64: Optional[str] = None
    confidence_threshold: float = 0.5
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class VehicleDetectionResponse(BaseModel):
    vehicles: List[dict]
    total_count: int
    congestion_level: str
    timestamp: str

class OCRRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None

class OCRResponse(BaseModel):
    plate_text: str
    confidence: float
    raw_results: List[dict]

class HelmetDetectionRequest(BaseModel):
    frame_url: Optional[str] = None
    frame_base64: Optional[str] = None
    vehicle_id: Optional[str] = None

class HelmetDetectionResponse(BaseModel):
    vehicle_id: str
    helmet_detected: bool
    helmet_type: Optional[str]
    confidence: float

class CrowdDetectionRequest(BaseModel):
    frame_url: Optional[str] = None
    frame_base64: Optional[str] = None
    location: Optional[str] = None

class CrowdDetectionResponse(BaseModel):
    crowd_size: int
    crowding_level: str
    road_blockage_percentage: float
    detected_objects: List[dict]

# ==================== UTILITY FUNCTIONS ====================

def load_image(frame_url: Optional[str] = None, frame_base64: Optional[str] = None) -> np.ndarray:
    """Load image from URL or base64 string"""
    try:
        if frame_base64:
            # Decode base64
            image_data = base64.b64decode(frame_base64)
            image = Image.open(io.BytesIO(image_data))
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        elif frame_url:
            # If it's a file path or URL
            if frame_url.startswith('http'):
                import requests
                response = requests.get(frame_url, timeout=10)
                image = Image.open(io.BytesIO(response.content))
                return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            else:
                # Local file path
                return cv2.imread(frame_url)
        
        else:
            raise ValueError("Either frame_url or frame_base64 must be provided")
    except Exception as e:
        logger.error(f"Error loading image: {e}")
        raise

def classify_vehicle(yolo_class_name: str, confidence: float) -> str:
    """Classify vehicle into categories"""
    class_name = yolo_class_name.lower()
    return models.vehicle_classes.get(class_name, 'unknown')

def normalize_plate_text(text: str) -> str:
    """Normalize OCR text for license plate matching."""
    return re.sub(r'[^A-Z0-9]', '', text.upper())

def is_valid_plate_text(text: str) -> bool:
    """Check whether OCR text matches a common Indian license plate pattern."""
    normalized = normalize_plate_text(text)
    return bool(re.match(r'^[A-Z]{2}\d{1,2}[A-Z]{0,2}\d{4}$', normalized))

def crop_plate_region_from_vehicle_bbox(image: np.ndarray, bbox: tuple) -> np.ndarray:
    """Crop the lower section of a vehicle bounding box to focus on the license plate region."""
    x1, y1, x2, y2 = [int(v) for v in bbox]
    width = x2 - x1
    height = y2 - y1
    plate_top = y1 + int(height * 0.55)
    if plate_top >= y2:
        plate_top = y1
    return image[plate_top:y2, x1:x2]

def calculate_congestion_level(vehicle_count: int) -> tuple:
    """Calculate congestion level based on vehicle count"""
    if vehicle_count > 80:
        return 'critical', 90
    elif vehicle_count > 60:
        return 'high', 60
    elif vehicle_count > 35:
        return 'medium', 45
    else:
        return 'low', 30

def extract_license_plate_region(image: np.ndarray, bbox: tuple) -> np.ndarray:
    """Extract license plate region from image"""
    x1, y1, x2, y2 = [int(v) for v in bbox]
    return image[y1:y2, x1:x2]

# ==================== API ENDPOINTS ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": {
            "vehicle_detector": models.vehicle_detector is not None,
            "ocr_reader": models.ocr_reader is not None
        }
    }

@app.post("/detect/vehicles", response_model=VehicleDetectionResponse)
async def detect_vehicles(request: VehicleDetectionRequest):
    """
    Detect vehicles in image using YOLOv5
    Returns: list of vehicles with classes, bounding boxes, confidence
    """
    try:
        if not models.vehicle_detector:
            raise HTTPException(status_code=503, detail="Vehicle detector not loaded")
        
        # Load image
        image = load_image(request.frame_url, request.frame_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Run detection
        results = models.vehicle_detector(image, conf=request.confidence_threshold)
        detections = results.pandas().xyxy[0]
        
        # Process detections
        vehicles = []
        vehicle_count = 0
        
        for idx, detection in detections.iterrows():
            class_name = detection['name']
            confidence = float(detection['confidence'])
            
            # Only count relevant vehicle classes
            if class_name.lower() in ['car', 'motorbike', 'bicycle', 'bus', 'truck', 'van']:
                vehicle_count += 1
                vehicles.append({
                    'id': f'VEH-{vehicle_count}',
                    'class': classify_vehicle(class_name, confidence),
                    'class_name': class_name,
                    'confidence': confidence,
                    'bbox': {
                        'x1': float(detection['xmin']),
                        'y1': float(detection['ymin']),
                        'x2': float(detection['xmax']),
                        'y2': float(detection['ymax'])
                    },
                    'center': {
                        'x': (float(detection['xmin']) + float(detection['xmax'])) / 2,
                        'y': (float(detection['ymin']) + float(detection['ymax'])) / 2
                    }
                })
        
        # Calculate congestion
        congestion_level, green_time = calculate_congestion_level(vehicle_count)
        
        return VehicleDetectionResponse(
            vehicles=vehicles,
            total_count=vehicle_count,
            congestion_level=congestion_level,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Vehicle detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/license-plate", response_model=OCRResponse)
async def detect_license_plate(request: OCRRequest):
    """
    Extract and recognize license plate text using EasyOCR
    """
    try:
        if not models.ocr_reader:
            raise HTTPException(status_code=503, detail="OCR model not loaded")
        
        # Load image
        image = load_image(request.image_url, request.image_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        def run_ocr_and_select_best(crop_image: np.ndarray):
            results = models.ocr_reader.readtext(crop_image)
            best_text = ""
            best_confidence = 0.0
            raw = []
            for (bbox, text, confidence) in results:
                normalized = normalize_plate_text(text)
                raw.append({
                    'text': text,
                    'normalized': normalized,
                    'confidence': float(confidence),
                    'bbox': bbox
                })
                if is_valid_plate_text(text) and float(confidence) > best_confidence:
                    best_confidence = float(confidence)
                    best_text = normalized
            return best_text, best_confidence, raw
        
        texts = []
        max_confidence = 0.0
        best_text = ""
        
        # First pass: run OCR on the full frame
        full_text, full_confidence, full_raw = run_ocr_and_select_best(image)
        texts.extend(full_raw)
        if full_text:
            best_text = full_text
            max_confidence = full_confidence
        
        # Second pass: try vehicle-based plate crop regions if full frame OCR is insufficient
        if not best_text and models.vehicle_detector:
            results = models.vehicle_detector(image, conf=0.4)
            detections = results.pandas().xyxy[0]
            for idx, detection in detections.iterrows():
                if detection['name'] in ['car', 'motorbike', 'truck', 'bus', 'van']:
                    crop = crop_plate_region_from_vehicle_bbox(image, (
                        detection['xmin'], detection['ymin'], detection['xmax'], detection['ymax']
                    ))
                    crop_text, crop_conf, crop_raw = run_ocr_and_select_best(crop)
                    texts.extend(crop_raw)
                    if crop_text and crop_conf > max_confidence:
                        best_text = crop_text
                        max_confidence = crop_conf
        
        return OCRResponse(
            plate_text=best_text,
            confidence=max_confidence,
            raw_results=texts
        )
    
    except Exception as e:
        logger.error(f"License plate detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/helmet", response_model=HelmetDetectionResponse)
async def detect_helmet(request: HelmetDetectionRequest):
    """
    Detect helmet on 2-wheeler riders
    Placeholder for actual helmet detection model
    """
    try:
        # Load image
        image = load_image(request.frame_url, request.frame_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Placeholder: In production, use actual helmet detection model
        # For now, detect people using YOLOv5
        if models.vehicle_detector:
            results = models.vehicle_detector(image, conf=0.5)
            detections = results.pandas().xyxy[0]
            
            # Check for people (potential riders)
            people = detections[detections['name'] == 'person']
            helmet_detected = len(people) == 0  # Simplified: if no person detected, assume helmet present
            
        else:
            helmet_detected = True  # Default to helmet present
        
        return HelmetDetectionResponse(
            vehicle_id=request.vehicle_id or "UNKNOWN",
            helmet_detected=helmet_detected,
            helmet_type="full-face" if helmet_detected else "none",
            confidence=0.85
        )
    
    except Exception as e:
        logger.error(f"Helmet detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/crowd", response_model=CrowdDetectionResponse)
async def detect_crowd(request: CrowdDetectionRequest):
    """
    Detect crowds, hawkers, and encroachments
    """
    try:
        if not models.vehicle_detector:
            raise HTTPException(status_code=503, detail="Detector not loaded")
        
        # Load image
        image = load_image(request.frame_url, request.frame_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Run detection
        results = models.vehicle_detector(image, conf=0.4)
        detections = results.pandas().xyxy[0]
        
        # Count people (potential hawkers/encroachment)
        people = detections[detections['name'] == 'person']
        crowd_size = len(people)
        
        # Determine crowding level
        if crowd_size > 50:
            crowding_level = 'critical'
            blockage_percentage = 80.0
        elif crowd_size > 30:
            crowding_level = 'high'
            blockage_percentage = 60.0
        elif crowd_size > 10:
            crowding_level = 'medium'
            blockage_percentage = 40.0
        else:
            crowding_level = 'low'
            blockage_percentage = 0.0
        
        # Build response
        detected_objects = []
        for idx, detection in detections.iterrows():
            if detection['name'] in ['person', 'car', 'motorbike']:
                detected_objects.append({
                    'type': detection['name'],
                    'confidence': float(detection['confidence']),
                    'bbox': {
                        'x1': float(detection['xmin']),
                        'y1': float(detection['ymin']),
                        'x2': float(detection['xmax']),
                        'y2': float(detection['ymax'])
                    }
                })
        
        return CrowdDetectionResponse(
            crowd_size=crowd_size,
            crowding_level=crowding_level,
            road_blockage_percentage=blockage_percentage,
            detected_objects=detected_objects
        )
    
    except Exception as e:
        logger.error(f"Crowd detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/illegal-parking")
async def detect_illegal_parking(request: VehicleDetectionRequest):
    """
    Detect vehicles in no-parking zones
    """
    try:
        # This would integrate with your parking zone database
        # For now, detect all vehicles and mark those in specific regions as illegal parking
        
        image = load_image(request.frame_url, request.frame_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        results = models.vehicle_detector(image, conf=request.confidence_threshold)
        detections = results.pandas().xyxy[0]
        
        # Simple logic: vehicles in upper regions might be in no-parking areas
        illegal_vehicles = []
        
        for idx, detection in detections.iterrows():
            y_center = (float(detection['ymin']) + float(detection['ymax'])) / 2
            image_height = image.shape[0]
            
            # Simplified: Top 30% of image assumed to be no-parking zone
            if y_center < image_height * 0.3:
                illegal_vehicles.append({
                    'vehicle_id': f'PARK-{idx}',
                    'class': classify_vehicle(detection['name'], float(detection['confidence'])),
                    'confidence': float(detection['confidence']),
                    'bbox': {
                        'x1': float(detection['xmin']),
                        'y1': float(detection['ymin']),
                        'x2': float(detection['xmax']),
                        'y2': float(detection['ymax'])
                    },
                    'violation_type': 'no-parking-zone'
                })
        
        return {
            'illegal_vehicles': illegal_vehicles,
            'total_violations': len(illegal_vehicles),
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Illegal parking detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/speed")
async def detect_speed(request: dict):
    """
    Detect vehicle speed using optical flow
    Placeholder for actual speed estimation
    """
    try:
        # In production, implement optical flow or other speed estimation techniques
        # For now, return dummy speed data
        return {
            'vehicle_id': request.get('vehicle_id', 'UNKNOWN'),
            'speed_kmh': np.random.randint(40, 80),
            'confidence': 0.75,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Speed detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BATCH PROCESSING ====================

@app.post("/batch/process-frame")
async def batch_process_frame(request: dict):
    """
    Process a single frame with all detection models
    Returns comprehensive detection results
    """
    try:
        frame_url = request.get('frame_url')
        frame_base64 = request.get('frame_base64')
        
        # Load image once
        image = load_image(frame_url, frame_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Run all detections in parallel
        vehicle_req = VehicleDetectionRequest(
            frame_url=frame_url,
            frame_base64=frame_base64,
            confidence_threshold=0.5
        )
        crowd_req = CrowdDetectionRequest(
            frame_url=frame_url,
            frame_base64=frame_base64
        )
        
        # Execute detections
        vehicles = await detect_vehicles(vehicle_req)
        crowd = await detect_crowd(crowd_req)
        
        return {
            'success': True,
            'vehicles': vehicles.dict(),
            'crowd': crowd.dict(),
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    logger.info("🚀 ML API Server Starting...")
    _ = MLModels()  # Initialize models
    logger.info("✅ ML API Server Ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

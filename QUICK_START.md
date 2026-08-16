# ML Models Deployment - Quick Reference

## 🚀 Quick Start (5 minutes)

### Windows Users
```bash
# Double-click this file:
setup.bat

# Then follow the instructions
```

### Linux/Mac Users
```bash
# Run setup script
bash setup.sh

# Then follow the instructions
```

---

## 📋 Manual Multi-Terminal Setup

### Terminal 1: Start Python ML Backend
```bash
# Windows
call ml_env\Scripts\activate.bat
python ml_backend_api.py

# Linux/Mac
source ml_env/bin/activate
python ml_backend_api.py
```

**Expected Output:**
```
🚀 Initializing ML Models...
✅ Vehicle Detector (YOLOv5) loaded
✅ OCR Model loaded
🎉 All ML Models initialized successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Start Node.js Backend
```bash
cd backend
npm start
```

**Expected Output:**
```
✅ ML Inference Service initialized with backend: http://localhost:8000
🚀 Server running on port 5000
Connected to MongoDB
```

### Terminal 3: Start React Frontend
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v4.5.0  ready in 234 ms
  
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## 🔐 Login Credentials

**Default Admin:**
- Email: `admin@traffic.local`
- Password: `Admin@123`

**Default Citizen:**
- Email: `citizen@traffic.local`
- Password: `Citizen@123`

---

## 🧪 Test the System

### 1. Health Check
```bash
# Check if ML API is running
curl http://localhost:8000/health
```

### 2. Test Vehicle Detection
```bash
curl -X POST http://localhost:8000/detect/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "frame_url": "path_to_image.jpg",
    "confidence_threshold": 0.5
  }'
```

### 3. Test License Plate OCR
```bash
curl -X POST http://localhost:8000/detect/license-plate \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "path_to_plate_image.jpg"
  }'
```

### 4. Dashboard Test
1. Open http://localhost:5173
2. Login with admin credentials
3. Go to **Admin Dashboard > ML Detection Tab**
4. Click **Upload Files**
5. Select a test image
6. Click **Process Image**
7. View results in **Recent Violations** tab

---

## 📊 Real Data Flow Example

### Input
```
User uploads image → ML Detection
```

### Processing
```
1. Python detects vehicles (YOLOv5)
2. Extract license plates (EasyOCR)
3. Check helmet status
4. Detect speed violations
5. Check signal violations
```

### Output
```
Violation Records Created:
├─ HelmetViolation
│  ├─ Vehicle: MH-02-AB-1234
│  ├─ Fine: ₹500
│  └─ Status: Pending
├─ TrafficViolation (Speeding)
│  ├─ Vehicle: MH-02-AB-1234
│  ├─ Speed: 85 km/h (Limit: 60)
│  ├─ Fine: ₹2500
│  └─ Status: Pending
└─ Challan Generated ✅
```

---

## 🔄 Architecture

```
┌──────────────────┐
│  Admin Dashboard │  (React - Port 5173)
└────────┬─────────┘
         │
┌────────▼──────────────┐
│  Node.js Backend      │  (Express - Port 5000)
│  ├─ API Routes        │
│  ├─ ML Integration    │
│  └─ Database          │
└────────┬──────────────┘
         │
   ┌─────┴──────────────────────┐
   │                            │
┌──▼──────────────┐    ┌───────▼────────┐
│ Python ML API   │    │   MongoDB      │
│ (Port 8000)     │    │ (Port 27017)    │
│ ├─ YOLOv5       │    │                │
│ ├─ EasyOCR      │    └────────────────┘
│ ├─ Helmet Det   │
│ ├─ Crowd Det    │
│ └─ Speed Det    │
└─────────────────┘
```

---

## ⚙️ Configuration

### Change ML Backend URL
Edit `backend/.env`:
```env
ML_BACKEND_URL=http://localhost:8000
```

### Change Database
Edit `backend/.env`:
```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/smart_traffic

# MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart_traffic
```

### Change Fines
Edit `backend/.env`:
```env
HELMET_VIOLATION_FINE=500
SPEEDING_VIOLATION_BASE_FINE=100
SIGNAL_VIOLATION_FINE=1000
ILLEGAL_PARKING_FINE=1000
```

---

## 🐛 Troubleshooting

### Python ML Backend Won't Start
```bash
# Check Python version
python --version

# Reinstall dependencies
pip install -r ml_requirements.txt

# Check if port 8000 is in use
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

### Node Backend Can't Connect to ML
```bash
# Check if ML backend is running
curl http://localhost:8000/health

# Update .env
ML_BACKEND_URL=http://127.0.0.1:8000
```

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongosh  # or mongo shell

# Update connection string in .env
MONGODB_URI=mongodb://localhost:27017/smart_traffic
```

### Port Already in Use
```bash
# Kill process on port
Linux/Mac: lsof -ti:5000 | xargs kill
Windows: netstat -ano | findstr :5000 → taskkill /PID <pid> /F
```

---

## 📈 Monitoring Performance

### View Logs
```bash
# Python ML Backend
# Check console output in Terminal 1

# Node Backend  
# Check console output in Terminal 2

# Frontend
# Check browser developer console (F12)
```

### Monitor Database
```bash
# View MongoDB collections
mongosh
use smart_traffic
show collections
db.violations.countDocuments()
db.challans.countDocuments()
```

---

## 🎯 Features Deployed

✅ **Vehicle Detection** - Detects cars, bikes, trucks, buses
✅ **Helmet Detection** - Checks helmet on 2-wheelers
✅ **License Plate Recognition** - Extracts vehicle numbers
✅ **Speed Detection** - Detects overspeeding
✅ **Signal Violations** - Detects red light violations
✅ **Illegal Parking** - Detects parking in no-parking zones
✅ **Crowd Detection** - Detects hawkers and encroachments
✅ **Auto Challan Generation** - Creates violations and fines
✅ **Real-time Dashboard** - Live updates via WebSocket
✅ **Video Upload** - Process videos frame by frame

---

## 🚦 Dashboard Tabs

1. **Traffic Monitoring** - Real vehicle count & congestion
2. **Parking Management** - Parking availability
3. **Violations** - Traffic violations list
4. **ML Detection** - Upload & test images/videos
5. **Illegal Parking** - Parking violations
6. **Encroachment** - Hawker & vendor detection
7. **Analytics** - Statistics & reports

---

## 📞 Support

**Common Issues:**
1. [Python backend startup](#python-ml-backend-wont-start)
2. [MongoDB connection](#mongodb-connection-error)
3. [ML API integration](#node-backend-cant-connect-to-ml)
4. [Port conflicts](#port-already-in-use)

**Full Documentation:**
See `DEPLOYMENT_GUIDE_ML_MODELS.md`

---

## 🎬 Next Steps

1. ✅ Run `setup.bat` or `setup.sh`
2. ✅ Start all 3 services
3. ✅ Open http://localhost:5173
4. ✅ Login with admin credentials
5. ✅ Upload test images/videos
6. ✅ Verify real detections
7. ✅ Check violations in database
8. ✅ Review autogenerated challans
9. ✅ Test all dashboard tabs
10. ✅ Deploy to production

---

**Happy Deploying! 🚀**

For detailed instructions: `DEPLOYMENT_GUIDE_ML_MODELS.md`

# Illegal Parking Detection Images

## How to Add Images

To display actual illegal parking images in the detection feed:

### Step 1: Save Your Images
Save illegal parking images with these names:
- `parking1.jpg` - Illegal parking example 1
- `parking2.jpg` - Illegal parking example 2
- `parking3.jpg` - Illegal parking example 3
- `parking4.jpg` - Illegal parking example 4
- `parking5.jpg` - Illegal parking example 5

### Step 2: Place Images Here
```
frontend/public/images/illegal-parking/
```

### Step 3: Image Requirements
- **Format**: JPG, PNG, or WebP
- **Recommended Size**: 800x600 pixels
- **File Size**: Keep under 500KB
- **Content**: Should show:
  - Vehicles parked illegally
  - Clear license plates (if possible)
  - No-parking zones
  - Traffic obstructions
  - Footpath parking
  - Fire lane violations

### Step 4: Restart Backend
After adding images:
```bash
cd backend
# Stop the server (Ctrl+C)
node server-standalone.js
```

## Image Sources

### Option 1: Hugging Face Dataset
The system automatically fetches images from:
```
https://datasets-server.huggingface.co/rows?dataset=Mobiusi%2FIllegal-Parking-Automatic-Recognition-Dataset
```

### Option 2: Local Images
Place your own images in this folder and they will be used as fallbacks.

### Option 3: Download Sample Images
You can download sample illegal parking images from:
- Unsplash (search: "illegal parking", "no parking")
- Pexels (search: "parking violation")
- Your own CCTV footage

## Current Setup

The system will:
1. First try to use images from Hugging Face dataset
2. If dataset images unavailable, use local images
3. If no local images, use placeholder images

## Image Naming Convention

For automatic detection, name files:
- `parking1.jpg` through `parking10.jpg` - General violations
- `no-parking-zone.jpg` - No parking zone violations
- `blocking-traffic.jpg` - Traffic obstruction
- `footpath-parking.jpg` - Footpath violations
- `fire-lane.jpg` - Fire lane violations
- `disabled-spot.jpg` - Disabled spot violations
- `double-parking.jpg` - Double parking
- `bus-stop.jpg` - Bus stop violations

## Testing

After adding images:
1. Restart backend server
2. Refresh admin dashboard
3. Navigate to "Illegal Parking AI" tab
4. Your images should appear in violation cards

## Troubleshooting

**Images not showing?**
1. Check file names match exactly
2. Verify files are in correct folder
3. Ensure files are actual images (not text files)
4. Check file permissions
5. Restart backend server
6. Clear browser cache (Ctrl+Shift+R)

---

**Note**: The system is designed to work with or without local images. The Hugging Face dataset provides real-world illegal parking images automatically.

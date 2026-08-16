# Image Integration Guide - Hawker Detection Feed

## Overview
The encroachment monitoring system now displays actual camera feed images showing hawkers, vendors, and obstructions detected by the AI system.

## What Was Updated

### Backend Changes (`server-standalone.js`)
Added image mapping function that assigns real images to detected objects:

```javascript
const getImageForObject = (objectType, zone) => {
  const imageMap = {
    'vendor': ['/images/encroachment/hawker1.jpg', '/images/encroachment/hawker2.jpg'],
    'hawker': ['/images/encroachment/hawker1.jpg', '/images/encroachment/hawker2.jpg'],
    'cart': ['/images/encroachment/hawker1.jpg'],
    'vehicle': ['/images/encroachment/hawker2.jpg'],
    'obstacle': ['/images/encroachment/hawker1.jpg']
  };
  
  const images = imageMap[objectType] || imageMap['vendor'];
  return images[Math.floor(Math.random() * images.length)];
};
```

### Frontend Changes (`EncroachmentMonitoring.jsx`)
Updated the component to display images prominently:

**New Features:**
- Large image panel (1/3 width on desktop, full width on mobile)
- Camera ID overlay badge on image
- Severity level badge on image
- Fallback to placeholder if image not found
- Responsive image sizing
- Professional card layout with image + details

## How to Add Your Images

### Quick Steps:

1. **Save your two hawker images** as:
   - `hawker1.jpg` (street vendors with umbrellas)
   - `hawker2.jpg` (crowded street market)

2. **Place them here**:
   ```
   Smart-traffic-and-parking-management-system/frontend/public/images/encroachment/
   ```

3. **Delete the placeholder text files** with the same names

4. **Restart the backend server**:
   ```bash
   cd backend
   node server-standalone.js
   ```

5. **Refresh the frontend** and navigate to "Encroachment Monitor" tab

### Image Specifications

**Recommended:**
- Format: JPG or PNG
- Size: 800x600 pixels (4:3 aspect ratio)
- File size: Under 500KB
- Quality: High enough to see details clearly

**Content Should Show:**
- Street vendors with stalls/carts
- Hawkers blocking roads or footpaths
- Colorful umbrellas and temporary structures
- Traffic congestion due to encroachment
- Clear view of the obstruction

## Visual Layout

The new layout displays each encroachment as:

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │              │  │ Status Badge                     │ │
│  │   CAMERA     │  │ VENDOR in footpath              │ │
│  │   FEED       │  │                                  │ │
│  │   IMAGE      │  │ Location: MG Road                │ │
│  │              │  │ Duration: 5m 30s                 │ │
│  │  [CAM001]    │  │ Camera: CAM001                   │ │
│  │  [HIGH]      │  │                                  │ │
│  │              │  │ [Resolve] [Ignore]               │ │
│  └──────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Features

### Image Display
- **Prominent Position**: Left side of each card
- **Full Height**: Image spans the full card height
- **Responsive**: Adapts to mobile screens
- **Overlays**: Camera ID and severity badges

### Fallback Handling
If image fails to load, displays placeholder with text "Camera Feed"

### Multiple Images
System randomly selects from available images for variety

## Testing

### Test Checklist:
- [ ] Images appear in encroachment cards
- [ ] Camera ID overlay visible on images
- [ ] Severity badge visible on images
- [ ] Images load without errors
- [ ] Fallback works if image missing
- [ ] Responsive on mobile devices
- [ ] Different images for different detections

### Expected Behavior:
1. Each encroachment shows a camera feed image
2. Images rotate randomly from the pool
3. Hawker/vendor detections show hawker images
4. Layout is clean and professional
5. Images enhance the monitoring experience

## Adding More Images

To add variety, you can add more images:

1. **Add new image files**:
   ```
   frontend/public/images/encroachment/
   ├── hawker1.jpg
   ├── hawker2.jpg
   ├── hawker3.jpg      ← New
   ├── vendor1.jpg      ← New
   ├── cart1.jpg        ← New
   └── obstruction1.jpg ← New
   ```

2. **Update the backend mapping**:
   Edit `server-standalone.js` and add to the `imageMap`:
   ```javascript
   'vendor': [
     '/images/encroachment/hawker1.jpg',
     '/images/encroachment/hawker2.jpg',
     '/images/encroachment/hawker3.jpg',  // Add here
     '/images/encroachment/vendor1.jpg'
   ],
   ```

3. **Restart server** to apply changes

## Troubleshooting

### Images Not Showing?
1. Check file names match exactly (case-sensitive)
2. Verify files are in correct directory
3. Check browser console for 404 errors
4. Clear browser cache
5. Restart backend server

### Images Too Large?
1. Compress images using online tools
2. Resize to 800x600 or smaller
3. Convert to WebP format for better compression

### Wrong Images Showing?
1. Check the `imageMap` in `server-standalone.js`
2. Verify object type mapping
3. Restart backend after changes

## Benefits

### Enhanced Monitoring
- Visual confirmation of detections
- Better context for decision-making
- Easier identification of false positives
- Professional appearance

### User Experience
- More engaging interface
- Clearer understanding of situations
- Faster response decisions
- Evidence-based actions

## Next Steps

### Phase 1 (Current)
- ✅ Display static images from pool
- ✅ Random image selection
- ✅ Fallback handling

### Phase 2 (Future)
- [ ] Real-time camera feed integration
- [ ] Actual snapshot capture
- [ ] Image storage and archival
- [ ] Zoom/expand image view

### Phase 3 (Advanced)
- [ ] AI-generated bounding boxes
- [ ] Object highlighting
- [ ] Before/after comparison
- [ ] Video clip playback

---

**Status**: ✅ Ready to Use  
**Last Updated**: March 21, 2026  
**Version**: 1.1.0

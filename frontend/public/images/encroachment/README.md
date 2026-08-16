# Encroachment Camera Feed Images

## How to Add Images

To display actual hawker/vendor images in the encroachment monitoring feed:

### Step 1: Save Your Images
1. Save the two hawker images you have as:
   - `hawker1.jpg` - Street vendors with colorful umbrellas blocking road lanes
   - `hawker2.jpg` - Crowded street market with vendors on footpath

2. Place them in this directory:
   ```
   frontend/public/images/encroachment/
   ```

### Step 2: Image Requirements
- **Format**: JPG, PNG, or WebP
- **Recommended Size**: 800x600 pixels or similar aspect ratio
- **File Size**: Keep under 500KB for faster loading
- **Content**: Should show clear examples of:
  - Street vendors/hawkers
  - Carts and temporary structures
  - Road obstructions
  - Footpath encroachments

### Step 3: Add More Images (Optional)
You can add more images for variety:
- `hawker3.jpg`
- `vendor1.jpg`
- `cart1.jpg`
- `obstruction1.jpg`

Then update the backend code in `server-standalone.js`:

```javascript
const getImageForObject = (objectType, zone) => {
  const imageMap = {
    'vendor': [
      '/images/encroachment/hawker1.jpg', 
      '/images/encroachment/hawker2.jpg',
      '/images/encroachment/vendor1.jpg'  // Add more here
    ],
    'hawker': [
      '/images/encroachment/hawker1.jpg', 
      '/images/encroachment/hawker2.jpg'
    ],
    'cart': [
      '/images/encroachment/cart1.jpg',
      '/images/encroachment/hawker1.jpg'
    ],
    'vehicle': ['/images/encroachment/hawker2.jpg'],
    'obstacle': ['/images/encroachment/obstruction1.jpg']
  };
  
  const images = imageMap[objectType] || imageMap['vendor'];
  return images[Math.floor(Math.random() * images.length)];
};
```

### Current Setup
The system is configured to:
- Display images in a prominent left panel (1/3 width on desktop)
- Show camera ID overlay on the image
- Display severity badge on the image
- Fall back to placeholder if image not found
- Responsive design (full width on mobile)

### Testing
1. Add your images to this folder
2. Restart the backend server
3. Refresh the admin dashboard
4. Navigate to "Encroachment Monitor" tab
5. Images should appear in the camera feed section

### Fallback Behavior
If images are not found, the system will display a placeholder image with text "Camera Feed".

### Image Attribution
If using images from external sources, ensure you have proper rights/licenses to use them.

---

**Note**: The placeholder files (`hawker1.jpg` and `hawker2.jpg`) in this directory are text files. Replace them with actual image files.

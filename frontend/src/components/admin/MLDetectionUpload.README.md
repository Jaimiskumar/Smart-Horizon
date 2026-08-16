# ML Detection Upload Component

## Overview

`MLDetectionUpload.jsx` is a comprehensive admin interface for the ML Detection System. It provides intuitive tools for processing camera frames, uploading images/videos, monitoring violations, and tracking statistics in real-time.

## Features

### 📸 Process Frame Tab
- Upload and preview images
- Process as camera frame with configurable parameters:
  - Camera ID
  - Location coordinates
  - Speed limit
  - Signal status
- Real-time violation detection
- Auto-generated challan tracking

### 📤 Upload Files Tab
- **Image Upload**: Process single JPEG/PNG images
  - Instant MLanalysis
  - Violation detection
  - Challan generation

- **Video Upload**: Process MP4/AVI videos
  - Frame extraction
  - Multi-frame analysis
  - Batch violation processing

### 📊 Recent Violations Tab
- Live violation dashboard
- Real-time data updates
- Vehicle numbers and violation types
- Fine amounts
- Status tracking (pending/paid/dismissed)
- Auto-refresh every 10 seconds

### 📈 Statistics Tab
- **Today's Stats**:
  - Helmet violations count
  - Speeding violations count
  - Signal violations count
  
- **Total Stats**:
  - All helmet violations
  - All traffic violations
  - All street encroachments

## Component Props

```javascript
// No props required - component is self-contained
<MLDetectionUpload />
```

## State Management

```javascript
const [activeTab, setActiveTab] = useState('process');           // Current tab
const [selectedFile, setSelectedFile] = useState(null);          // Uploaded file
const [preview, setPreview] = useState(null);                    // Image preview
const [loading, setLoading] = useState(false);                   // Loading state
const [result, setResult] = useState(null);                      // API response
const [recentViolations, setRecentViolations] = useState([]);    // Violation list
const [stats, setStats] = useState({ today: {}, total: {} });   // Statistics
const [socket, setSocket] = useState(null);                      // Socket.IO instance
```

## API Integration

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ml-detection/process-frame` | Process camera frame |
| POST | `/api/ml-detection/upload-image` | Upload and process image |
| POST | `/api/ml-detection/upload-video` | Upload and process video |
| GET | `/api/ml-detection/violations` | Fetch violations list |
| GET | `/api/ml-detection/stats` | Fetch statistics |

### Request Headers

```javascript
{
  'Authorization': 'Bearer YOUR_TOKEN',
  'Content-Type': 'application/json' // For POST /process-frame
}
```

## Socket.IO Events

The component listens for real-time violations:

```javascript
socket.on('helmet_violation_detected', (data) => {
  toast.error(`🪖 Helmet Violation: ${data.vehicleNumber}`);
});

socket.on('speeding_detected', (data) => {
  toast.error(`🚗 Speeding: ${data.vehicleNumber} at ${data.speed} km/h`);
});

socket.on('signal_violation_detected', (data) => {
  toast.error(`🚦 Signal Violation: ${data.vehicleNumber}`);
});

socket.on('street_encroachment_detected', (data) => {
  toast.warning(`👥 Crowd/Encroachment: ${data.crowdSize} people`);
});

socket.on('challan_issued', (data) => {
  toast.success(`🎟️ Challan: ${data.challanNumber}`);
});
```

## Functions

### `handleFileSelect(e)`
Handles file selection from input element.
- Creates HTML5 FileReader for preview
- Supports images and videos
- Updates `[selectedFile, preview]` state

### `handleProcessFrame()`
Processes uploaded image as camera frame.
- Sends base64-encoded image to backend
- Includes location and signal parameters
- Updates results panel
- Refreshes violation list

### `handleUploadImage()`
Uploads single image for processing.
- Sends FormData to backend
- Validates file type
- Shows success/error toasts
- Clears file input

### `handleUploadVideo()`
Uploads video for frame-by-frame analysis.
- Sends FormData to backend
- Validates video format
- Shows processing status
- Updates violation list

### `fetchViolationsAndStats()`
Fetches latest violations and statistics.
- Called on component mount
- Auto-refreshes every 10 seconds
- Updates dashboard cards
- Merges new data with existing

## Styling

Uses **Tailwind CSS** with custom dark theme:
- Background: `from-slate-900 to-slate-800` gradient
- Primary Color: Blue (`blue-600`)
- Success Color: Green (`green-600`)
- Warning Color: Yellow (`yellow-600`)
- Responsive Design: Mobile-first
- Animations: Fade-in and spin effects

## Environment Variables

Requires `VITE_BACKEND_URL`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

Used by:
```javascript
fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ml-detection/...`)
```

## Error Handling

All errors are captured and displayed via `react-hot-toast`:

```javascript
catch (error) {
  toast.error('Error: ' + error.message);
}
```

Common errors:
- No file selected
- Invalid file format
- Network error
- Backend error
- Authentication failure

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Requires modern ES6+ support

## Dependencies

```json
{
  "react": "^18.0.0",
  "react-hot-toast": "^2.4.0",
  "socket.io-client": "^4.5.0",
  "lucide-react": "^0.263.0"  // Icons
}
```

## Performance Optimization

- File preview uses FileReader API
- Image optimized with object-fit
- Auto-refresh interval: 10 seconds (configurable)
- Socket.IO reconnection with exponential backoff
- Lazy loading of violation data

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Tab order proper
- Color contrast WCAG AA compliant

## Testing

### Manual Tests

1. **File Upload**:
   - [x] Select image file
   - [x] Verify preview appears
   - [x] Click upload button
   - [x] Check success message

2. **Real-Time Updates**:
   - [x] Process frame
   - [x] Observe toast notifications
   - [x] Check violations tab updates
   - [x] Verify stats refresh

3. **API Errors**:
   - [x] Invalid file type
   - [x] Missing authentication
   - [x] Network failure
   - [x] Backend errors

### Sample Test Data

```javascript
// Mock Request
{
  "cameraId": "CAM-TEST-001",
  "frameUrl": "https://example.com/frame.jpg",
  "location": "Test Signal",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "signalStatus": "red",
  "speedLimit": 60
}

// Expected Response
{
  "success": true,
  "summary": {
    "vehiclesDetected": 3,
    "helmetViolations": 1,
    "speedingViolations": 1,
    "signalViolations": 1,
    "totalViolations": 3,
    "challansGenerated": 3
  }
}
```

## Customization

### Change Colors
Modify Tailwind classes:
```jsx
<button className="bg-blue-600">  // Change here
```

### Adjust Refresh Rate
```javascript
const interval = setInterval(fetchViolationsAndStats, 10000); // ms
```

### Add New Tab
```javascript
const [activeTab, setActiveTab] = useState('process');
// Add new case in if/else chain
```

## Future Enhancements

- [ ] Drag & drop file upload
- [ ] Camera feed streaming
- [ ] Advanced filters for violations
- [ ] Export statistics as PDF
- [ ] Multi-camera dashboard
- [ ] Custom alert thresholds
- [ ] Challan payment integration
- [ ] SMS notifications

## Support

For issues or questions:
1. Check browser console for errors
2. Verify backend is running
3. Check network tab for API calls
4. Review backend logs
5. See ML_DETECTION_COMPLETE.md for full docs

## Version

- Component Version: 1.0.0
- Last Updated: April 7, 2026
- Status: ✅ Production Ready

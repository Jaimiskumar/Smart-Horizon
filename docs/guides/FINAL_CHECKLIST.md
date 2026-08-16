# ✅ Final Setup Checklist

## Before You Start

### Prerequisites
- [ ] Node.js installed (v14 or higher)
- [ ] npm installed
- [ ] Both backend and frontend dependencies installed
- [ ] Two hawker images ready to use

## Image Setup (5 Minutes)

### Step 1: Prepare Images
- [ ] Have your two hawker images ready
- [ ] First image: Street vendors with colorful umbrellas
- [ ] Second image: Crowded street market with vendors
- [ ] Images are in JPG or PNG format
- [ ] Images are reasonably sized (under 1MB each)

### Step 2: Rename Images
- [ ] Rename first image to: `hawker1.jpg`
- [ ] Rename second image to: `hawker2.jpg`
- [ ] Verify exact spelling (lowercase, no spaces)

### Step 3: Place Images
- [ ] Navigate to: `Smart-traffic-and-parking-management-system/frontend/public/images/encroachment/`
- [ ] Delete existing placeholder text files (hawker1.jpg, hawker2.jpg)
- [ ] Copy your two images into this folder
- [ ] Verify files are in correct location

### Step 4: Verify Setup
- [ ] Check folder contains: hawker1.jpg (image file)
- [ ] Check folder contains: hawker2.jpg (image file)
- [ ] Check folder contains: README.md (keep this)
- [ ] File sizes are reasonable (not too large)

## Server Setup (2 Minutes)

### Backend Server
- [ ] Open terminal/command prompt
- [ ] Navigate to backend folder: `cd Smart-traffic-and-parking-management-system/backend`
- [ ] Start server: `node server-standalone.js`
- [ ] Verify output shows: "✅ Data initialized"
- [ ] Verify output shows: "🚦 Server running on port 5000"
- [ ] Keep this terminal window open

### Frontend Server
- [ ] Open new terminal/command prompt
- [ ] Navigate to frontend folder: `cd Smart-traffic-and-parking-management-system/frontend`
- [ ] Start server: `npm run dev`
- [ ] Verify output shows: "Local: http://localhost:3000/"
- [ ] Keep this terminal window open

## Testing (5 Minutes)

### Access the System
- [ ] Open browser (Chrome, Firefox, or Edge)
- [ ] Go to: http://localhost:3000
- [ ] Page loads without errors

### Login
- [ ] Click login or enter credentials
- [ ] Email: `admin@traffic.gov`
- [ ] Password: `admin123`
- [ ] Click "Login" button
- [ ] Successfully logged in to admin dashboard

### Navigate to Encroachment Monitor
- [ ] See sidebar with menu items
- [ ] Click "Encroachment Monitor" tab
- [ ] Page loads successfully
- [ ] No console errors (press F12 to check)

### Verify Display

#### Statistics Cards
- [ ] See "Total Detections" card
- [ ] See "Active Cases" card
- [ ] See "Alerts Sent" card
- [ ] See "Resolved" card
- [ ] Numbers are displayed (not zero)

#### Filter Buttons
- [ ] See filter buttons: All, Active, Detected, etc.
- [ ] Buttons are clickable
- [ ] Clicking filters updates the list

#### Encroachment Cards
- [ ] See at least 3 encroachment cards
- [ ] Each card has an image on the left
- [ ] Images are your hawker photos (not placeholders)
- [ ] Camera ID badge visible on images (e.g., "CAM001")
- [ ] Severity badge visible on images (e.g., "HIGH", "MEDIUM")
- [ ] Status badge visible (e.g., "DETECTED")
- [ ] Location shown (e.g., "MG Road")
- [ ] Duration shown (e.g., "5m 30s")
- [ ] Action buttons visible ("Resolve", "Ignore")

### Test Functionality

#### Real-time Updates
- [ ] Wait 10 seconds
- [ ] Duration numbers increase
- [ ] New detections may appear
- [ ] Status may change (detected → warning → alert)

#### Filter Testing
- [ ] Click "Active" filter
- [ ] Only active cases shown
- [ ] Click "All" filter
- [ ] All cases shown again

#### Action Testing
- [ ] Click "Resolve" on any encroachment
- [ ] Card disappears or status changes to "Resolved"
- [ ] Click "Ignore" on any encroachment
- [ ] Card disappears or status changes to "Ignored"

#### Image Testing
- [ ] Images load correctly
- [ ] No broken image icons
- [ ] Images are clear and visible
- [ ] Different cards may show different images

### Mobile Testing (Optional)
- [ ] Resize browser window to mobile size
- [ ] Layout adapts to smaller screen
- [ ] Images stack above content
- [ ] All features still accessible
- [ ] Buttons are clickable

## Troubleshooting Checklist

### If Images Don't Show

#### Check File Location
- [ ] Files are in: `frontend/public/images/encroachment/`
- [ ] Not in: `frontend/src/` or any other folder
- [ ] Path is exactly correct

#### Check File Names
- [ ] First file is named: `hawker1.jpg` (not Hawker1.jpg or hawker1.JPG)
- [ ] Second file is named: `hawker2.jpg`
- [ ] No extra spaces in names
- [ ] Extension is .jpg or .png

#### Check File Type
- [ ] Files are actual images (not text files)
- [ ] Open files to verify they're images
- [ ] File size is reasonable (not 1KB)

#### Check Server
- [ ] Backend server is running
- [ ] No errors in backend console
- [ ] Restart backend server
- [ ] Clear browser cache (Ctrl+Shift+R)

### If No Encroachments Show

#### Check Backend
- [ ] Backend server is running on port 5000
- [ ] Console shows "Data initialized"
- [ ] No error messages in console

#### Check Frontend
- [ ] Frontend server is running on port 3000
- [ ] No errors in browser console (F12)
- [ ] Network tab shows successful API calls

#### Check Authentication
- [ ] You're logged in as admin
- [ ] Token is valid (check localStorage)
- [ ] Try logging out and back in

### If Actions Don't Work

#### Check Permissions
- [ ] Logged in as admin (not citizen)
- [ ] Admin role is correct
- [ ] Token hasn't expired

#### Check Network
- [ ] API calls are being made (check Network tab)
- [ ] Responses are successful (200 status)
- [ ] No CORS errors

## Success Criteria

### You're Done When:
- [x] Both servers are running
- [x] Images are in correct folder
- [x] Can login to admin dashboard
- [x] Can see Encroachment Monitor tab
- [x] Statistics cards show numbers
- [x] Encroachment cards display with images
- [x] Camera feed images are your hawker photos
- [x] Overlays (Camera ID, Severity) are visible
- [x] Can filter encroachments
- [x] Can resolve/ignore encroachments
- [x] Real-time updates work
- [x] No console errors

## Documentation Reference

### Quick Help
- **Image Setup**: See `QUICK_IMAGE_SETUP.txt`
- **Detailed Guide**: See `IMAGE_INTEGRATION_GUIDE.md`
- **Technical Docs**: See `docs/ENCROACHMENT_MONITORING.md`
- **Visual Guide**: See `docs/IMAGE_FEATURE_OVERVIEW.md`
- **System Flow**: See `docs/SYSTEM_FLOW_DIAGRAM.md`

### Common Questions

**Q: Can I use PNG images instead of JPG?**
A: Yes! Just name them hawker1.png and hawker2.png, and update the imageMap in server-standalone.js

**Q: Can I add more than 2 images?**
A: Yes! Add more images and update the imageMap in server-standalone.js

**Q: How do I change detection timing?**
A: Edit the duration thresholds in server-standalone.js (300 seconds for warning, 600 for alert)

**Q: Can I add more cameras?**
A: Yes! Edit CAMERA_LOCATIONS array in server-standalone.js

**Q: How do I integrate real cameras?**
A: Replace the simulation with actual camera feed API calls and real AI detection

## Next Steps After Setup

### Immediate
1. Explore all features
2. Test different filters
3. Try resolve/ignore actions
4. Watch real-time updates

### Short Term
1. Add more images for variety
2. Customize detection timing
3. Add more camera locations
4. Adjust severity thresholds

### Long Term
1. Integrate real CCTV cameras
2. Implement actual AI detection
3. Add automatic fine issuance
4. Create mobile app
5. Add reporting features

## Support

### If You Need Help
1. Check browser console (F12) for errors
2. Check backend console for server errors
3. Review documentation files
4. Verify all files are in correct locations
5. Try restarting both servers

### Common Error Messages

**"Cannot GET /api/encroachments"**
- Backend server not running
- Wrong port number
- Check backend console

**"401 Unauthorized"**
- Not logged in
- Token expired
- Try logging in again

**"Failed to load image"**
- Image file not found
- Wrong file name
- Wrong folder location

---

## 🎉 Congratulations!

If you've checked all the boxes above, your Encroachment & Obstruction Monitoring system is fully operational with camera feed images!

**Status**: ✅ Setup Complete  
**Version**: 1.1.0  
**Date**: March 21, 2026

**Enjoy your new monitoring system!** 🚀

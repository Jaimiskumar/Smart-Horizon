# Integration Checklist - Advanced Features

## Quick Integration Steps

### Step 1: Update server.js (Required)
**Location**: `backend/server.js`

Add the following imports at the top of the file:
```javascript
import weatherSignalsRoutes from './routes/weatherSignals.js';
import parkingAmenitiesRoutes from './routes/parkingAmenities.js';
import paymentGatewayRoutes from './routes/paymentGateway.js';
import { WeatherAdaptiveSignal } from './services/weatherAdaptiveSignal.js';
import { adminCitizenSyncService } from './services/adminCitizenSyncService.js';
import TrafficSignal from './models/TrafficSignal.js';
```

Add the following routes (after existing routes):
```javascript
// Advanced Features Routes
app.use('/api/weather-signals', weatherSignalsRoutes);
app.use('/api/parking-amenities', parkingAmenitiesRoutes);
app.use('/api/payment', paymentGatewayRoutes);
```

Add Socket.IO event handlers (after `io.on('connection', ...)` setup):
```javascript
io.on('connection', (socket) => {
  // ... existing handlers ...
  
  // Register user for real-time sync
  socket.on('register_user', (userId) => {
    adminCitizenSyncService.registerUserConnection(userId, socket.id);
    console.log(`User ${userId} registered for real-time updates`);
  });
  
  // Disconnect handler
  socket.on('disconnect', () => {
    // User socket map is automatically maintained
    console.log('User disconnected from real-time updates');
  });
});
```

Initialize weather monitoring (after server listening):
```javascript
// Start weather-adaptive signal monitoring
const weatherService = new WeatherAdaptiveSignal();
weatherService.startWeatherMonitoring().catch(error => {
  console.error('Weather monitoring startup error:', error);
});
```

### Step 2: Update environment variables
**Location**: `.env`

Add these configuration variables:
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# OpenWeatherMap API
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxx
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Payment Webhook
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Weather Monitoring
WEATHER_UPDATE_INTERVAL=60000  # 1 minute in milliseconds
```

### Step 3: Database Migrations (Optional but Recommended)

Run the following script to update existing parking spots:

**Create**: `backend/scripts/migrateToAdvancedFeatures.js`
```javascript
import ParkingSpot from '../models/ParkingSpot.js';
import TrafficSignal from '../models/TrafficSignal.js';

async function migrateData() {
  try {
    console.log('Starting migration to advanced features...');
    
    // Update parking spots - add shadow parking fields
    const updatedSpots = await ParkingSpot.updateMany(
      {},
      {
        $set: {
          isShadowParking: false,
          shadowPremium: 0.25,
          rating: 0,
          ratingCount: 0
        }
      }
    );
    
    console.log(`Updated ${updatedSpots.modifiedCount} parking spots`);
    
    // Update traffic signals - add weather metrics
    const updatedSignals = await TrafficSignal.updateMany(
      {},
      {
        $set: {
          weatherMetrics: {
            temperature: null,
            humidity: null,
            rainIntensity: 0,
            windSpeed: 0,
            weatherCondition: 'unknown',
            lastWeatherUpdate: null,
            timingAdjustment: {
              reason: 'No adjustment',
              greenAdjustment: 0,
              yellowAdjustment: 0,
              redAdjustment: 0
            }
          },
          syncedZone: null,
          syncedAt: null
        }
      }
    );
    
    console.log(`Updated ${updatedSignals.modifiedCount} traffic signals`);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
```

Run migration:
```bash
cd backend
node scripts/migrateToAdvancedFeatures.js
```

### Step 4: Create Shadow Parking Spots (Optional but Recommended)

**Create**: `backend/scripts/createShadowParking.js`
```javascript
import { ParkingAmenitiesService } from '../services/parkingAmenitiesService.js';
import mongoose from 'mongoose';

async function createShadowSpots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const amenitiesService = new ParkingAmenitiesService();
    
    const zones = ['ZONE-A', 'ZONE-B', 'ZONE-C', 'ZONE-D'];
    
    for (const zone of zones) {
      const spots = await amenitiesService.createShadowParkingSpots(zone, 10);
      console.log(`Created ${spots.length} shadow spots in ${zone}`);
    }
    
    console.log('Shadow parking creation completed');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Shadow parking creation failed:', error);
    process.exit(1);
  }
}

createShadowSpots();
```

Run:
```bash
cd backend
node scripts/createShadowParking.js
```

### Step 5: API Testing

**Test Weather Signals Endpoint:**
```bash
curl -X GET "http://localhost:5000/api/weather-signals" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Shadow Parking:**
```bash
curl -X GET "http://localhost:5000/api/parking-amenities/shadow/ZONE-A" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Nearby Amenities:**
```bash
curl -X GET "http://localhost:5000/api/parking-amenities/nearby/19.8762/75.3433?radius=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Payment Order Creation:**
```bash
curl -X POST "http://localhost:5000/api/payment/parking/create-order" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BOOKING_ID_HERE"}'
```

### Step 6: Frontend Integration

**Update Citizen Portal:**

1. Add to `frontend/src/services/api.js`:
```javascript
// Weather and amenities services
export const weatherAPI = {
  getSignalWithWeather: (signalId) => 
    api.get(`/weather-signals/${signalId}`),
  getForecast: (lat, lng) => 
    api.get(`/weather-signals/forecast/${lat}/${lng}`)
};

export const amenitiesAPI = {
  getShadowOptions: (zoneId) => 
    api.get(`/parking-amenities/shadow/${zoneId}`),
  getNearbyAmenities: (lat, lng, radius = 2) => 
    api.get(`/parking-amenities/nearby/${lat}/${lng}?radius=${radius}`),
  bookShadowParking: (spotId, duration) => 
    api.post('/parking-amenities/shadow/book', { spotId, duration })
};

export const paymentAPI = {
  createParkingOrder: (bookingId) => 
    api.post('/payment/parking/create-order', { bookingId }),
  verifyParkingPayment: (orderId, paymentId, signature) => 
    api.post('/payment/parking/verify', { orderId, paymentId, signature }),
  createChallanOrder: (challanId) => 
    api.post('/payment/challan/create-order', { challanId }),
  verifyChallanPayment: (orderId, paymentId, signature) => 
    api.post('/payment/challan/verify', { orderId, paymentId, signature }),
  getHistory: (type) => 
    api.get(`/payment/history?type=${type}`)
};
```

2. Add Socket.IO listeners to `frontend/src/services/socket.js`:
```javascript
export function setupRealtimeSync(userId) {
  socket.emit('register_user', userId);
  
  // Listen for parking updates
  socket.on('citizen_parking_booking_confirmed', (data) => {
    console.log('Parking booking confirmed:', data);
    // Update UI, show notification
  });
  
  // Listen for challan notifications
  socket.on('citizen_challan_notification', (data) => {
    console.log('Challan received:', data);
    // Show alert, update violations tab
  });
  
  // Listen for payment confirmations
  socket.on('citizen_payment_confirmed', (data) => {
    console.log('Payment confirmed:', data);
    // Update payment status, show receipt
  });
  
  // Listen for zone updates
  socket.on('zone_update', (data) => {
    console.log('Zone update:', data);
    // Refresh relevant data
  });
}
```

3. Create Razorpay checkout component in `frontend/src/components/PaymentCheckout.jsx`:
```jsx
import React, { useState } from 'react';
import { paymentAPI } from '../services/api';

export function PaymentCheckout({ bookingId, amount, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Create order
      const { data: orderData } = await paymentAPI.createParkingOrder(bookingId);
      
      // Initialize Razorpay
      const options = {
        key: orderData.razorpayKeyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        order_id: orderData.orderId,
        handler: async (response) => {
          // Verify payment
          const result = await paymentAPI.verifyParkingPayment(
            orderData.orderId,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          
          if (result.data.success) {
            onSuccess(result.data);
          } else {
            onError('Payment verification failed');
          }
        },
        prefill: {
          email: userEmail,
          contact: userPhone
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : `Pay ₹${amount}`}
    </button>
  );
}
```

### Step 7: Admin Dashboard Integration

**Update Admin Dashboard to listen for real-time updates:**

```javascript
// In AdminDashboard component
useEffect(() => {
  // Register for admin updates
  socket.emit('register_admin', adminId);
  
  // Listen for parking updates
  socket.on('admin_parking_booking_update', (data) => {
    // Update parking table in real-time
    setParkings(prev => [data.booking, ...prev]);
  });
  
  // Listen for challan updates
  socket.on('admin_challan_generated', (data) => {
    // Update violations/challans tab
    addChallan(data.challan);
  });
  
  // Listen for payment updates
  socket.on('admin_payment_received', (data) => {
    // Update revenue dashboard
    updateRevenueStats();
  });
  
  return () => {
    socket.off('admin_parking_booking_update');
    socket.off('admin_challan_generated');
    socket.off('admin_payment_received');
  };
}, []);
```

### Step 8: Verification

Check all features are working:

1. **Weather Signals**: Visit `/api/weather-signals` → Should return active signals
2. **Shadow Parking**: Query zone → Should return shadow spots with 25% premium
3. **Amenities**: Use coordinates → Should return nearby facilities
4. **Payment Order**: Create order → Should return Razorpay details
5. **Real-time Sync**: Book parking → Both portals should update instantly
6. **Admin Notifications**: Generate challan → Admin should get notification

### Step 9: Deploy

```bash
# Test locally
npm test

# Build for production
npm run build

# Deploy
git push origin main  # or your deployment command
```

## Troubleshooting Integration

### Weather Service Not Starting
- Check OpenWeatherMap API key is valid
- Verify coordinates are correct for test signals
- Check logs for API errors

### Payment Orders Not Created
- Verify Razorpay keys in .env
- Check booking exists and hasAmount
- Verify user has auth token

### Socket.IO Events Not Received
- Verify Socket.IO connection in browser DevTools
- Check user is registered with register_user event
- Verify event names match exactly
- Check for CORS issues

### Amenities Not Found
- Verify coordinates are in valid range
- Check amenities exist in database
- Test with known location (e.g., Solapur city center)

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run migrations
node backend/scripts/migrateToAdvancedFeatures.js
node backend/scripts/createShadowParking.js

# Start server
npm run dev

# Run tests
npm test

# Check specific endpoint
curl http://localhost:5000/api/weather-signals \
  -H "Authorization: Bearer TOKEN"
```

## Success Indicators

✅ All features properly integrated when:
- [ ] Weather-based signal timing adjusting in real-time
- [ ] Shadow parking bookable with 25% premium
- [ ] Amenities discoverable within 2km radius
- [ ] Parking bookings synced to admin dashboard in <100ms
- [ ] Challans appearing in citizen portal with notification
- [ ] Payment flow working end-to-end (Razorpay checkout to confirmation)
- [ ] Admin reports showing payment statistics

---

**Total Integration Time**: 2-3 hours
**Recommended Approach**: Follow steps sequentially, test after each step

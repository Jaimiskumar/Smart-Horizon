# Advanced Features Implementation Guide

## Overview
This guide covers the integration of advanced features for the Smart Traffic & Parking Management System:
1. Weather-Adaptive Signal Timing
2. Shadow Parking with Premium Pricing
3. Nearby Amenities Finder
4. Admin-Citizen Real-Time Portal Synchronization
5. Integrated Payment Gateway

## Features Created

### 1. Weather-Adaptive Signal Timing (`weatherAdaptiveSignal.js`)
**Purpose**: Dynamically adjust traffic signal timings based on real-time weather conditions

**Key Features**:
- Temperature-based adjustments (>45°C reduces waiting times)
- Rain-season adjustments
- Humidity and wind-speed considerations
- Cross-zone signal synchronization
- 1-minute update intervals with weather forecasting

**Adjustments Logic**:
- Temp >45°C: -10s green time
- Temp >40°C: -5s green time
- Rain: +10s green, +3s yellow, +10s red
- Humidity >80%: +1s yellow
- Wind >40kmh: +5s green

**Usage**:
```javascript
const weatherService = new WeatherAdaptiveSignal();
const weatherData = await weatherService.getWeatherData(lat, lng);
const adaptedTimings = weatherService.calculateAdaptiveTimings(baseTimings, weatherData);
```

### 2. Shadow Parking Service (`parkingAmenitiesService.js`)
**Purpose**: Manage premium parking with shade/cover and nearby amenity discovery

**Features**:
- Shadow parking spots at 25% premium pricing
- Automatic spot creation per zone
- Real-time availability tracking
- Amenity types: EV charging, CNG, Petrol, Diesel, Garage, Car Wash
- Booking management with premium calculation

**Usage**:
```javascript
const amenitiesService = new ParkingAmenitiesService();
const shadowSpots = await amenitiesService.getShadowParkingOptions(zoneId);
const amenities = await amenitiesService.getNearbyAmenities(lat, lng, radius);
```

### 3. Admin-Citizen Sync Service (`adminCitizenSyncService.js`)
**Purpose**: Real-time bidirectional synchronization between admin and citizen portals

**Sync Events**:
- Parking bookings → Admin parking tab (same zone)
- Challans → Citizen portal (registered vehicle)
- Payment updates → Both portals
- Zone-wide updates → All citizens in zone

**Socket.IO Events**:
```
Admin Events:
- admin_parking_booking_update
- admin_challan_generated
- admin_parking_status_change
- admin_payment_received
- admin_zone_update

Citizen Events:
- citizen_parking_booking_confirmed
- citizen_challan_notification
- citizen_payment_confirmed
- zone_<zoneId>_update
```

**Usage**:
```javascript
await adminCitizenSyncService.syncParkingBooking(booking);
await adminCitizenSyncService.syncChallan(challan);
await adminCitizenSyncService.syncPaymentStatus(challanNumber, status, txnId);
```

### 4. Payment Gateway Service (`paymentGatewayService.js`)
**Purpose**: Centralized Razorpay payment processing for parking and challans

**Features**:
- Parking booking payment orders
- Challan/fine payment orders
- Payment signature verification
- Automatic booking/challan status updates on payment
- Refund processing for cancelled bookings
- Payment history tracking

**Usage**:
```javascript
const paymentService = new PaymentGatewayService();
const order = await paymentService.createParkingPaymentOrder(bookingId, amount, userId);
await paymentService.handleParkingPaymentSuccess(orderId, paymentId, txnId);
```

## Model Updates

### ParkingSpot Model
**New Fields**:
```javascript
{
  isShadowParking: Boolean,          // Is this a shadow/premium spot
  shadowPremium: Number,             // Premium percentage (default 0.25 = 25%)
  amenities: [String],               // Nearby amenities
  features: [String],                // Special features
  rating: Number,                    // Customer rating
  ratingCount: Number                // Number of ratings
}
```

### TrafficSignal Model
**New Fields**:
```javascript
{
  weatherMetrics: {
    temperature: Number,
    humidity: Number,
    rainIntensity: Number,
    windSpeed: Number,
    weatherCondition: String,
    lastWeatherUpdate: Date,
    timingAdjustment: {
      reason: String,
      greenAdjustment: Number,
      yellowAdjustment: Number,
      redAdjustment: Number
    }
  },
  syncedZone: String,                // Zone ID for synchronization
  syncedAt: Date                     // Last sync timestamp
}
```

### PaymentTransaction Model
**Updated Fields**:
```javascript
{
  orderId: String (Razorpay order ID),
  type: String (parking|challan|fine|other),
  paymentMethod: String (razorpay|stripe|paypal),
  paymentId: String,
  signature: String,
  refundId: String,
  transactionId: String,
  status: String (pending|completed|failed|cancelled|refunded),
  completedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  failureReason: String
}
```

## API Routes

### Weather Signals Routes (`/api/weather-signals`)

**GET** `/api/weather-signals/:signalId`
- Get signal with weather-adjusted timings
- Returns: baseTimings and adaptedTimings

**GET** `/api/weather-signals/zone/:zoneId`
- Get all signals in zone with weather data
- Returns: All signals with adapted timings

**POST** `/api/weather-signals/update-weather`
- Manually trigger weather-based updates (Admin only)
- Body: `{ zoneId }`

**POST** `/api/weather-signals/sync-zones`
- Synchronize signal timings across zones (Admin only)

**GET** `/api/weather-signals/forecast/:lat/:lng`
- Get 3-hour weather forecast

**GET** `/api/weather-signals`
- Get all signals with monitoring status

### Parking Amenities Routes (`/api/parking-amenities`)

**GET** `/api/parking-amenities/shadow/:zoneId`
- Get shadow parking options with pricing
- Returns: Shadow spots with 25% premium pricing

**POST** `/api/parking-amenities/shadow/book`
- Book shadow parking with premium
- Body: `{ spotId, duration }`

**GET** `/api/parking-amenities/nearby/:latitude/:longitude?radius=2`
- Get nearby amenities (EV, CNG, petrol, garage, car wash)
- Query: `radius` in km (default 2km)

**GET** `/api/parking-amenities/zone/:zoneId/full`
- Get complete zone view with amenities

**POST** `/api/parking-amenities/shadow/create`
- Create shadow spots in zone (Admin only)
- Body: `{ zoneId, count }`

**GET** `/api/parking-amenities/recommendations/:userId`
- Get personalized parking recommendations

**GET** `/api/parking-amenities/stats/:zoneId`
- Get parking and amenities statistics

### Payment Gateway Routes (`/api/payment`)

**POST** `/api/payment/parking/create-order`
- Create Razorpay order for parking booking
- Body: `{ bookingId }`
- Returns: `{ orderId, amount, razorpayKeyId }`

**POST** `/api/payment/parking/verify`
- Verify parking payment and confirm booking
- Body: `{ orderId, paymentId, signature }`

**POST** `/api/payment/challan/create-order`
- Create Razorpay order for challan payment
- Body: `{ challanId }`

**POST** `/api/payment/challan/verify`
- Verify challan payment
- Body: `{ orderId, paymentId, signature }`

**GET** `/api/payment/status/:orderId`
- Get payment order status

**GET** `/api/payment/history?type=parking|challan`
- Get user's payment history

**POST** `/api/payment/parking/refund`
- Refund parking payment for cancelled booking
- Body: `{ bookingId }`

**GET** `/api/payment/admin/reports?range=7`
- Get payment reports (Admin only)
- Query: `range` in days

**POST** `/api/payment/webhook/razorpay`
- Razorpay webhook handler (no auth required)

## Server Integration

Add these imports to `server.js`:

```javascript
import weatherSignalsRoutes from './routes/weatherSignals.js';
import parkingAmenitiesRoutes from './routes/parkingAmenities.js';
import paymentGatewayRoutes from './routes/paymentGateway.js';
import { WeatherAdaptiveSignal } from './services/weatherAdaptiveSignal.js';
import { adminCitizenSyncService } from './services/adminCitizenSyncService.js';
```

Add these routes:

```javascript
app.use('/api/weather-signals', weatherSignalsRoutes);
app.use('/api/parking-amenities', parkingAmenitiesRoutes);
app.use('/api/payment', paymentGatewayRoutes);
```

Add Socket.IO event handlers:

```javascript
// Register Socket.IO handlers for real-time updates
io.on('connection', (socket) => {
  socket.on('register_user', (userId) => {
    adminCitizenSyncService.registerUserConnection(userId, socket.id);
  });

  socket.on('disconnect', () => {
    // User socket map will be cleaned up on disconnect
  });
});

// Start weather monitoring
const weatherService = new WeatherAdaptiveSignal();
weatherService.startWeatherMonitoring();
```

## Frontend Integration

### For Citizen Portal

1. **Parking booking with shadow option**:
```javascript
// Show shadow parking option during booking
const shadowOptions = await fetch('/api/parking-amenities/shadow/:zoneId').json();
// Display with premium price calculation

// Book shadow parking
const booking = await fetch('/api/parking-amenities/shadow/book', {
  method: 'POST',
  body: JSON.stringify({ spotId, duration })
});

// Create payment order
const order = await fetch('/api/payment/parking/create-order', {
  method: 'POST',
  body: JSON.stringify({ bookingId })
});
```

2. **Nearby amenities discovery**:
```javascript
// Get user location
const { latitude, longitude } = await getUserLocation();

// Fetch nearby amenities
const amenities = await fetch(
  `/api/parking-amenities/nearby/${latitude}/${longitude}?radius=2`
).json();

// Display amenity categories on map
```

3. **Real-time sync via Socket.IO**:
```javascript
const socket = io();

socket.emit('register_user', userId);

// Listen for parking booking updates
socket.on('citizen_parking_booking_confirmed', (data) => {
  showNotification(data.message);
  updateDashboard();
});

// Listen for challan notifications
socket.on('citizen_challan_notification', (data) => {
  showAlert(data.message);
  updateViolations();
});

// Listen for payment confirmations
socket.on('citizen_payment_confirmed', (data) => {
  updatePaymentStatus(data.receipt);
});
```

### For Admin Dashboard

1. **Real-time parking monitoring**:
```javascript
socket.on('admin_parking_booking_update', (data) => {
  updateParkingTable(data.booking);
  refreshAvailabilityMap();
});

socket.on('admin_parking_status_change', (data) => {
  updateSpotStatus(data.spotId, data.newStatus);
});
```

2. **Challan/Violation management**:
```javascript
socket.on('admin_challan_generated', (data) => {
  addToChallanTable(data.challan);
  updateViolationStats();
});
```

3. **Weather-based signal management**:
```javascript
socket.on('admin_zone_update', (data) => {
  if (data.updateType === 'weather_signal_update') {
    refreshSignalTimings(data.zone.zoneId);
  }
});
```

## Environment Configuration

Add to `.env`:

```
# Razorpay Keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# OpenWeatherMap API
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# Port for Payment Webhook
PAYMENT_WEBHOOK_PORT=5000
```

## Testing

### Test Weather Adjustments
```bash
curl -X GET "http://localhost:5000/api/weather-signals/forecast/19.8762/75.3433"
```

### Test Shadow Parking Booking
```bash
curl -X POST "http://localhost:5000/api/parking-amenities/shadow/book" \
  -H "Authorization: Bearer <token>" \
  -d '{"spotId":"Z001-S001","duration":2}'
```

### Test Payment Order Creation
```bash
curl -X POST "http://localhost:5000/api/payment/parking/create-order" \
  -H "Authorization: Bearer <token>" \
  -d '{"bookingId":"<booking_id>"}'
```

### Test Nearby Amenities
```bash
curl -X GET "http://localhost:5000/api/parking-amenities/nearby/19.8762/75.3433?radius=2" \
  -H "Authorization: Bearer <token>"
```

## Real-Time Sync Flow

### Parking Booking Sync
```
1. Citizen books parking (frontend)
   ↓
2. Backend creates booking → triggers adminCitizenSyncService.syncParkingBooking()
   ↓
3. Socket.IO broadcasts:
   - admin_parking_booking_update → Admin dashboard
   - citizen_parking_booking_confirmed → Citizen (optional notification)
   ↓
4. Admin dashboard updates parking table in real-time
```

### Challan Sync
```
1. ML model detects violation → Admin generates challan
   ↓
2. Backend saves challan → triggers adminCitizenSyncService.syncChallan()
   ↓
3. Socket.IO broadcasts:
   - admin_challan_generated → Admin dashboard statistics
   - citizen_challan_notification → Citizen whose vehicle matched
   ↓
4. Citizen gets notification with payment link
5. Citizen pays → triggers payment sync
6. Both portals updated with payment status
```

### Payment Sync
```
1. User initiates payment (Razorpay)
   ↓
2. Razorpay webhook → /api/payment/webhook/razorpay
   ↓
3. Backend verifies signature and updates transaction
   ↓
4. Calls appropriate sync:
   - For parking: adminCitizenSyncService.syncParkingBooking()
   - For challan: adminCitizenSyncService.syncPaymentStatus()
   ↓
5. Both portals reflect payment
```

## Performance Considerations

1. **Weather Updates**: 1-minute intervals (configurable)
2. **Caching**: Weather data cached for 5 minutes
3. **Database Indexes**: Added on zoneId, signalId, userId, type for queries
4. **Socket.IO Broadcasting**: Uses namespaces for zone-specific updates
5. **Stream Processing**: Weather updates processed asynchronously

## Error Handling

All services include comprehensive error handling:
- Invalid coordinates validation
- Zone/signal existence verification
- Payment signature verification
- User ownership verification
- Transaction idempotency

## Troubleshooting

### Weather API Unavailable
Service falls back to demo data (clear weather, normal timings).

### Payment Verification Fails
Check Razorpay secret key configuration and signature calculation.

### Socket.IO Events Not Received
Verify user is registered with `register_user` event and socket connection is established.

### Sync Updates Delayed
Check Socket.IO connection status and database transaction logs.

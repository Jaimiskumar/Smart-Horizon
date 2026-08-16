# Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## Installation Steps

### 1. Install MongoDB
**Windows:**
- Download from https://www.mongodb.com/try/download/community
- Install and start MongoDB service
- Default connection: `mongodb://localhost:27017`

**Or use MongoDB Atlas (Cloud):**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create cluster and get connection string
- Update `MONGODB_URI` in backend/.env

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/traffic_management
JWT_ACCESS_SECRET=replace_with_long_random_access_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
JWT_REFRESH_TTL=30d
PAYMENT_PROVIDER=mock
# For Razorpay:
# PAYMENT_PROVIDER=razorpay
# RAZORPAY_KEY_ID=rzp_test_xxxxx
# RAZORPAY_KEY_SECRET=xxxxx
# RAZORPAY_WEBHOOK_SECRET=xxxxx
NODE_ENV=development
```

Start backend:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend will run on http://localhost:3000

## Default Login Credentials

### Admin Account
- Email: `admin@traffic.gov`
- Password: `admin123`

### Citizen Account
- Email: `citizen@example.com`
- Password: `citizen123`

## System Features

### Admin Dashboard
1. **Traffic Monitoring**
   - Real-time traffic signal status
   - Vehicle count and congestion levels
   - Automated signal timing based on AI analysis
   - Inter-signal coordination

2. **Parking Management**
   - View all parking spots
   - Monitor occupancy status
   - Zone-wise filtering

3. **Violation Management**
   - Issue parking fines
   - Track violation status
   - Cancel fines if needed

4. **Emergency Control**
   - Monitor emergency vehicles
   - Green corridor management
   - Route tracking

5. **Analytics**
   - Traffic statistics
   - Revenue reports
   - System performance metrics

### Citizen Portal
1. **Parking Booking**
   - Search available spots
   - Book parking online
   - Real-time availability

2. **My Bookings**
   - View active reservations
   - Release parking spots
   - Booking history

3. **My Fines**
   - View pending fines
   - Pay fines online
   - Payment history
   - Illegal parking warnings

## Architecture

### Backend (Node.js + Express)
- RESTful API
- MongoDB database
- Socket.io for real-time updates
- JWT authentication
- Traffic simulation service

### Frontend (React + Vite)
- Modern React with hooks
- TailwindCSS for styling
- Recharts for analytics
- Socket.io client for live updates
- Responsive design

### Real-time Features
- Live traffic signal updates
- Instant parking availability
- Emergency vehicle tracking
- Fine notifications

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - Revoke refresh token

### Traffic
- GET `/api/traffic/signals` - Get all signals
- PUT `/api/traffic/signals/:id` - Update signal

### Parking
- GET `/api/parking/spots` - Get parking spots
- POST `/api/parking/book` - Book parking
- POST `/api/parking/release/:spotId` - Release parking
- GET `/api/parking/my-bookings` - Get user bookings

### Fines
- GET `/api/fines` - Get fines
- POST `/api/fines/issue` - Issue fine (admin)
- POST `/api/fines/:id/pay` - Pay fine (mock mode compatibility)
- DELETE `/api/fines/:id` - Cancel fine (admin)

### Payments
- POST `/api/payments/orders` - Create parking/fine payment order
- POST `/api/payments/confirm` - Confirm provider payment signature
- POST `/api/payments/webhook/razorpay` - Razorpay webhook endpoint
- GET `/api/payments/transactions` - View payment transactions

### Audit
- GET `/api/audit` - View recent admin audit logs (admin only)

### Emergency
- GET `/api/emergency` - Get active emergencies
- POST `/api/emergency/activate` - Activate green corridor
- PUT `/api/emergency/:id/complete` - Complete emergency

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in .env
- Verify port 27017 is not blocked

### Port Already in Use
- Backend: Change PORT in .env
- Frontend: Change port in vite.config.js

### CORS Issues
- Backend already configured for CORS
- Check proxy settings in vite.config.js

## Production Deployment

### Backend
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Configure MongoDB Atlas
4. Deploy to Heroku/AWS/DigitalOcean

### Frontend
1. Build: `npm run build`
2. Deploy dist folder to Netlify/Vercel
3. Update API URL in production

## Support
For issues or questions, check the code comments or create an issue in the repository.

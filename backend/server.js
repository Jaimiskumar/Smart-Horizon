import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import trafficRoutes from './routes/traffic.js';
import parkingRoutes from './routes/parking.js';
import fineRoutes from './routes/fines.js';
import emergencyRoutes from './routes/emergency.js';
import encroachmentRoutes from './routes/encroachment.js';
import illegalParkingRoutes from './routes/illegalParking.js';
import paymentRoutes, { razorpayWebhookHandler } from './routes/payments.js';
import auditRoutes from './routes/audit.js';
import roadIssueRoutes from './routes/roadIssues.js';
import cameraRoutes from './routes/cameras.js';
import violationsRoutes from './routes/violations.js';
import streetEncroachmentRoutes from './routes/streetEncroachment.js';
import trafficSignalsRoutes from './routes/trafficSignals.js';
import mlDetectionRoutes from './routes/mlDetection.js';
import documentRoutes from './routes/documentRoutes.js';
import citizenReportRoutes from './routes/citizenReportRoutes.js';
import signalCoordinationRoutes from './routes/signalCoordinationRoutes.js';
import challanRoutes from './routes/challanRoutes.js';
import adminReportsRoutes from './routes/adminReports.js';
import emergencyVehicleRoutes from './routes/emergencyRoutes.js';
import parkingAmenitiesRoutes from './routes/parkingAmenities.js';
import urbanflowRoutes from './routes/urbanflow.js';
import bangaloreRoutes from './routes/bangaloreRoutes.js';
import { initializeTrafficSimulation } from './services/trafficSimulator.js';
import User from './models/User.js';
import { env } from './config/env.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN }
});
app.set('io', io);

const corsOptions = {
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((item) => item.trim())
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1,
      socketio: !!io,
      ml_backend: true // We'll check this later
    }
  });
});

// Webhook route must parse the raw body for signature verification.
app.post(
  '/api/payments/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  razorpayWebhookHandler
);

// Increase JSON body size limit to handle base64 encoded images/video frames
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/public', express.static('public'));
app.use('/uploads', express.static('uploads'));

async function seedDefaultUsers() {
  const adminExists = await User.findOne({ email: env.DEFAULT_ADMIN_EMAIL });
  if (!adminExists) {
    const admin = new User({
      name: 'Admin',
      email: env.DEFAULT_ADMIN_EMAIL,
      password: env.DEFAULT_ADMIN_PASSWORD,
      role: 'admin',
      phone: env.DEFAULT_ADMIN_PHONE
    });
    await admin.save();
    console.log(`Default admin user created (${env.DEFAULT_ADMIN_EMAIL})`);
  }

  const citizenExists = await User.findOne({ email: env.DEFAULT_CITIZEN_EMAIL });
  if (!citizenExists) {
    const citizen = new User({
      name: 'Citizen',
      email: env.DEFAULT_CITIZEN_EMAIL,
      password: env.DEFAULT_CITIZEN_PASSWORD,
      role: 'citizen',
      phone: env.DEFAULT_CITIZEN_PHONE
    });
    await citizen.save();
    console.log(`Default citizen user created (${env.DEFAULT_CITIZEN_EMAIL})`);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/parking-amenities', parkingAmenitiesRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/encroachments', encroachmentRoutes);
app.use('/api/illegal-parking', illegalParkingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/road-issues', roadIssueRoutes);

// ML-based traffic and parking enforcement system
app.use('/api/cameras', cameraRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/street-encroachment', streetEncroachmentRoutes);
app.use('/api/traffic-signals', trafficSignalsRoutes);
app.use('/api/ml-detection', mlDetectionRoutes);

// Citizen document management and reporting
app.use('/api/documents', documentRoutes);
app.use('/api/citizen-reports', citizenReportRoutes);

// Signal coordination for zero traffic optimization
app.use('/api/signal-coordination', signalCoordinationRoutes);

// Challan management and payment
app.use('/api/challans', challanRoutes);

// Admin reports and daily analytics
app.use('/api/admin-reports', adminReportsRoutes);

// Emergency vehicle detection and green corridor management
app.use('/api/emergency-vehicles', emergencyVehicleRoutes);

// UrbanFlow Multi-Agent AI Engine Integration
app.use('/api/urbanflow', urbanflowRoutes);

// Bangalore Geospatial Intelligence Layer
app.use('/api/bangalore', bangaloreRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Please stop the running server or set PORT to a different value.`);
  } else {
    console.error('HTTP server error:', error);
  }
  process.exit(1);
});

async function startServer() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected');

  await seedDefaultUsers();
  await initializeTrafficSimulation(io);

  httpServer.listen(env.PORT, '127.0.0.1', () => {
    console.log(`====================================================`);
    console.log(`🚀 SOLAPUR SMART CITY SERVER RUNNING ON PORT ${env.PORT}`);
    console.log(`📡 REAL-TIME SOCKET.IO ENGINE: [ONLINE]`);
    console.log(`💳 PAYMENT GATEWAY (${env.PAYMENT_PROVIDER}): [ACTIVE]`);
    console.log(`🌍 CITY TRAFFIC SIMULATION: [LOADED]`);
    console.log(`====================================================`);
  });

}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

export { io };

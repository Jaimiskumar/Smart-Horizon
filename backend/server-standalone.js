import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import urbanflowRoutes from './routes/urbanflow.js';
import bangaloreRoutes from './routes/bangaloreRoutes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/api/urbanflow', urbanflowRoutes);
app.use('/api/bangalore', bangaloreRoutes);


// In-memory data storage
const users = [
  {
    _id: '1',
    name: 'Admin User',
    email: 'admin@traffic.gov',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin'
  },
  {
    _id: '2',
    name: 'John Citizen',
    email: 'citizen@example.com',
    password: bcrypt.hashSync('citizen123', 10),
    role: 'citizen',
    vehicleNumber: 'ABC-1234'
  }
];

let trafficSignals = [];
let parkingSpots = [];
let fines = [];
let emergencies = [];
let encroachments = [];
let illegalParkingViolations = [];

// ============================================
// CONCURRENCY CONTROL FOR ATOMIC BOOKING
// ============================================

// Track locks for each parking spot (prevents simultaneous modifications)
const spotLocks = new Map();

// Track version numbers for optimistic consistency checking
const spotVersions = new Map();

// Pessimistic locking: Acquire exclusive lock on a spot
const acquireLock = async (spotId, timeout = 5000) => {
  const startTime = Date.now();
  const lockKey = `lock_${spotId}`;
  
  while (true) {
    if (!spotLocks.has(lockKey)) {
      spotLocks.set(lockKey, {
        acquiredAt: Date.now(),
        spotId: spotId
      });
      return true;
    }
    
    // Check if lock has timed out (deadlock prevention)
    const lock = spotLocks.get(lockKey);
    if (Date.now() - lock.acquiredAt > 30000) { // 30 second timeout
      spotLocks.delete(lockKey);
      spotLocks.set(lockKey, {
        acquiredAt: Date.now(),
        spotId: spotId
      });
      return true;
    }
    
    // If still locked and not timed out, wait and retry
    if (Date.now() - startTime > timeout) {
      throw new Error('Spot is currently being booked by another user. Please try again.');
    }
    
    // Wait 20ms before retrying
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};

// Release the lock
const releaseLock = (spotId) => {
  const lockKey = `lock_${spotId}`;
  spotLocks.delete(lockKey);
};

// Get current version of a spot
const getSpotVersion = (spotId) => {
  const versionKey = `version_${spotId}`;
  return spotVersions.get(versionKey) || 0;
};

// Increment version on successful update
const incrementSpotVersion = (spotId) => {
  const versionKey = `version_${spotId}`;
  const current = getSpotVersion(spotId);
  spotVersions.set(versionKey, current + 1);
  return current + 1;
};

// Atomic check-and-set: Verify state hasn't changed before updating
const atomicUpdate = (spot, expectedVersion, updateFn) => {
  const currentVersion = getSpotVersion(spot.spotId);
  
  if (currentVersion !== expectedVersion) {
    throw new Error('Spot state changed. Another user may have booked it. Please refresh.');
  }
  
  updateFn(spot);
  incrementSpotVersion(spot.spotId);
  
  return {
    spot: spot,
    newVersion: currentVersion + 1
  };
};

// Initialize data
function initializeData() {
  const INTERSECTIONS = [
    { signalId: 'SIG001', name: 'Main St & 1st Ave', lat: 40.7128, lng: -74.0060 },
    { signalId: 'SIG002', name: 'Main St & 2nd Ave', lat: 40.7138, lng: -74.0070 },
    { signalId: 'SIG003', name: 'Park Ave & 1st St', lat: 40.7148, lng: -74.0080 },
    { signalId: 'SIG004', name: 'Park Ave & 2nd St', lat: 40.7158, lng: -74.0090 },
    { signalId: 'SIG005', name: 'Broadway & 5th Ave', lat: 40.7168, lng: -74.0100 },
    { signalId: 'SIG006', name: 'Central Plaza', lat: 40.7178, lng: -74.0110 }
  ];

  trafficSignals = INTERSECTIONS.map(intersection => ({
    signalId: intersection.signalId,
    location: {
      name: intersection.name,
      lat: intersection.lat,
      lng: intersection.lng
    },
    status: 'green',
    currentTimer: 30,
    vehicleCount: Math.floor(Math.random() * 50),
    congestionLevel: 'low',
    connectedSignals: INTERSECTIONS
      .filter(i => i.signalId !== intersection.signalId)
      .slice(0, 2)
      .map(i => i.signalId),
    mode: 'auto',
    lastUpdated: new Date()
  }));

  const PARKING_ZONES = [
    { zone: 'Zone 1', count: 20, lat: 40.7128, lng: -74.0060 },
    { zone: 'Zone 2', count: 15, lat: 40.7138, lng: -74.0070 },
    { zone: 'Zone 3', count: 25, lat: 40.7148, lng: -74.0080 },
    { zone: 'Zone 4', count: 18, lat: 40.7158, lng: -74.0090 },
    { zone: 'Zone 5', count: 22, lat: 40.7168, lng: -74.0100 },
    { zone: 'Zone 6', count: 30, lat: 40.7178, lng: -74.0110 },
    { zone: 'Zone 7', count: 12, lat: 40.7188, lng: -74.0120 },
    { zone: 'Zone 8', count: 16, lat: 40.7198, lng: -74.0130 }
  ];

  parkingSpots = [];
  for (const zone of PARKING_ZONES) {
    for (let i = 1; i <= zone.count; i++) {
      parkingSpots.push({
        spotId: `${zone.zone}-${String(i).padStart(3, '0')}`,
        zone: zone.zone,
        location: {
          name: `${zone.zone} Parking`,
          lat: zone.lat + (Math.random() - 0.5) * 0.01,
          lng: zone.lng + (Math.random() - 0.5) * 0.01
        },
        status: Math.random() > 0.3 ? 'available' : 'occupied',
        type: Math.random() > 0.9 ? 'disabled' : 'regular',
        pricePerHour: 20,
        currency: 'INR'
      });
    }
  }

  console.log('✅ Data initialized');
}

// Auth middleware
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      'secret',
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      'secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vehicleNumber: user.vehicleNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, vehicleNumber } = req.body;
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = {
      _id: String(users.length + 1),
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: role || 'citizen',
      phone,
      vehicleNumber
    };
    
    users.push(user);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      'secret',
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      'secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vehicleNumber: user.vehicleNumber,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    
    const decoded = jwt.verify(refreshToken, 'secret');
    const user = users.find(u => u._id === decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    
    const token = jwt.sign({ userId: user._id, role: user.role }, 'secret', { expiresIn: '7d' });
    const newRefreshToken = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '30d' });
    res.json({ token, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Traffic routes
app.get('/api/traffic/signals', authMiddleware, (req, res) => {
  res.json(trafficSignals);
});

app.get('/api/traffic/signals/:id', authMiddleware, (req, res) => {
  const signal = trafficSignals.find(s => s.signalId === req.params.id);
  res.json(signal);
});

app.put('/api/traffic/signals/:id', authMiddleware, adminOnly, (req, res) => {
  const index = trafficSignals.findIndex(s => s.signalId === req.params.id);
  if (index !== -1) {
    trafficSignals[index] = { ...trafficSignals[index], ...req.body };
    res.json(trafficSignals[index]);
  } else {
    res.status(404).json({ message: 'Signal not found' });
  }
});

// Parking routes
app.get('/api/parking/spots', authMiddleware, (req, res) => {
  const { zone, status } = req.query;
  let filtered = parkingSpots;
  
  if (zone) filtered = filtered.filter(s => s.zone === zone);
  if (status) filtered = filtered.filter(s => s.status === status);
  
  res.json(filtered);
});

app.post('/api/parking/book', authMiddleware, async (req, res) => {
  const { spotId, vehicleNumber, duration } = req.body;
  let locked = false;
  
  try {
    // Step 1: Acquire exclusive lock on the spot
    locked = await acquireLock(spotId);
    
    // Step 2: Verify spot exists and is available (double-check after acquiring lock)
    const spot = parkingSpots.find(s => s.spotId === spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }
    
    if (spot.status !== 'available') {
      return res.status(400).json({ 
        message: `Spot is ${spot.status}. Cannot book at this time.`,
        currentStatus: spot.status
      });
    }
    
    // Step 3: Get pre-lock version and perform atomic update
    const preBookVersion = getSpotVersion(spotId);
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    
    // Step 4: Atomic update with version check
    const result = atomicUpdate(spot, preBookVersion, (s) => {
      s.status = 'reserved';
      s.currentBooking = {
        userId: req.user.userId,
        vehicleNumber,
        startTime,
        endTime,
        bookedAt: new Date()
      };
    });
    
    // Step 5: Success response with version info for future operations
    res.json({ 
      message: 'Booking successful!',
      spot: result.spot,
      bookingVersion: result.newVersion,
      bookingId: `BOOK${Date.now()}`
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Booking failed'
    });
  } finally {
    // Always release the lock
    if (locked) {
      releaseLock(spotId);
    }
  }
});

app.post('/api/parking/release/:spotId', authMiddleware, async (req, res) => {
  const spotId = req.params.spotId;
  let locked = false;
  
  try {
    // Step 1: Acquire exclusive lock on the spot
    locked = await acquireLock(spotId);
    
    // Step 2: Find the spot
    const spot = parkingSpots.find(s => s.spotId === spotId);
    if (!spot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }
    
    // Step 3: Verify user owns this booking
    if (spot.currentBooking && spot.currentBooking.userId !== req.user.userId) {
      return res.status(403).json({ 
        message: 'You can only release spots you have booked'
      });
    }
    
    if (spot.status === 'available') {
      return res.status(400).json({ 
        message: 'Spot is already available. No booking to release.'
      });
    }
    
    // Step 4: Get pre-release version and perform atomic update
    const preReleaseVersion = getSpotVersion(spotId);
    
    // Step 5: Atomic update with version check
    const result = atomicUpdate(spot, preReleaseVersion, (s) => {
      s.status = 'available';
      s.currentBooking = undefined;
      s.releasedAt = new Date();
    });
    
    // Step 6: Success response
    res.json({ 
      message: 'Spot released successfully',
      spot: result.spot,
      releaseVersion: result.newVersion
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Release failed'
    });
  } finally {
    // Always release the lock
    if (locked) {
      releaseLock(spotId);
    }
  }
});

app.get('/api/parking/my-bookings', authMiddleware, (req, res) => {
  const bookings = parkingSpots.filter(s => 
    s.currentBooking && s.currentBooking.userId === req.user.userId
  );
  res.json(bookings);
});

app.post('/api/parking/send-alert', authMiddleware, adminOnly, (req, res) => {
  try {
    const { vehicleNumber, violationType, zone, message } = req.body;
    
    // Broadcast alert to all connected clients
    io.emit('violation-alert', {
      timestamp: new Date(),
      vehicleNumber,
      violationType,
      zone,
      message,
      alertId: `ALERT${Date.now()}`,
      severity: violationType === 'No Parking Zone' ? 'high' : 'medium'
    });

    res.json({ 
      message: 'Alert sent successfully',
      alert: {
        vehicleNumber,
        violationType,
        zone,
        sentAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fine routes
app.get('/api/fines', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json(fines);
  }
  
  const user = users.find(u => u._id === req.user.userId);
  if (!user || !user.vehicleNumber) {
    return res.json([]);
  }
  
  const filtered = fines.filter(f => f.vehicleNumber === user.vehicleNumber);
  res.json(filtered);
});

app.post('/api/fines/issue', authMiddleware, adminOnly, (req, res) => {
  try {
    const { vehicleNumber, violationType, amount, location, imageUrl } = req.body;
    
    const fine = {
      _id: String(fines.length + 1),
      fineId: `FINE${Date.now()}`,
      vehicleNumber,
      violationType,
      amount,
      location,
      imageUrl,
      status: 'pending',
      warningIssued: true,
      warningTime: new Date(),
      issuedAt: new Date()
    };
    
    fines.push(fine);
    res.status(201).json(fine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/fines/:id/pay', authMiddleware, (req, res) => {
  try {
    const fine = fines.find(f => f._id === req.params.id);
    if (!fine) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    fine.status = 'paid';
    fine.paidAt = new Date();

    res.json({ message: 'Fine paid successfully', fine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/fines/:id', authMiddleware, adminOnly, (req, res) => {
  const index = fines.findIndex(f => f._id === req.params.id);
  if (index !== -1) {
    fines.splice(index, 1);
    res.json({ message: 'Fine cancelled' });
  } else {
    res.status(404).json({ message: 'Fine not found' });
  }
});

// Emergency routes
app.get('/api/emergency', authMiddleware, (req, res) => {
  const active = emergencies.filter(e => e.status === 'active');
  res.json(active);
});

app.post('/api/emergency/activate', authMiddleware, adminOnly, (req, res) => {
  try {
    const { vehicleId, vehicleType, currentLocation, destination, route } = req.body;
    
    const emergency = {
      _id: String(emergencies.length + 1),
      vehicleId,
      vehicleType,
      status: 'active',
      currentLocation,
      destination,
      route,
      estimatedArrival: new Date(Date.now() + 15 * 60 * 1000),
      startTime: new Date()
    };
    
    emergencies.push(emergency);
    io.emit('emergency-activated', emergency);
    res.status(201).json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/emergency/:id/complete', authMiddleware, adminOnly, (req, res) => {
  try {
    const emergency = emergencies.find(e => e._id === req.params.id);
    if (emergency) {
      emergency.status = 'completed';
      emergency.endTime = new Date();
      io.emit('emergency-completed', emergency);
      res.json(emergency);
    } else {
      res.status(404).json({ message: 'Emergency not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Encroachment routes
app.get('/api/encroachments', authMiddleware, (req, res) => {
  res.json(encroachments);
});

app.get('/api/encroachments/:id', authMiddleware, (req, res) => {
  const encroachment = encroachments.find(e => e.id === req.params.id);
  if (encroachment) {
    res.json(encroachment);
  } else {
    res.status(404).json({ message: 'Encroachment not found' });
  }
});

app.put('/api/encroachments/:id/resolve', authMiddleware, adminOnly, (req, res) => {
  try {
    const encroachment = encroachments.find(e => e.id === req.params.id);
    if (encroachment) {
      encroachment.status = 'resolved';
      encroachment.resolvedAt = new Date();
      io.emit('encroachment-resolved', encroachment);
      res.json(encroachment);
    } else {
      res.status(404).json({ message: 'Encroachment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/encroachments/:id/ignore', authMiddleware, adminOnly, (req, res) => {
  try {
    const encroachment = encroachments.find(e => e.id === req.params.id);
    if (encroachment) {
      encroachment.status = 'ignored';
      io.emit('encroachment-ignored', encroachment);
      res.json(encroachment);
    } else {
      res.status(404).json({ message: 'Encroachment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Illegal Parking Detection routes
app.get('/api/illegal-parking', authMiddleware, (req, res) => {
  res.json(illegalParkingViolations);
});

app.get('/api/illegal-parking/:id', authMiddleware, (req, res) => {
  const violation = illegalParkingViolations.find(v => v.id === req.params.id);
  if (violation) {
    res.json(violation);
  } else {
    res.status(404).json({ message: 'Violation not found' });
  }
});

app.post('/api/illegal-parking/:id/send-alert', authMiddleware, adminOnly, async (req, res) => {
  try {
    const violation = illegalParkingViolations.find(v => v.id === req.params.id);
    if (violation) {
      violation.alertSent = true;
      violation.alertDetails = {
        alertId: `ALT${Date.now()}`,
        sentAt: new Date(),
        recipient: violation.authority.name,
        method: 'SMS + App Notification'
      };
      violation.status = 'alert-sent';
      io.emit('illegal-parking-alert-sent', violation);
      res.json(violation);
    } else {
      res.status(404).json({ message: 'Violation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/illegal-parking/:id/issue-fine', authMiddleware, adminOnly, async (req, res) => {
  try {
    const violation = illegalParkingViolations.find(v => v.id === req.params.id);
    if (violation) {
      const fine = {
        _id: String(fines.length + 1),
        vehicleNumber: violation.licensePlate,
        violationType: violation.violationType,
        amount: violation.fineAmount,
        location: violation.location,
        imageUrl: violation.imageUrl,
        status: 'pending',
        issuedAt: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        paymentLink: `https://traffic.gov.in/pay/${violation.id}`
      };
      
      fines.push(fine);
      violation.status = 'fine-issued';
      violation.fineDetails = {
        fineId: fine._id,
        dueDate: fine.dueDate
      };
      
      io.emit('illegal-parking-fine-issued', { violation, fine });
      res.json({ violation, fine });
    } else {
      res.status(404).json({ message: 'Violation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/illegal-parking/:id/dismiss', authMiddleware, adminOnly, (req, res) => {
  try {
    const violation = illegalParkingViolations.find(v => v.id === req.params.id);
    if (violation) {
      violation.status = 'dismissed';
      violation.dismissedReason = req.body.reason || 'False positive';
      io.emit('illegal-parking-dismissed', violation);
      res.json(violation);
    } else {
      res.status(404).json({ message: 'Violation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/illegal-parking/stats/summary', authMiddleware, (req, res) => {
  const stats = {
    total: illegalParkingViolations.length,
    detected: illegalParkingViolations.filter(v => v.status === 'detected').length,
    alertSent: illegalParkingViolations.filter(v => v.status === 'alert-sent').length,
    fineIssued: illegalParkingViolations.filter(v => v.status === 'fine-issued').length,
    paid: illegalParkingViolations.filter(v => v.status === 'paid').length,
    dismissed: illegalParkingViolations.filter(v => v.status === 'dismissed').length,
    totalFineAmount: illegalParkingViolations
      .filter(v => v.status === 'fine-issued' || v.status === 'paid')
      .reduce((sum, v) => sum + v.fineAmount, 0),
    collectedAmount: illegalParkingViolations
      .filter(v => v.status === 'paid')
      .reduce((sum, v) => sum + v.fineAmount, 0)
  };
  res.json(stats);
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Traffic simulation
function startTrafficSimulation() {
  setInterval(() => {
    trafficSignals.forEach(signal => {
      if (signal.mode === 'auto') {
        const vehicleCount = Math.floor(Math.random() * 100);
        let congestionLevel = 'low';
        let timer = 30;

        if (vehicleCount > 70) {
          congestionLevel = 'high';
          timer = 60;
        } else if (vehicleCount > 40) {
          congestionLevel = 'medium';
          timer = 45;
        }

        const statuses = ['green', 'yellow', 'red'];
        const currentIndex = statuses.indexOf(signal.status);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        signal.vehicleCount = vehicleCount;
        signal.congestionLevel = congestionLevel;
        signal.currentTimer = timer;
        signal.status = nextStatus;
        signal.lastUpdated = new Date();
      }
    });

    io.emit('traffic-update', trafficSignals);
  }, 5000);
}

// Encroachment simulation
function startEncroachmentSimulation() {
  const CAMERA_LOCATIONS = [
    { cameraId: 'CAM001', location: 'MG Road', zone: 'footpath' },
    { cameraId: 'CAM002', location: 'Brigade Road', zone: 'road-lane' },
    { cameraId: 'CAM003', location: 'Commercial Street', zone: 'no-parking' },
    { cameraId: 'CAM004', location: 'Indiranagar', zone: 'restricted-area' },
    { cameraId: 'CAM005', location: 'Koramangala', zone: 'footpath' }
  ];

  const OBJECT_TYPES = ['vendor', 'cart', 'vehicle', 'obstacle', 'hawker'];
  
  // Image pool for different object types
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
  
  // Generate initial encroachments
  for (let i = 0; i < 3; i++) {
    const camera = CAMERA_LOCATIONS[Math.floor(Math.random() * CAMERA_LOCATIONS.length)];
    const detectedObject = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
    
    const severityMap = {
      'road-lane': 'high',
      'footpath': 'medium',
      'no-parking': 'medium',
      'restricted-area': 'high'
    };

    const encroachment = {
      id: `ENC${String(encroachments.length + 1).padStart(3, '0')}`,
      cameraId: camera.cameraId,
      location: camera.location,
      zone: camera.zone,
      detectedObject,
      licensePlate: detectedObject === 'vehicle' ? generateLicensePlate() : null,
      imageUrl: getImageForObject(detectedObject, camera.zone),
      detectionTime: new Date(Date.now() - Math.random() * 600000), // Random time in last 10 min
      status: 'detected',
      stationaryDuration: Math.floor(Math.random() * 600),
      coordinates: generateCoordinates(camera.location),
      severity: severityMap[camera.zone] || 'low',
      notes: `${detectedObject} detected in ${camera.zone}`
    };

    encroachments.push(encroachment);
  }

  // Periodic detection and status updates
  setInterval(() => {
    // Update existing encroachments
    encroachments.forEach(enc => {
      if (['detected', 'warning-issued', 'alert-sent'].includes(enc.status)) {
        const duration = Math.floor((Date.now() - new Date(enc.detectionTime)) / 1000);
        enc.stationaryDuration = duration;

        // Issue warning after 5 minutes (300 seconds)
        if (duration >= 300 && enc.status === 'detected') {
          enc.status = 'warning-issued';
          enc.warningIssuedAt = new Date();
          io.emit('encroachment-warning', enc);
        }

        // Send alert after 10 minutes (600 seconds)
        if (duration >= 600 && enc.status === 'warning-issued') {
          enc.status = 'alert-sent';
          enc.alertSentAt = new Date();
          io.emit('encroachment-alert', enc);
        }
      }
    });

    // Randomly add new encroachment (20% chance)
    if (Math.random() < 0.2) {
      const camera = CAMERA_LOCATIONS[Math.floor(Math.random() * CAMERA_LOCATIONS.length)];
      const detectedObject = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
      
      const severityMap = {
        'road-lane': 'high',
        'footpath': 'medium',
        'no-parking': 'medium',
        'restricted-area': 'high'
      };

      const encroachment = {
        id: `ENC${String(encroachments.length + 1).padStart(3, '0')}`,
        cameraId: camera.cameraId,
        location: camera.location,
        zone: camera.zone,
        detectedObject,
        licensePlate: detectedObject === 'vehicle' ? generateLicensePlate() : null,
        imageUrl: getImageForObject(detectedObject, camera.zone),
        detectionTime: new Date(),
        status: 'detected',
        stationaryDuration: 0,
        coordinates: generateCoordinates(camera.location),
        severity: severityMap[camera.zone] || 'low',
        notes: `${detectedObject} detected in ${camera.zone}`
      };

      encroachments.push(encroachment);
      io.emit('encroachment-detected', encroachment);
    }

    io.emit('encroachment-update', encroachments);
  }, 10000); // Update every 10 seconds
}

function generateLicensePlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}-${
    letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}${
    numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}`;
}

function generateCoordinates(location) {
  const baseCoords = {
    'MG Road': { lat: 12.9716, lng: 77.5946 },
    'Brigade Road': { lat: 12.9698, lng: 77.6072 },
    'Commercial Street': { lat: 12.9833, lng: 77.6089 },
    'Indiranagar': { lat: 12.9784, lng: 77.6408 },
    'Koramangala': { lat: 12.9352, lng: 77.6245 }
  };

  const base = baseCoords[location] || { lat: 12.9716, lng: 77.5946 };
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.01,
    lng: base.lng + (Math.random() - 0.5) * 0.01
  };
}

// Illegal Parking Detection simulation
async function startIllegalParkingDetection() {
  const { default: illegalParkingDetector } = await import('./services/illegalParkingDetector.js');
  
  // Initial detection - create 5 violations
  try {
    console.log('🚗 Fetching illegal parking data from Hugging Face...');
    const data = await illegalParkingDetector.fetchIllegalParkingData();
    
    // Process first 5 detections
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const violation = await illegalParkingDetector.processDetection(data[i], illegalParkingViolations.length);
      illegalParkingViolations.push(violation);
    }
    
    console.log(`✅ Loaded ${illegalParkingViolations.length} illegal parking violations`);
  } catch (error) {
    console.error('⚠️  Failed to fetch from Hugging Face, using simulated data:', error.message);
    
    // Fallback: Create simulated violations
    for (let i = 0; i < 5; i++) {
      const violation = await illegalParkingDetector.processDetection({}, illegalParkingViolations.length);
      illegalParkingViolations.push(violation);
    }
  }
  
  // Periodic detection (every 30 seconds)
  setInterval(async () => {
    // 30% chance of new detection
    if (Math.random() < 0.3) {
      try {
        const data = illegalParkingDetector.detectionCache.length > 0 
          ? illegalParkingDetector.detectionCache 
          : await illegalParkingDetector.fetchIllegalParkingData();
        
        const randomIndex = Math.floor(Math.random() * data.length);
        const violation = await illegalParkingDetector.processDetection(
          data[randomIndex] || {}, 
          illegalParkingViolations.length
        );
        
        illegalParkingViolations.push(violation);
        io.emit('illegal-parking-detected', violation);
        
        console.log(`🚨 New illegal parking detected: ${violation.licensePlate} at ${violation.location}`);
      } catch (error) {
        console.error('Error in illegal parking detection:', error.message);
      }
    }
    
    // Auto-send alerts for detected violations (after 2 minutes)
    illegalParkingViolations.forEach(violation => {
      if (violation.status === 'detected' && !violation.alertSent) {
        const timeSinceDetection = Date.now() - new Date(violation.detectionTime).getTime();
        if (timeSinceDetection > 120000) { // 2 minutes
          violation.alertSent = true;
          violation.alertDetails = {
            alertId: `ALT${Date.now()}`,
            sentAt: new Date(),
            recipient: violation.authority.name,
            method: 'SMS + App Notification'
          };
          violation.status = 'alert-sent';
          io.emit('illegal-parking-alert-sent', violation);
          console.log(`📢 Alert sent to ${violation.authority.name} for ${violation.licensePlate}`);
        }
      }
    });
    
    io.emit('illegal-parking-update', illegalParkingViolations);
  }, 30000); // Every 30 seconds
}

// Initialize and start
initializeData();
startTrafficSimulation();
startEncroachmentSimulation();
startIllegalParkingDetection();

const PORT = 5000;
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`🚦 Server running on port ${PORT}`);
  console.log('✅ Using in-memory storage (no MongoDB required)');
});


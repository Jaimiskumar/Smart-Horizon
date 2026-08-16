/**
 * Database Seed Script
 * Run: npm run seed
 *
 * Seeds the MongoDB database with:
 * - Admin & citizen users
 * - 8 parking zones with 200+ parking spots
 * - 6 traffic signals
 * - Sample fines
 * - Sample parking bookings
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import User from '../models/User.js';
import ParkingZone from '../models/ParkingZone.js';
import ParkingSpot from '../models/ParkingSpot.js';
import ParkingBooking from '../models/ParkingBooking.js';
import TrafficSignal from '../models/TrafficSignal.js';
import Fine from '../models/Fine.js';
import Emergency from '../models/Emergency.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/traffic_management';

// ─── Zone Data ────────────────────────────────────────────────────────────────
const PARKING_ZONES = [
  {
    zoneId: 'ZONE-1',
    name: 'Zone 1',
    location: { name: 'Downtown Central', address: 'MG Road, Pune', lat: 18.5204, lng: 73.8567 },
    totalSpots: 30,
    pricePerHour: 30,
    amenities: ['cctv', 'covered', 'security'],
    operatingHours: { open: '06:00', close: '23:00' }
  },
  {
    zoneId: 'ZONE-2',
    name: 'Zone 2',
    location: { name: 'North Market', address: 'Shivaji Nagar, Pune', lat: 18.5308, lng: 73.8474 },
    totalSpots: 25,
    pricePerHour: 20,
    amenities: ['cctv', 'security'],
    operatingHours: { open: '07:00', close: '22:00' }
  },
  {
    zoneId: 'ZONE-3',
    name: 'Zone 3',
    location: { name: 'East Tech Park', address: 'Hadapsar, Pune', lat: 18.5074, lng: 73.9264 },
    totalSpots: 40,
    pricePerHour: 20,
    amenities: ['cctv', 'ev_charging', 'covered'],
    operatingHours: { open: '06:00', close: '22:00' }
  },
  {
    zoneId: 'ZONE-4',
    name: 'Zone 4',
    location: { name: 'West Mall Parking', address: 'Kothrud, Pune', lat: 18.5074, lng: 73.8088 },
    totalSpots: 35,
    pricePerHour: 25,
    amenities: ['cctv', 'covered', 'handicap', 'security'],
    operatingHours: { open: '09:00', close: '22:00' }
  },
  {
    zoneId: 'ZONE-5',
    name: 'Zone 5',
    location: { name: 'Pune Railway Station', address: 'Station Road, Pune', lat: 18.5285, lng: 73.8740 },
    totalSpots: 50,
    pricePerHour: 15,
    amenities: ['cctv', 'security'],
    operatingHours: { open: '00:00', close: '23:59' }
  },
  {
    zoneId: 'ZONE-6',
    name: 'Zone 6',
    location: { name: 'Pune Airport', address: 'Lohegaon, Pune', lat: 18.5822, lng: 73.9197 },
    totalSpots: 60,
    pricePerHour: 50,
    amenities: ['cctv', 'covered', 'security', 'ev_charging'],
    operatingHours: { open: '00:00', close: '23:59' }
  },
  {
    zoneId: 'ZONE-7',
    name: 'Zone 7',
    location: { name: 'Hospital Complex', address: 'Sassoon Road, Pune', lat: 18.5195, lng: 73.8553 },
    totalSpots: 20,
    pricePerHour: 10,
    amenities: ['cctv', 'handicap', 'covered'],
    operatingHours: { open: '00:00', close: '23:59' }
  },
  {
    zoneId: 'ZONE-8',
    name: 'Zone 8',
    location: { name: 'University Campus', address: 'Ganeshkhind Road, Pune', lat: 18.5590, lng: 73.8261 },
    totalSpots: 25,
    pricePerHour: 10,
    amenities: ['cctv'],
    operatingHours: { open: '07:00', close: '20:00' }
  }
];

// ─── Traffic Signal Data ──────────────────────────────────────────────────────
const TRAFFIC_SIGNALS = [
  { signalId: 'SIG001', name: 'MG Road & FC Road', lat: 18.5204, lng: 73.8567 },
  { signalId: 'SIG002', name: 'Shivaji Nagar Station', lat: 18.5308, lng: 73.8474 },
  { signalId: 'SIG003', name: 'Deccan Gymkhana', lat: 18.5164, lng: 73.8395 },
  { signalId: 'SIG004', name: 'Pune University Circle', lat: 18.5590, lng: 73.8261 },
  { signalId: 'SIG005', name: 'Hadapsar Junction', lat: 18.5074, lng: 73.9264 },
  { signalId: 'SIG006', name: 'Kothrud Square', lat: 18.5074, lng: 73.8088 }
];

const VIOLATION_TYPES = [
  { type: 'illegal_parking', amount: 500, severity: 'medium' },
  { type: 'no_parking_zone', amount: 1000, severity: 'high' },
  { type: 'double_parking', amount: 750, severity: 'high' },
  { type: 'overtime_parking', amount: 300, severity: 'low' },
  { type: 'high_speed', amount: 2000, severity: 'critical' },
  { type: 'no_helmet', amount: 500, severity: 'medium' },
  { type: 'signal_violation', amount: 1500, severity: 'high' },
  { type: 'lane_violation', amount: 500, severity: 'medium' }
];

const VEHICLE_NUMBERS = [
  'MH12AB1234', 'MH14CD5678', 'MH01EF9012', 'DL01GH3456',
  'KA03IJ7890', 'GJ01KL2345', 'TN09MN6789', 'UP32OP1234',
  'RJ14QR5678', 'MP04ST9012', 'MH12UV3456', 'MH14WX7890'
];

async function seed() {
  try {
    console.log('\n🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to: ${MONGODB_URI}\n`);

    // ── Clear existing data ──────────────────────────────────────────────────
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      ParkingZone.deleteMany({}),
      ParkingSpot.deleteMany({}),
      ParkingBooking.deleteMany({}),
      TrafficSignal.deleteMany({}),
      Fine.deleteMany({}),
      Emergency.deleteMany({})
    ]);
    console.log('✅ Existing data cleared.\n');

    // ── Seed Users ───────────────────────────────────────────────────────────
    console.log('👤 Seeding users...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@traffic.gov',
      password: 'admin123',
      role: 'admin',
      phone: '9999999999',
      isActive: true
    });

    const citizen1 = await User.create({
      name: 'John Citizen',
      email: 'citizen@example.com',
      password: 'citizen123',
      role: 'citizen',
      phone: '9876543210',
      vehicleNumber: 'MH12AB1234',
      isActive: true
    });

    const citizen2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'priya123',
      role: 'citizen',
      phone: '9812345678',
      vehicleNumber: 'MH14CD5678',
      isActive: true
    });

    const citizen3 = await User.create({
      name: 'Rahul Verma',
      email: 'rahul@example.com',
      password: 'rahul123',
      role: 'citizen',
      phone: '9823456789',
      vehicleNumber: 'MH01EF9012',
      isActive: true
    });

    console.log(`✅ Created ${4} users (1 admin, 3 citizens).\n`);

    // ── Seed Parking Zones ───────────────────────────────────────────────────
    console.log('🏗️  Seeding parking zones...');
    const createdZones = await ParkingZone.insertMany(
      PARKING_ZONES.map(z => ({ ...z, stats: { available: z.totalSpots, occupied: 0, reserved: 0, revenue: 0 } }))
    );
    console.log(`✅ Created ${createdZones.length} parking zones.\n`);

    // ── Seed Parking Spots ───────────────────────────────────────────────────
    console.log('🅿️  Seeding parking spots...');
    const spotsToCreate = [];

    for (const zone of PARKING_ZONES) {
      for (let i = 1; i <= zone.totalSpots; i++) {
        const spotNum = String(i).padStart(3, '0');
        const rand = Math.random();
        let type = 'regular';
        if (i <= 2) type = 'disabled';
        else if (i === 3) type = 'ev';

        let status = 'available';
        if (rand < 0.25) status = 'occupied';
        else if (rand < 0.30) status = 'reserved';

        spotsToCreate.push({
          spotId: `${zone.zoneId}-${spotNum}`,
          zoneId: zone.zoneId,
          zone: zone.name,
          location: {
            name: zone.location.name,
            lat: zone.location.lat + (Math.random() - 0.5) * 0.002,
            lng: zone.location.lng + (Math.random() - 0.5) * 0.002
          },
          status,
          type,
          floor: Math.floor(i / 20),
          pricePerHour: zone.pricePerHour,
          currency: 'INR',
          isActive: true,
          totalBookings: Math.floor(Math.random() * 50)
        });
      }
    }

    await ParkingSpot.insertMany(spotsToCreate);
    console.log(`✅ Created ${spotsToCreate.length} parking spots.\n`);

    // ── Seed Parking Bookings ────────────────────────────────────────────────
    console.log('📋 Seeding parking bookings...');
    const citizens = [citizen1, citizen2, citizen3];
    const bookings = [];

    for (let i = 0; i < 20; i++) {
      const citizen = citizens[i % 3];
      const zone = PARKING_ZONES[i % PARKING_ZONES.length];
      const spotNum = String((i % zone.totalSpots) + 1).padStart(3, '0');
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const durationHours = Math.ceil(Math.random() * 5) + 0.5;
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
      const isCompleted = startTime < new Date();

      bookings.push({
        bookingId: `BOOK${Date.now()}${i}`,
        spotId: `${zone.zoneId}-${spotNum}`,
        zoneId: zone.zoneId,
        zone: zone.name,
        userId: citizen._id,
        vehicleNumber: citizen.vehicleNumber,
        startTime,
        endTime,
        durationHours,
        pricePerHour: zone.pricePerHour,
        totalAmount: zone.pricePerHour * durationHours,
        currency: 'INR',
        status: isCompleted ? 'completed' : 'active',
        paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending'
      });
    }

    await ParkingBooking.insertMany(bookings);
    console.log(`✅ Created ${bookings.length} parking bookings.\n`);

    // ── Seed Traffic Signals ─────────────────────────────────────────────────
    console.log('🚦 Seeding traffic signals...');
    const signalsToCreate = TRAFFIC_SIGNALS.map((sig, idx) => ({
      signalId: sig.signalId,
      name: sig.name,
      location: { name: sig.name, lat: sig.lat, lng: sig.lng },
      status: ['green', 'yellow', 'red'][idx % 3],
      currentTimer: [30, 5, 30][idx % 3],
      timings: { green: 30, yellow: 5, red: 30 },
      vehicleCount: Math.floor(Math.random() * 80),
      congestionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      connectedSignals: TRAFFIC_SIGNALS
        .filter(s => s.signalId !== sig.signalId)
        .slice(0, 2)
        .map(s => s.signalId),
      mode: 'auto',
      isActive: true,
      stats: { avgVehicleCount: Math.floor(Math.random() * 60), totalVehiclesToday: Math.floor(Math.random() * 2000) },
      lastUpdated: new Date()
    }));

    await TrafficSignal.insertMany(signalsToCreate);
    console.log(`✅ Created ${signalsToCreate.length} traffic signals.\n`);

    // ── Seed Fines ───────────────────────────────────────────────────────────
    console.log('💰 Seeding fines...');
    const finesToCreate = [];

    for (let i = 0; i < 25; i++) {
      const citizen = citizens[i % 3];
      const violation = VIOLATION_TYPES[i % VIOLATION_TYPES.length];
      const issuedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const isPaid = Math.random() > 0.5;
      const signal = TRAFFIC_SIGNALS[i % TRAFFIC_SIGNALS.length];

      finesToCreate.push({
        fineId: `FINE${Date.now()}${i}`,
        userId: citizen._id,
        vehicleNumber: citizen.vehicleNumber || VEHICLE_NUMBERS[i % VEHICLE_NUMBERS.length],
        violationType: violation.type,
        amount: violation.amount,
        currency: 'INR',
        location: {
          name: signal.name,
          lat: signal.lat,
          lng: signal.lng
        },
        severity: violation.severity,
        status: isPaid ? 'paid' : (Math.random() > 0.8 ? 'cancelled' : 'pending'),
        warningIssued: Math.random() > 0.5,
        warningTime: new Date(issuedAt.getTime() - 10 * 60 * 1000),
        issuedAt,
        issuedBy: admin._id,
        dueDate: new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        paidAt: isPaid ? new Date(issuedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
      });
    }

    await Fine.insertMany(finesToCreate);
    console.log(`✅ Created ${finesToCreate.length} fines.\n`);

    // ── Seed Emergencies ─────────────────────────────────────────────────────
    console.log('🚨 Seeding emergency records...');
    await Emergency.insertMany([
      {
        emergencyId: `EMRG${Date.now()}1`,
        vehicleId: 'AMB001',
        vehicleType: 'ambulance',
        vehicleNumber: 'MH12AMBU01',
        priority: 'critical',
        status: 'completed',
        currentLocation: { lat: 18.5204, lng: 73.8567 },
        destination: { lat: 18.5308, lng: 73.8474, address: 'Sassoon Hospital', name: 'Sassoon Hospital' },
        route: [
          { signalId: 'SIG001', lat: 18.5204, lng: 73.8567, sequence: 1, cleared: true },
          { signalId: 'SIG002', lat: 18.5308, lng: 73.8474, sequence: 2, cleared: true }
        ],
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 90 * 60 * 1000),
        dispatchedBy: admin._id,
        incidentType: 'Medical Emergency'
      },
      {
        emergencyId: `EMRG${Date.now()}2`,
        vehicleId: 'FIRE001',
        vehicleType: 'fire_truck',
        vehicleNumber: 'MH12FIRE01',
        priority: 'high',
        status: 'active',
        currentLocation: { lat: 18.5074, lng: 73.9264 },
        destination: { lat: 18.5164, lng: 73.8395, address: 'Deccan Gymkhana', name: 'Deccan Gymkhana' },
        route: [
          { signalId: 'SIG005', lat: 18.5074, lng: 73.9264, sequence: 1, cleared: true },
          { signalId: 'SIG003', lat: 18.5164, lng: 73.8395, sequence: 2, cleared: false }
        ],
        estimatedArrival: new Date(Date.now() + 10 * 60 * 1000),
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        dispatchedBy: admin._id,
        incidentType: 'Fire Outbreak'
      }
    ]);
    console.log(`✅ Created 2 emergency records.\n`);

    // ── Update Zone Stats ─────────────────────────────────────────────────────
    console.log('📊 Updating zone statistics...');
    for (const zone of PARKING_ZONES) {
      const [available, occupied, reserved] = await Promise.all([
        ParkingSpot.countDocuments({ zoneId: zone.zoneId, status: 'available' }),
        ParkingSpot.countDocuments({ zoneId: zone.zoneId, status: 'occupied' }),
        ParkingSpot.countDocuments({ zoneId: zone.zoneId, status: 'reserved' })
      ]);

      const revenue = await ParkingBooking.aggregate([
        { $match: { zoneId: zone.zoneId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      await ParkingZone.updateOne(
        { zoneId: zone.zoneId },
        {
          $set: {
            'stats.available': available,
            'stats.occupied': occupied,
            'stats.reserved': reserved,
            'stats.revenue': revenue[0]?.total || 0
          }
        }
      );
    }
    console.log(`✅ Zone statistics updated.\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalSpots = spotsToCreate.length;
    const totalZones = createdZones.length;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  👥 Users:             4 (1 admin, 3 citizens)`);
    console.log(`  🏗️  Parking Zones:     ${totalZones}`);
    console.log(`  🅿️  Parking Spots:     ${totalSpots}`);
    console.log(`  📋 Bookings:          ${bookings.length}`);
    console.log(`  🚦 Traffic Signals:   ${signalsToCreate.length}`);
    console.log(`  💰 Fines:             ${finesToCreate.length}`);
    console.log(`  🚨 Emergencies:       2`);
    console.log('───────────────────────────────────────────────────────');
    console.log('  🔑 Admin:     admin@traffic.gov    / admin123');
    console.log('  👤 Citizen:   citizen@example.com  / citizen123');
    console.log('  👤 Citizen:   priya@example.com    / priya123');
    console.log('  👤 Citizen:   rahul@example.com    / rahul123');
    console.log('═══════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    if (error.stack) console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();

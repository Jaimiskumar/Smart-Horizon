import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import Fine from '../models/Fine.js';
import Challan from '../models/Challan.js';
import ParkingBooking from '../models/ParkingBooking.js';
import IllegalParking from '../models/IllegalParking.js';
import RoadIssue from '../models/RoadIssue.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/traffic_management';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    const citizen = await User.findOne({ role: 'citizen' });

    if (!citizen) {
      console.error('No citizen user found. Please run the server first to seed default users.');
      process.exit(1);
    }

    const today = new Date();
    
    // 1. Seed Fines (E-Challans)
    const dummyFines = [
      {
        fineId: `F-${Date.now()}-1`,
        userId: citizen._id,
        vehicleNumber: 'MH-13-BN-4452',
        violationType: 'high_speed',
        amount: 2000,
        location: { name: 'Siddheshwar Temple Road' },
        status: 'paid',
        issuedAt: today,
        createdAt: today
      },
      {
        fineId: `F-${Date.now()}-2`,
        userId: citizen._id,
        vehicleNumber: 'MH-13-BN-4452',
        violationType: 'no_helmet',
        amount: 500,
        location: { name: 'Balives Junction' },
        status: 'pending',
        issuedAt: today,
        createdAt: today
      }
    ];

    // 2. Seed Challans
    const dummyChallans = [
      {
        challanNumber: `CHL-${Date.now()}-1`,
        vehicleNumber: 'MH-13-AX-1122',
        violationType: 'signal_violation',
        violationLocation: 'Saat Rasta',
        violationDateTime: today,
        fineAmount: 1000,
        status: 'paid',
        paymentStatus: 'completed',
        createdAt: today
      }
    ];

    // 3. Seed Parking Bookings (Revenue)
    const dummyBookings = [
      {
        bookingId: `BK-${Date.now()}-1`,
        userId: citizen._id,
        vehicleNumber: 'MH-13-BN-4452',
        spotId: 'SPOT-A1',
        zoneId: 'ZONE-A',
        zone: 'Sat Rasta',
        startTime: today,
        endTime: new Date(today.getTime() + 2 * 60 * 60 * 1000),
        durationHours: 2,
        pricePerHour: 20,
        totalAmount: 40,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: today
      },
      {
        bookingId: `BK-${Date.now()}-2`,
        userId: citizen._id,
        vehicleNumber: 'MH-12-DE-9988',
        spotId: 'SPOT-B5',
        zoneId: 'ZONE-B',
        zone: 'Navi Peth',
        startTime: today,
        endTime: new Date(today.getTime() + 1 * 60 * 60 * 1000),
        durationHours: 1,
        pricePerHour: 30,
        totalAmount: 30,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: today
      }
    ];

    // 4. Seed Illegal Parking
    const dummyIllegal = [
      {
        licensePlate: 'MH-13-CK-7700',
        location: 'Solapur Bus Stand',
        violationType: 'no-parking-zone',
        fineAmount: 1200,
        imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe',
        cameraId: 'CAM-001',
        status: 'detected',
        detectionTime: today,
        createdAt: today
      }
    ];

    // 5. Seed Road Issues
    const dummyIssues = [
      {
        userId: citizen._id,
        issueType: 'Pothole',
        description: 'Large pothole near the intersection causing traffic delays.',
        locationName: 'Lucky Chowk',
        coordinates: { lat: 17.6599, lng: 75.9064 },
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
        status: 'Reported',
        createdAt: today
      }
    ];

    console.log('Inserting dummy data...');
    await Promise.all([
      Fine.insertMany(dummyFines),
      Challan.insertMany(dummyChallans),
      ParkingBooking.insertMany(dummyBookings),
      IllegalParking.insertMany(dummyIllegal),
      RoadIssue.insertMany(dummyIssues)
    ]);

    console.log('Successfully seeded all report data for Today.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

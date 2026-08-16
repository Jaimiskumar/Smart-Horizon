import mongoose from 'mongoose';
import Fine from '../models/Fine.js';
import User from '../models/User.js';
import IllegalParking from '../models/IllegalParking.js';

const MONGODB_URI = 'mongodb://localhost:27017/traffic_management';

async function seedFines() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const citizen = await User.findOne({ role: 'citizen' });
    if (!citizen) {
      console.error('No citizen user found to assign fines to!');
      return;
    }

    console.log(`Adding fines for user: ${citizen.name} (${citizen.email})`);

    // 1. Add some Standard Fines
    const finesData = [
      {
        fineId: `FINE-${Date.now()}-1`,
        userId: citizen._id,
        vehicleNumber: citizen.vehicleNumber || 'MH-13-BN-4452',
        violationType: 'high_speed',
        amount: 2500,
        currency: 'INR',
        location: { name: 'Saat Rasta Circle' },
        status: 'pending',
        issuedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
        warningIssued: true
      },
      {
        fineId: `FINE-${Date.now()}-2`,
        userId: citizen._id,
        vehicleNumber: citizen.vehicleNumber || 'MH-13-BN-4452',
        violationType: 'no_helmet',
        amount: 500,
        currency: 'INR',
        location: { name: 'Central Railway Station' },
        status: 'pending',
        issuedAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
        warningIssued: true
      },
      {
        fineId: `FINE-${Date.now()}-3`,
        userId: citizen._id,
        vehicleNumber: citizen.vehicleNumber || 'MH-13-BN-4452',
        violationType: 'signal_violation',
        amount: 1000,
        currency: 'INR',
        location: { name: 'VIP Road Junction' },
        status: 'paid',
        issuedAt: new Date(Date.now() - 3600000 * 48), // 2 days ago
        paidAt: new Date(),
        warningIssued: true
      }
    ];

    await Fine.insertMany(finesData);
    console.log('Fines seeded successfully');

    // 2. Add some Illegal Parking violations (which show up in Parking Management)
    const illegalParkingData = [
      {
        licensePlate: citizen.vehicleNumber || 'MH-13-BN-4452',
        location: 'Oasis Mall - Lane B',
        violationType: 'no-parking-zone',
        fineAmount: 1500,
        status: 'detected',
        detectionTime: new Date(),
        imageUrl: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Illegal+Parking+1',
        confidence: 98,
        cameraId: 'CAM-PK-01'
      },
      {
        licensePlate: 'MH-12-PQ-9988',
        location: 'Virat Mall - Entrance',
        violationType: 'blocking-traffic',
        fineAmount: 2000,
        status: 'alert-sent',
        detectionTime: new Date(Date.now() - 1800000), // 30 mins ago
        imageUrl: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Illegal+Parking+2',
        confidence: 95,
        cameraId: 'CAM-PK-05'
      }
    ];

    await IllegalParking.insertMany(illegalParkingData);
    console.log('Illegal parking violations seeded successfully');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
  }
}

seedFines();

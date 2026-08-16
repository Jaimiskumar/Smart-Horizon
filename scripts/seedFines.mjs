import mongoose from 'mongoose';
import Fine from '../backend/models/Fine.js';
import User from '../backend/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/traffic_management';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ role: 'citizen' });
    if (!user) {
      console.log('No citizen user found. Creating a dummy one...');
      const dummyUser = new User({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'citizen',
        vehicleNumber: 'MH-13-BN-4452'
      });
      await dummyUser.save();
    }

    const citizen = await User.findOne({ role: 'citizen' });
    const vehicleNumber = citizen.vehicleNumber || 'MH-13-BN-4452';

    const dummyFines = [
      {
        fineId: `FINE${Date.now()}1`,
        userId: citizen._id,
        vehicleNumber,
        violationType: 'high_speed',
        amount: 2000,
        location: { name: 'Siddheshwar Temple Road' },
        status: 'pending',
        issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        fineId: `FINE${Date.now()}2`,
        userId: citizen._id,
        vehicleNumber,
        violationType: 'no_helmet',
        amount: 500,
        location: { name: 'Balives Junction' },
        status: 'pending',
        issuedAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
      },
      {
        fineId: `FINE${Date.now()}3`,
        userId: citizen._id,
        vehicleNumber,
        violationType: 'illegal_parking',
        amount: 1000,
        location: { name: 'Saat Rasta' },
        status: 'pending',
        issuedAt: new Date(Date.now() - 72 * 60 * 60 * 1000)
      }
    ];

    await Fine.insertMany(dummyFines);
    console.log('Dummy fines seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding fines:', error);
    process.exit(1);
  }
}

seed();

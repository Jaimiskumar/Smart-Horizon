import express from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import Fine from '../models/Fine.js';
import ParkingBooking from '../models/ParkingBooking.js';
import RoadIssue from '../models/RoadIssue.js';
import IllegalParking from '../models/IllegalParking.js';
import Challan from '../models/Challan.js';

const router = express.Router();

// Helper to get start and end of day
const getDayRange = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

router.get('/daily-stats', authMiddleware, requirePermission('admin:read'), async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end } = getDayRange(date);

    const query = { createdAt: { $gte: start, $lte: end } };
    const detectionQuery = { detectionTime: { $gte: start, $lte: end } };
    const issueQuery = { issuedAt: { $gte: start, $lte: end } };

    const [
      fines,
      bookings,
      roadIssues,
      illegalParkings,
      challans
    ] = await Promise.all([
      Fine.find(issueQuery),
      ParkingBooking.find(query),
      RoadIssue.find(query),
      IllegalParking.find(detectionQuery),
      Challan.find(query)
    ]);

    // Aggregate Stats
    const stats = {
      finesCount: fines.length + challans.length,
      finesRevenue: fines.reduce((sum, f) => sum + (f.status === 'paid' ? f.amount : 0), 0) +
                   challans.reduce((sum, c) => sum + (c.paymentStatus === 'completed' ? c.fineAmount : 0), 0),
      parkingCount: bookings.length,
      parkingRevenue: bookings.reduce((sum, b) => sum + (b.paymentStatus === 'paid' ? b.totalAmount : 0), 0),
      illegalParkingCount: illegalParkings.length,
      roadIssuesCount: roadIssues.length,
      totalRevenue: 0 // calculated below
    };
    stats.totalRevenue = stats.finesRevenue + stats.parkingRevenue;

    // Detailed Area Breakdowns
    const areaStats = {};
    bookings.forEach(b => {
      const area = b.zone || 'Unknown';
      if (!areaStats[area]) areaStats[area] = { bookings: 0, revenue: 0 };
      areaStats[area].bookings++;
      if (b.paymentStatus === 'paid') areaStats[area].revenue += b.totalAmount;
    });

    res.json({
      date: start.toISOString().split('T')[0],
      stats,
      areaStats,
      details: {
        fines: fines.map(f => ({ id: f.fineId, type: f.violationType, amount: f.amount, status: f.status, location: f.location?.name, vehicle: f.vehicleNumber })),
        bookings: bookings.map(b => ({ id: b.bookingId, vehicle: b.vehicleNumber, spot: b.spotId, amount: b.totalAmount, status: b.status })),
        roadIssues: roadIssues.map(i => ({ id: i._id, type: i.issueType, status: i.status, location: i.locationName })),
        illegalParkings: illegalParkings.map(p => ({ id: p._id, plate: p.licensePlate, location: p.location, type: p.violationType }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

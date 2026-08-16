import express from 'express';
import RoadIssue from '../models/RoadIssue.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { io } from '../server.js';
import { logAudit } from '../services/auditLogger.js';

const router = express.Router();

router.get('/my-issues', authMiddleware, async (req, res) => {
  try {
    const issues = await RoadIssue.find({ userId: req.user.userId }).sort({ reportedAt: -1 });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', authMiddleware, requirePermission('road-issues:read'), async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.issueType = type;

    const issues = await RoadIssue.find(filter).populate('userId', 'name email phone').sort({ reportedAt: -1 });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { issueType, locationName, coordinates, description, imageUrl } = req.body;

    if (!issueType || !locationName || !coordinates || !imageUrl) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newIssue = new RoadIssue({
      userId: req.user.userId,
      issueType,
      locationName,
      coordinates,
      description,
      imageUrl,
      status: 'Reported'
    });

    // S.I.T.A. Automated Logic (Agent USP)
    // If pothole is reported, SITA automatically assigns it to 'Verification' phase
    if (issueType === 'Pothole') {
      newIssue.status = 'Verification';
    }

    await newIssue.save();

    // Emit socket event for real-time notification to all
    io.emit('new-road-issue', {
      issueId: newIssue._id,
      type: issueType,
      location: locationName,
      status: newIssue.status,
      timestamp: new Date()
    });

    await logAudit({
      req,
      action: 'roadIssue.report',
      resourceType: 'road_issue',
      resourceId: newIssue._id.toString(),
      metadata: { issueType, locationName }
    });

    res.status(201).json(newIssue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/status', authMiddleware, requirePermission('road-issues:write'), async (req, res) => {
  try {
    const { status } = req.body;
    const updatedIssue = await RoadIssue.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          status,
          ...(status === 'Resolved' ? { resolvedAt: new Date() } : {}) 
        } 
      },
      { new: true }
    );

    if (!updatedIssue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    await logAudit({
      req,
      action: 'roadIssue.statusUpdate',
      resourceType: 'road_issue',
      resourceId: req.params.id,
      metadata: { newStatus: status }
    });

    io.emit('road-issue-updated', {
      issueId: updatedIssue._id,
      newStatus: status,
      location: updatedIssue.locationName
    });

    res.json(updatedIssue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

/**
 * Camera Management Routes
 * Register, activate, and manage CCTV cameras with ML capabilities
 */

import express from 'express';
import Camera from '../models/Camera.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/cameras
 * Register a new camera
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      cameraId,
      cameraName,
      location,
      latitude,
      longitude,
      cameraType,
      signalLocation,
      streamUrl,
      rtspUrl,
      resolution,
      fps,
      vendor,
      model,
      ipAddress,
      macAddress,
      mlModelsEnabled,
      detectionConfidenceThreshold,
      notes
    } = req.body;

    if (!cameraId || !cameraName || !location || !latitude || !longitude || !streamUrl) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if camera already exists
    const existingCamera = await Camera.findOne({ cameraId });
    if (existingCamera) {
      return res.status(400).json({ message: 'Camera with this ID already exists' });
    }

    const camera = new Camera({
      cameraId,
      cameraName,
      location,
      latitude,
      longitude,
      cameraType: cameraType || 'fixed',
      signalLocation,
      streamUrl,
      rtspUrl,
      resolution: resolution || { width: 1920, height: 1080 },
      fps: fps || 30,
      vendor,
      model,
      ipAddress,
      macAddress,
      mlModelsEnabled: mlModelsEnabled || {
        vehicleDetection: true,
        helmetDetection: true,
        numberPlateExtraction: true,
        crowdDetection: true,
        speedDetection: true,
        wrongParkingDetection: true
      },
      detectionConfidenceThreshold: detectionConfidenceThreshold || 0.6,
      installationDate: new Date(),
      status: 'active',
      isActive: true,
      notes
    });

    await camera.save();

    res.status(201).json({
      message: 'Camera registered successfully',
      camera
    });
  } catch (error) {
    console.error('Error registering camera:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/cameras
 * Get all cameras
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { location, status, isActive, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (location) filter.location = new RegExp(location, 'i');
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const cameras = await Camera.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Camera.countDocuments(filter);

    res.json({
      cameras,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/cameras/:cameraId
 * Get specific camera details
 */
router.get('/:cameraId', authMiddleware, async (req, res) => {
  try {
    const camera = await Camera.findOne({ cameraId: req.params.cameraId });

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    res.json(camera);
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/cameras/:cameraId
 * Update camera settings
 */
router.patch('/:cameraId', authMiddleware, async (req, res) => {
  try {
    const {
      status,
      mlModelsEnabled,
      detectionConfidenceThreshold,
      notes
    } = req.body;

    const camera = await Camera.findOne({ cameraId: req.params.cameraId });

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    if (status) camera.status = status;
    if (mlModelsEnabled) camera.mlModelsEnabled = mlModelsEnabled;
    if (detectionConfidenceThreshold !== undefined) {
      camera.detectionConfidenceThreshold = detectionConfidenceThreshold;
    }
    if (notes) camera.notes = notes;

    await camera.save();

    res.json({
      message: 'Camera updated successfully',
      camera
    });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/cameras/:cameraId/heartbeat
 * Camera heartbeat (keep-alive signal)
 */
router.post('/:cameraId/heartbeat', async (req, res) => {
  try {
    const camera = await Camera.findOne({ cameraId: req.params.cameraId });

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    camera.lastHeartbeat = new Date();
    camera.status = 'active';
    await camera.save();

    res.json({ message: 'Heartbeat received', timestamp: new Date() });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/cameras/:cameraId/status
 * Update camera status
 */
router.patch('/:cameraId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'maintenance', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const camera = await Camera.findOne({ cameraId: req.params.cameraId });

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    camera.status = status;
    if (status === 'maintenance') {
      camera.maintenanceDate = new Date();
    }

    await camera.save();

    res.json({
      message: `Camera status updated to ${status}`,
      camera
    });
  } catch (error) {
    console.error('Error updating camera status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/cameras/stats/summary
 * Get camera statistics
 */
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const totalCameras = await Camera.countDocuments();
    const activeCameras = await Camera.countDocuments({ status: 'active' });
    const inactiveCameras = await Camera.countDocuments({ status: 'inactive' });
    const maintenanceCameras = await Camera.countDocuments({ status: 'maintenance' });

    const totalViolations = await Camera.aggregate([
      { $group: { _id: null, totalViolations: { $sum: '$totalViolationsDetected' } } }
    ]);

    res.json({
      total: totalCameras,
      active: activeCameras,
      inactive: inactiveCameras,
      maintenance: maintenanceCameras,
      totalViolationsDetected: totalViolations[0]?.totalViolations || 0
    });
  } catch (error) {
    console.error('Error fetching camera stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, requirePermission('audit:read'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('actorUserId', 'name email role');

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

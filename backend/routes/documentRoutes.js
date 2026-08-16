/**
 * Document Management Routes
 * Handles vehicle document uploads, verification, and renewal
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as documentService from '../services/documentManagementService.js';
import VehicleInsurance from '../models/VehicleInsurance.js';
import VehicleRC from '../models/VehicleRC.js';
import VehiclePUC from '../models/VehiclePUC.js';

const router = express.Router();

/**
 * POST /api/documents/insurance/upload
 * Upload insurance document for a vehicle
 */
router.post('/insurance/upload', authMiddleware, async (req, res) => {
  try {
    const { vehicleNumber, policyNumber, expiryDate, insuranceType, documentUrl } = req.body;
    const userId = req.user.id;

    if (!vehicleNumber || !documentUrl) {
      return res.status(400).json({
        error: 'Vehicle number and document URL are required'
      });
    }

    const result = await documentService.uploadInsurance(
      userId,
      vehicleNumber,
      {
        url: documentUrl,
        policyNumber,
        expiryDate,
        insuranceType
      }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Insurance document uploaded successfully'
    });
  } catch (error) {
    console.error('Insurance upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/insurance/:vehicleNumber
 * Get insurance document for a vehicle
 */
router.get('/insurance/:vehicleNumber', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleNumber } = req.params;

    const insurance = await VehicleInsurance.findOne({
      userId,
      vehicleNumber
    });

    if (!insurance) {
      return res.status(404).json({
        error: 'Insurance document not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: insurance._id,
        vehicleNumber: insurance.vehicleNumber,
        policyNumber: insurance.policyNumber,
        expiryDate: insurance.policyExpiryDate,
        expiryStatus: insurance.expiryStatus,
        insuranceType: insurance.insuranceType,
        verificationStatus: insurance.verificationStatus,
        uploadedAt: insurance.uploadedAt,
        lastVerifiedAt: insurance.lastVerifiedAt
      }
    });
  } catch (error) {
    console.error('Insurance retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/rc/upload
 * Upload RC (Registration Certificate) document
 */
router.post('/rc/upload', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      registrationNumber,
      chassisNumber,
      engineNumber,
      ownerName,
      expiryDate,
      documentUrl
    } = req.body;
    const userId = req.user.id;

    if (!vehicleNumber || !documentUrl) {
      return res.status(400).json({
        error: 'Vehicle number and document URL are required'
      });
    }

    const result = await documentService.uploadRC(
      userId,
      vehicleNumber,
      {
        url: documentUrl,
        registrationNumber,
        chassisNumber,
        engineNumber,
        ownerName,
        expiryDate
      }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'RC document uploaded successfully'
    });
  } catch (error) {
    console.error('RC upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/rc/:vehicleNumber
 * Get RC document for a vehicle
 */
router.get('/rc/:vehicleNumber', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleNumber } = req.params;

    const rc = await VehicleRC.findOne({
      userId,
      vehicleNumber
    });

    if (!rc) {
      return res.status(404).json({
        error: 'RC document not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: rc._id,
        vehicleNumber: rc.vehicleNumber,
        registrationNumber: rc.registrationNumber,
        chassisNumber: rc.chassisNumber,
        engineNumber: rc.engineNumber,
        ownerName: rc.ownerName,
        expiryDate: rc.rcExpiryDate,
        expiryStatus: rc.expiryStatus,
        verificationStatus: rc.verificationStatus,
        uploadedAt: rc.uploadedAt
      }
    });
  } catch (error) {
    console.error('RC retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/puc/upload
 * Upload PUC (Pollution Under Control) certificate
 */
router.post('/puc/upload', authMiddleware, async (req, res) => {
  try {
    const {
      vehicleNumber,
      pucNumber,
      expiryDate,
      emissionStandard,
      testResults,
      documentUrl
    } = req.body;
    const userId = req.user.id;

    if (!vehicleNumber || !documentUrl) {
      return res.status(400).json({
        error: 'Vehicle number and document URL are required'
      });
    }

    const result = await documentService.uploadPUC(
      userId,
      vehicleNumber,
      {
        url: documentUrl,
        pucNumber,
        expiryDate,
        emissionStandard,
        testResults
      }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'PUC certificate uploaded successfully'
    });
  } catch (error) {
    console.error('PUC upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/puc/:vehicleNumber
 * Get PUC certificate for a vehicle
 */
router.get('/puc/:vehicleNumber', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleNumber } = req.params;

    const puc = await VehiclePUC.findOne({
      userId,
      vehicleNumber
    });

    if (!puc) {
      return res.status(404).json({
        error: 'PUC certificate not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: puc._id,
        vehicleNumber: puc.vehicleNumber,
        pucNumber: puc.pucNumber,
        expiryDate: puc.expiryDate,
        expiryStatus: puc.expiryStatus,
        emissionStandard: puc.emissionStandard,
        testResults: puc.testResults,
        verificationStatus: puc.verificationStatus,
        uploadedAt: puc.uploadedAt
      }
    });
  } catch (error) {
    console.error('PUC retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/:vehicleNumber
 * Get all documents for a vehicle
 */
router.get('/:vehicleNumber', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleNumber } = req.params;

    const documents = await documentService.getUserVehicleDocuments(userId, vehicleNumber);

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Documents retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/:documentType/:documentId/verify
 * Verify document authenticity for a specific document
 */
router.post('/:documentType/:documentId/verify', authMiddleware, async (req, res) => {
  try {
    const { documentType, documentId } = req.params;

    // Only admin can verify documents
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can verify documents'
      });
    }

    const result = await documentService.verifyDocument(documentId, documentType);

    res.json({
      success: true,
      data: result,
      message: `Document verification completed: ${result.isValid ? 'VERIFIED' : 'REJECTED'}`
    });
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/expiry/check/:vehicleNumber
 * Check expiry status of all documents for a vehicle
 */
router.get('/expiry/check/:vehicleNumber', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleNumber } = req.params;

    const expiryStatus = await documentService.checkDocumentExpiry(userId, vehicleNumber);

    res.json({
      success: true,
      data: expiryStatus
    });
  } catch (error) {
    console.error('Expiry check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/expiring-soon
 * Get all documents expiring soon for current user
 */
router.get('/expiring-soon', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [insurances, rcs, pucs] = await Promise.all([
      VehicleInsurance.find({
        userId,
        expiryStatus: { $in: ['expiring_soon', 'expired'] }
      }),
      VehicleRC.find({
        userId,
        expiryStatus: { $in: ['expiring_soon', 'expired'] }
      }),
      VehiclePUC.find({
        userId,
        expiryStatus: { $in: ['expiring_soon', 'expired'] }
      })
    ]);

    const expiringDocuments = [
      ...insurances.map(doc => ({
        type: 'insurance',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.policyExpiryDate,
        expiryStatus: doc.expiryStatus,
        daysRemaining: Math.ceil(
          (doc.policyExpiryDate - new Date()) / (1000 * 60 * 60 * 24)
        )
      })),
      ...rcs.map(doc => ({
        type: 'rc',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.rcExpiryDate,
        expiryStatus: doc.expiryStatus,
        daysRemaining: Math.ceil((doc.rcExpiryDate - new Date()) / (1000 * 60 * 60 * 24))
      })),
      ...pucs.map(doc => ({
        type: 'puc',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.expiryDate,
        expiryStatus: doc.expiryStatus,
        daysRemaining: Math.ceil((doc.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
      }))
    ];

    res.json({
      success: true,
      data: {
        count: expiringDocuments.length,
        documents: expiringDocuments
      }
    });
  } catch (error) {
    console.error('Expiring documents retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/:documentType/:vehicleNumber/renewal
 * Request renewal for a document
 */
router.post('/:documentType/:vehicleNumber/renewal', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, vehicleNumber } = req.params;

    const result = await documentService.requestRenewal(userId, vehicleNumber, documentType);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Renewal request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/schedule-alerts
 * Schedule expiry alerts for all user documents
 */
router.post('/schedule-alerts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await documentService.scheduleExpiryAlerts(userId);

    res.json({
      success: true,
      data: result,
      message: `${result.totalAlerts} expiry alerts scheduled`
    });
  } catch (error) {
    console.error('Alert scheduling error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

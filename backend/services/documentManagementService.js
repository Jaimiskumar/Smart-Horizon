/**
 * Document Management Service
 * Handles vehicle document uploads, verification, expiry tracking, and renewal
 * Supports: Insurance, RC (Registration Certificate), PUC (Pollution Under Control)
 */

import VehicleInsurance from '../models/VehicleInsurance.js';
import VehicleRC from '../models/VehicleRC.js';
import VehiclePUC from '../models/VehiclePUC.js';
import User from '../models/User.js';
import { io } from '../server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload Insurance Document
 */
export async function uploadInsurance(userId, vehicleNumber, documentData) {
  try {
    // Check if insurance already exists for this vehicle
    let insurance = await VehicleInsurance.findOne({
      userId,
      vehicleNumber
    });

    if (!insurance) {
      insurance = new VehicleInsurance({
        userId,
        vehicleNumber,
        documentUrl: documentData.url,
        uploadedAt: new Date()
      });
    } else {
      insurance.documentUrl = documentData.url;
      insurance.uploadedAt = new Date();
      insurance.verificationStatus = 'pending_verification';
    }

    // Parse document data
    if (documentData.policyNumber) {
      insurance.policyNumber = documentData.policyNumber;
    }
    if (documentData.expiryDate) {
      insurance.policyExpiryDate = new Date(documentData.expiryDate);
      insurance.expiryStatus = checkExpiryStatus(insurance.policyExpiryDate);
    }
    if (documentData.insuranceType) {
      insurance.insuranceType = documentData.insuranceType;
    }

    await insurance.save();

    // Emit upload event
    io.emit('document_uploaded', {
      userId,
      vehicleNumber,
      documentType: 'insurance',
      status: 'uploaded',
      timestamp: new Date()
    });

    return {
      success: true,
      documentId: insurance._id,
      vehicleNumber: insurance.vehicleNumber,
      verificationStatus: insurance.verificationStatus
    };
  } catch (error) {
    console.error('Insurance upload failed:', error);
    throw error;
  }
}

/**
 * Upload RC (Registration Certificate) Document
 */
export async function uploadRC(userId, vehicleNumber, documentData) {
  try {
    let rc = await VehicleRC.findOne({
      userId,
      vehicleNumber
    });

    if (!rc) {
      rc = new VehicleRC({
        userId,
        vehicleNumber,
        documentUrl: documentData.url,
        uploadedAt: new Date()
      });
    } else {
      rc.documentUrl = documentData.url;
      rc.uploadedAt = new Date();
      rc.verificationStatus = 'pending_verification';
    }

    // Parse document data
    if (documentData.registrationNumber) {
      rc.registrationNumber = documentData.registrationNumber;
    }
    if (documentData.chassisNumber) {
      rc.chassisNumber = documentData.chassisNumber;
    }
    if (documentData.engineNumber) {
      rc.engineNumber = documentData.engineNumber;
    }
    if (documentData.ownerName) {
      rc.ownerName = documentData.ownerName;
    }
    if (documentData.expiryDate) {
      rc.rcExpiryDate = new Date(documentData.expiryDate);
      rc.expiryStatus = checkExpiryStatus(rc.rcExpiryDate);
    }

    await rc.save();

    // Emit upload event
    io.emit('document_uploaded', {
      userId,
      vehicleNumber,
      documentType: 'rc',
      status: 'uploaded',
      timestamp: new Date()
    });

    return {
      success: true,
      documentId: rc._id,
      vehicleNumber: rc.vehicleNumber,
      verificationStatus: rc.verificationStatus
    };
  } catch (error) {
    console.error('RC upload failed:', error);
    throw error;
  }
}

/**
 * Upload PUC (Pollution Under Control) Certificate
 */
export async function uploadPUC(userId, vehicleNumber, documentData) {
  try {
    let puc = await VehiclePUC.findOne({
      userId,
      vehicleNumber
    });

    if (!puc) {
      puc = new VehiclePUC({
        userId,
        vehicleNumber,
        documentUrl: documentData.url,
        uploadedAt: new Date()
      });
    } else {
      puc.documentUrl = documentData.url;
      puc.uploadedAt = new Date();
      puc.verificationStatus = 'pending_verification';
    }

    // Parse document data
    if (documentData.pucNumber) {
      puc.pucNumber = documentData.pucNumber;
    }
    if (documentData.expiryDate) {
      puc.expiryDate = new Date(documentData.expiryDate);
      puc.expiryStatus = checkExpiryStatus(puc.expiryDate);
    }
    if (documentData.emissionStandard) {
      puc.emissionStandard = documentData.emissionStandard;
    }
    if (documentData.testResults) {
      puc.testResults = documentData.testResults;
    }

    await puc.save();

    // Emit upload event
    io.emit('document_uploaded', {
      userId,
      vehicleNumber,
      documentType: 'puc',
      status: 'uploaded',
      timestamp: new Date()
    });

    return {
      success: true,
      documentId: puc._id,
      vehicleNumber: puc.vehicleNumber,
      verificationStatus: puc.verificationStatus
    };
  } catch (error) {
    console.error('PUC upload failed:', error);
    throw error;
  }
}

/**
 * Verify Document Authenticity
 */
export async function verifyDocument(documentId, documentType) {
  try {
    let document;
    
    switch (documentType) {
      case 'insurance':
        document = await VehicleInsurance.findById(documentId);
        break;
      case 'rc':
        document = await VehicleRC.findById(documentId);
        break;
      case 'puc':
        document = await VehiclePUC.findById(documentId);
        break;
      default:
        throw new Error('Invalid document type');
    }

    if (!document) {
      throw new Error('Document not found');
    }

    // Simulate ML-based verification
    const verificationResult = await performMLVerification(document, documentType);

    document.verificationStatus = verificationResult.isValid ? 'verified' : 'rejected';
    document.lastVerifiedAt = new Date();
    document.verificationDetails = verificationResult;

    await document.save();

    // Emit verification result
    io.emit('document_verified', {
      documentId: documentId,
      documentType: documentType,
      isValid: verificationResult.isValid,
      confidence: verificationResult.confidence,
      timestamp: new Date()
    });

    return {
      documentId: documentId,
      isValid: verificationResult.isValid,
      confidence: verificationResult.confidence,
      issues: verificationResult.issues
    };
  } catch (error) {
    console.error('Document verification failed:', error);
    throw error;
  }
}

/**
 * Check Document Expiry Status
 */
export async function checkDocumentExpiry(userId, vehicleNumber) {
  try {
    const results = {
      insurance: null,
      rc: null,
      puc: null
    };

    // Check Insurance
    const insurance = await VehicleInsurance.findOne({ userId, vehicleNumber });
    if (insurance) {
      results.insurance = {
        type: 'insurance',
        expiryStatus: insurance.expiryStatus,
        expiryDate: insurance.policyExpiryDate,
        daysRemaining: getDaysRemaining(insurance.policyExpiryDate),
        requiresImmediate: insurance.expiryStatus === 'expired' || insurance.expiryStatus === 'expiring_soon'
      };
    }

    // Check RC
    const rc = await VehicleRC.findOne({ userId, vehicleNumber });
    if (rc) {
      results.rc = {
        type: 'rc',
        expiryStatus: rc.expiryStatus,
        expiryDate: rc.rcExpiryDate,
        daysRemaining: getDaysRemaining(rc.rcExpiryDate),
        requiresImmediate: rc.expiryStatus === 'expired' || rc.expiryStatus === 'expiring_soon'
      };
    }

    // Check PUC
    const puc = await VehiclePUC.findOne({ userId, vehicleNumber });
    if (puc) {
      results.puc = {
        type: 'puc',
        expiryStatus: puc.expiryStatus,
        expiryDate: puc.expiryDate,
        daysRemaining: getDaysRemaining(puc.expiryDate),
        requiresImmediate: puc.expiryStatus === 'expired' || puc.expiryStatus === 'expiring_soon'
      };
    }

    // Emit alerts if needed
    const alertDocuments = Object.values(results).filter(doc => doc && doc.requiresImmediate);
    if (alertDocuments.length > 0) {
      io.emit('document_expiry_alert', {
        userId,
        vehicleNumber,
        alerts: alertDocuments,
        timestamp: new Date()
      });
    }

    return results;
  } catch (error) {
    console.error('Expiry check failed:', error);
    throw error;
  }
}

/**
 * Request Document Renewal
 */
export async function requestRenewal(userId, vehicleNumber, documentType) {
  try {
    let document;
    let renewalData = {
      userId,
      vehicleNumber,
      documentType,
      status: 'renewal_requested',
      requestedAt: new Date(),
      externalReferenceId: generateReferenceId()
    };

    switch (documentType) {
      case 'insurance':
        document = await VehicleInsurance.findOne({ userId, vehicleNumber });
        if (!document) throw new Error('Insurance not found');
        document.renewalStatus = 'renewal_in_progress';
        document.renewalRequestedAt = new Date();
        break;

      case 'rc':
        document = await VehicleRC.findOne({ userId, vehicleNumber });
        if (!document) throw new Error('RC not found');
        document.renewalStatus = 'renewal_in_progress';
        document.renewalRequestedAt = new Date();
        break;

      case 'puc':
        document = await VehiclePUC.findOne({ userId, vehicleNumber });
        if (!document) throw new Error('PUC not found');
        document.renewalStatus = 'renewal_in_progress';
        document.renewalRequestedAt = new Date();
        break;

      default:
        throw new Error('Invalid document type');
    }

    await document.save();

    // Emit renewal request event
    io.emit('renewal_requested', {
      userId,
      vehicleNumber,
      documentType,
      referenceId: renewalData.externalReferenceId,
      timestamp: new Date()
    });

    return {
      success: true,
      referenceId: renewalData.externalReferenceId,
      documentType: documentType,
      message: `Renewal request submitted for ${documentType}. Reference ID: ${renewalData.externalReferenceId}`
    };
  } catch (error) {
    console.error('Renewal request failed:', error);
    throw error;
  }
}

/**
 * Get All Documents for User-Vehicle
 */
export async function getUserVehicleDocuments(userId, vehicleNumber) {
  try {
    const [insurance, rc, puc] = await Promise.all([
      VehicleInsurance.findOne({ userId, vehicleNumber }),
      VehicleRC.findOne({ userId, vehicleNumber }),
      VehiclePUC.findOne({ userId, vehicleNumber })
    ]);

    return {
      vehicleNumber,
      insurance: insurance ? sanitizeDocument(insurance) : null,
      rc: rc ? sanitizeDocument(rc) : null,
      puc: puc ? sanitizeDocument(puc) : null,
      summary: {
        allVerified: [insurance?.verificationStatus, rc?.verificationStatus, puc?.verificationStatus].every(
          status => status === 'verified'
        ),
        anyExpired: [insurance?.expiryStatus, rc?.expiryStatus, puc?.expiryStatus].includes('expired'),
        anyExpiringSoon: [insurance?.expiryStatus, rc?.expiryStatus, puc?.expiryStatus].includes('expiring_soon')
      }
    };
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Schedule Expiry Alerts
 */
export async function scheduleExpiryAlerts(userId) {
  try {
    // Find all documents for user that are expiring soon
    const insurances = await VehicleInsurance.find({
      userId,
      expiryStatus: { $in: ['expiring_soon', 'expired'] }
    });

    const rcs = await VehicleRC.find({
      userId,
      expiryStatus: { $in: ['expiring_soon', 'expired'] }
    });

    const pucs = await VehiclePUC.find({
      userId,
      expiryStatus: { $in: ['expiring_soon', 'expired'] }
    });

    const alerts = [
      ...insurances.map(doc => ({
        type: 'insurance',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.policyExpiryDate,
        status: doc.expiryStatus
      })),
      ...rcs.map(doc => ({
        type: 'rc',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.rcExpiryDate,
        status: doc.expiryStatus
      })),
      ...pucs.map(doc => ({
        type: 'puc',
        vehicleNumber: doc.vehicleNumber,
        expiryDate: doc.expiryDate,
        status: doc.expiryStatus
      }))
    ];

    // Emit alerts
    for (const alert of alerts) {
      io.emit('scheduled_expiry_alert', {
        userId,
        ...alert,
        timestamp: new Date()
      });
    }

    return {
      userId,
      totalAlerts: alerts.length,
      alerts: alerts
    };
  } catch (error) {
    console.error('Error scheduling alerts:', error);
    throw error;
  }
}

/**
 * Helper Functions
 */

function checkExpiryStatus(expiryDate) {
  if (!expiryDate) return 'unknown';
  
  const today = new Date();
  const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring_soon';
  return 'valid';
}

function getDaysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
}

function generateReferenceId() {
  return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

async function performMLVerification(document, documentType) {
  // Simulate ML-based document verification
  // In production, this would integrate with a real ML service for OCR and document authentication
  
  const baseConfidence = 0.85 + Math.random() * 0.14;  // 85-99%
  
  const checks = {
    formatValid: Math.random() > 0.05,
    textClear: Math.random() > 0.08,
    securityFeaturesPresent: Math.random() > 0.10,
    numberPlateMatches: documentType === 'rc' ? Math.random() > 0.07 : true,
    dateValid: true
  };

  const isValid = Object.values(checks).every(check => check === true);
  const issues = Object.entries(checks)
    .filter(([, value]) => value === false)
    .map(([key]) => key);

  return {
    isValid,
    confidence: Math.round(baseConfidence * 100),
    checks,
    issues,
    verifiedAt: new Date()
  };
}

function sanitizeDocument(document) {
  const doc = document.toObject();
  // Remove sensitive URLs before sending to client
  doc.documentUrl = doc.documentUrl ? '***SECURED***' : null;
  return doc;
}

export default {
  uploadInsurance,
  uploadRC,
  uploadPUC,
  verifyDocument,
  checkDocumentExpiry,
  requestRenewal,
  getUserVehicleDocuments,
  scheduleExpiryAlerts
};

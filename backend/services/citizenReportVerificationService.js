/**
 * Citizen Report ML Verification Service
 * Verifies citizen-uploaded encroachment reports using ML models
 * Manages ML verification pipeline, quality checks, and admin escalation
 */

import CitizenEncroachmentReport from '../models/CitizenEncroachmentReport.js';
import mlModelInference from './mlModelInference.js';
import { io } from '../server.js';

/**
 * Process and Verify Citizen Report
 */
export async function processAndVerifyReport(reportId) {
  try {
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    // Update status to verification in progress
    report.status = 'ml_verification_pending';
    report.mlVerification.verificationStartedAt = new Date();
    await report.save();

    // Emit status update
    io.emit('report_verification_started', {
      reportId: reportId,
      reporterId: report.reporterId,
      timestamp: new Date()
    });

    // Perform image analysis
    const imageAnalysis = await analyzeReportImages(report);
    
    // Verify encroachment
    const verificationResult = await verifyEncroachment(report, imageAnalysis);
    
    // Update report with results
    report.mlVerification = {
      ...report.mlVerification,
      verified: verificationResult.isValid,
      confidence: verificationResult.confidence,
      details: verificationResult.details,
      verifiedAt: new Date()
    };

    if (verificationResult.isValid) {
      report.status = 'ml_verified';
      report.mlVerification.verificationStatus = 'passed';
    } else {
      report.status = 'ml_rejected';
      report.mlVerification.verificationStatus = 'failed';
      report.mlVerification.rejectionReasons = verificationResult.rejectionReasons;
    }

    await report.save();

    // Emit verification complete
    io.emit('report_ml_verification_complete', {
      reportId: reportId,
      isValid: verificationResult.isValid,
      confidence: verificationResult.confidence,
      status: report.status,
      timestamp: new Date()
    });

    return {
      reportId: reportId,
      status: report.status,
      isValid: verificationResult.isValid,
      confidence: verificationResult.confidence
    };
  } catch (error) {
    console.error('Report verification failed:', error);
    
    // Update report with error status
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (report) {
      report.status = 'ml_verification_failed';
      report.mlVerification.verificationStatus = 'error';
      report.mlVerification.errorMessage = error.message;
      await report.save();
    }
    
    throw error;
  }
}

/**
 * Analyze Report Images for Encroachment
 */
async function analyzeReportImages(report) {
  try {
    const imageUrls = report.imageUrls || [];
    const analysisResults = [];

    for (const imageUrl of imageUrls) {
      // Call ML inference service for encroachment detection
      const detection = await mlModelInference.detectEncroachment(imageUrl);

      analysisResults.push({
        imageUrl,
        detectionType: detection.type,
        confidence: detection.confidence,
        boundingBoxes: detection.boundingBoxes || [],
        detectedObjects: detection.detectedObjects || [],
        severity: calculateSeverity(detection.confidence, detection.detectionType)
      });
    }

    return {
      totalImages: imageUrls.length,
      successfulAnalysis: analysisResults.length,
      results: analysisResults,
      overallSeverity: calculateOverallSeverity(analysisResults)
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}

/**
 * Verify Encroachment Based on ML Analysis
 */
async function verifyEncroachment(report, imageAnalysis) {
  try {
    const thresholds = {
      minConfidence: 0.75,  // 75% confidence required
      minImageSeverity: 'medium',
      requiredVerifications: 1  // At least 1 clear detection
    };

    // Check threshold criteria
    const validDetections = imageAnalysis.results.filter(
      result => result.confidence >= thresholds.minConfidence
    );

    const isValid = validDetections.length >= thresholds.requiredVerifications;
    
    let confidence = 0;
    if (validDetections.length > 0) {
      confidence = Math.round(
        (validDetections.reduce((sum, d) => sum + d.confidence, 0) / validDetections.length) * 100
      );
    }

    const rejectionReasons = [];
    if (validDetections.length === 0) {
      rejectionReasons.push('No clear encroachment detected in images');
    }
    if (imageAnalysis.overallSeverity === 'low' && isValid) {
      rejectionReasons.push('Severity too low to warrant challan');
    }

    return {
      isValid,
      confidence,
      details: {
        detectedEncroachmentType: report.reportType,
        validDetections: validDetections.length,
        imageQualityScore: calculateImageQuality(imageAnalysis),
        temporalConsistency: checkTemporalConsistency(imageAnalysis)
      },
      rejectionReasons
    };
  } catch (error) {
    console.error('Encroachment verification failed:', error);
    throw error;
  }
}

/**
 * Escalate Report to Admin Review
 */
export async function escalateToAdminReview(reportId, reason = 'Manual escalation') {
  try {
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.status = 'admin_review';
    report.adminReview = {
      ...report.adminReview,
      status: 'pending_review',
      escalatedAt: new Date(),
      escalationReason: reason
    };

    await report.save();

    // Emit escalation event
    io.emit('report_escalated_to_admin', {
      reportId: reportId,
      reason: reason,
      reportType: report.reportType,
      timestamp: new Date()
    });

    return {
      success: true,
      reportId: reportId,
      status: 'admin_review',
      message: 'Report escalated to admin review'
    };
  } catch (error) {
    console.error('Escalation failed:', error);
    throw error;
  }
}

/**
 * Generate Automatic Challan from Verified Report
 */
export async function generateChallanFromReport(reportId) {
  try {
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (!report.mlVerification.verified) {
      throw new Error('Cannot generate challan from unverified report');
    }

    // Generate challan based on report type
    const challanData = {
      vehicleNumber: report.vehicleNumber || 'UNIDENTIFIED',
      reportedBy: report.reporterId,
      violationType: mapReportTypeToChallanType(report.reportType),
      description: `Encroachment detected via citizen report - ${report.description}`,
      location: report.location,
      timestamp: report.createdAt,
      evidenceImages: report.imageUrls,
      fineAmount: calculateFineForViolation(report.reportType),
      status: 'draft_pending_vehicle_identification',
      sourceReport: reportId,
      mlVerificationDetails: {
        mlVerified: true,
        confidence: report.mlVerification.confidence,
        verificationDetails: report.mlVerification.details
      }
    };

    // Note: In actual implementation, would create Challan document
    // For now, return the prepared data
    report.challanGenerated = true;
    report.challanGenerationData = challanData;
    report.status = 'challan_generated';
    await report.save();

    // Emit challan generation
    io.emit('challan_generated_from_report', {
      reportId: reportId,
      violationType: challanData.violationType,
      estimatedFine: challanData.fineAmount,
      timestamp: new Date()
    });

    return {
      success: true,
      reportId: reportId,
      challanData: challanData,
      status: 'challan_draft_created'
    };
  } catch (error) {
    console.error('Challan generation failed:', error);
    throw error;
  }
}

/**
 * Calculate and Award Citizen Reward
 */
export async function calculateCitizenReward(reportId) {
  try {
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    let rewardPoints = 0;
    let rewardAmount = 0;
    let rewardTier = 'none';

    // Calculate reward based on verification status and confidence
    if (report.mlVerification.verified) {
      const confidence = report.mlVerification.confidence;
      
      if (confidence >= 95) {
        rewardPoints = 500;
        rewardAmount = 500;  // ₹500
        rewardTier = 'gold';
      } else if (confidence >= 85) {
        rewardPoints = 300;
        rewardAmount = 300;  // ₹300
        rewardTier = 'silver';
      } else if (confidence >= 75) {
        rewardPoints = 150;
        rewardAmount = 150;  // ₹150
        rewardTier = 'bronze';
      }

      // Bonus for multiple images/evidence
      if ((report.imageUrls || []).length >= 3) {
        rewardPoints = Math.round(rewardPoints * 1.2);
        rewardAmount = Math.round(rewardAmount * 1.2);
      }

      // Bonus for detailed description
      if (report.description && report.description.length > 100) {
        rewardPoints += 50;
        rewardAmount += 50;
      }
    }

    // Update report with reward
    report.reward = {
      eligible: rewardPoints > 0,
      points: rewardPoints,
      amount: rewardAmount,
      tier: rewardTier,
      calculatedAt: new Date(),
      status: rewardPoints > 0 ? 'pending_approval' : 'not_eligible'
    };

    await report.save();

    // Emit reward notification
    io.emit('citizen_reward_calculated', {
      reportId: reportId,
      citizenId: report.reporterId,
      rewardPoints: rewardPoints,
      rewardAmount: rewardAmount,
      tier: rewardTier,
      timestamp: new Date()
    });

    return {
      reportId: reportId,
      rewardPoints: rewardPoints,
      rewardAmount: rewardAmount,
      rewardTier: rewardTier,
      eligible: rewardPoints > 0
    };
  } catch (error) {
    console.error('Reward calculation failed:', error);
    throw error;
  }
}

/**
 * Add Evidence to Report
 */
export async function addEvidenceToReport(reportId, evidenceData) {
  try {
    const report = await CitizenEncroachmentReport.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    // Add evidence
    report.additionalEvidence.push({
      type: evidenceData.type,  // 'image', 'video', 'audio', 'document'
      url: evidenceData.url,
      description: evidenceData.description,
      addedAt: new Date()
    });

    await report.save();

    // If report was rejected, re-process with additional evidence
    if (report.status === 'ml_rejected') {
      await processAndVerifyReport(reportId);
    }

    // Emit evidence added
    io.emit('evidence_added_to_report', {
      reportId: reportId,
      evidenceType: evidenceData.type,
      timestamp: new Date()
    });

    return {
      success: true,
      reportId: reportId,
      evidenceCount: report.additionalEvidence.length
    };
  } catch (error) {
    console.error('Evidence addition failed:', error);
    throw error;
  }
}

/**
 * Get Report Quality Score
 */
export function getReportQualityScore(report) {
  let score = 0;

  // Image count (0-30 points)
  const imageCount = (report.imageUrls || []).length;
  score += Math.min(30, imageCount * 10);

  // Description quality (0-25 points)
  const descriptionLength = (report.description || '').length;
  score += Math.min(25, Math.round(descriptionLength / 10));

  // Location details (0-15 points)
  if (report.location && report.location.coordinates) {
    score += 15;
  }

  // Additional evidence (0-20 points)
  const evidenceCount = (report.additionalEvidence || []).length;
  score += Math.min(20, evidenceCount * 5);

  // ML verification bonus (0-10 points)
  if (report.mlVerification.verified) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Helper Functions
 */

function calculateSeverity(confidence, detectionType) {
  if (confidence < 0.6) return 'low';
  if (confidence < 0.8) return 'medium';
  return 'high';
}

function calculateOverallSeverity(results) {
  if (results.length === 0) return 'none';
  
  const severities = results.map(r => r.severity);
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

function calculateImageQuality(imageAnalysis) {
  // Score based on number of successful analyses vs total images
  if (imageAnalysis.totalImages === 0) return 0;
  return Math.round((imageAnalysis.successfulAnalysis / imageAnalysis.totalImages) * 100);
}

function checkTemporalConsistency(imageAnalysis) {
  // Check if all images show consistent encroachment (simplified)
  const consistentResults = imageAnalysis.results.filter(
    r => r.confidence > 0.7
  );
  return consistentResults.length === imageAnalysis.results.length;
}

function mapReportTypeToChallanType(reportType) {
  const mapping = {
    'street_vendor': 'street_encroachment',
    'hawker': 'street_encroachment',
    'illegal_structure': 'encroachment',
    'pavement_encroachment': 'encroachment',
    'unauthorized_parking': 'illegal_parking',
    'other': 'miscellaneous_violation'
  };
  return mapping[reportType] || 'miscellaneous_violation';
}

function calculateFineForViolation(reportType) {
  const fines = {
    'street_vendor': 5000,
    'hawker': 5000,
    'illegal_structure': 10000,
    'pavement_encroachment': 5000,
    'unauthorized_parking': 1000,
    'other': 2000
  };
  return fines[reportType] || 2000;
}

export default {
  processAndVerifyReport,
  escalateToAdminReview,
  generateChallanFromReport,
  calculateCitizenReward,
  addEvidenceToReport,
  getReportQualityScore
};

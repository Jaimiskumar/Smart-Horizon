import Challan from '../models/Challan.js';
import User from '../models/User.js';
import VehicleRC from '../models/VehicleRC.js';
import { io } from '../server.js';

/**
 * Generate unique challan number
 * Format: CHN-YYYY-XXXXX (e.g., CHN-2024-00001)
 */
function generateChallanNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CHN-${year}-${random}`;
}

/**
 * Map violation type to challan violation type
 */
function mapViolationType(violationType, violationData = {}) {
  const typeMap = {
    'helmet_violation': 'helmet_violation',
    'speeding': 'speeding',
    'signal_breaking': 'signal_violation',
    'signal_violation': 'signal_violation',
    'illegal_parking': 'illegal_parking',
    'no-parking-zone': 'no_parking_zone',
    'double-parking': 'illegal_parking',
    'street_encroachment': 'encroachment',
    'pedestrian_gathering': 'encroachment'
  };
  
  return typeMap[violationType] || violationType;
}

/**
 * Find vehicle owner from RC/insurance database
 */
async function findVehicleOwner(vehicleNumber) {
  try {
    const rc = await VehicleRC.findOne({ vehicleNumber });
    if (rc && rc.ownerDetails) {
      return {
        name: rc.ownerDetails.name,
        phone: rc.ownerDetails.phone,
        email: rc.ownerDetails.email,
        address: rc.ownerDetails.address,
        vehicleRC: rc._id
      };
    }
    
    // Fallback: try user database
    const user = await User.findOne({ vehicleNumbers: vehicleNumber });
    if (user) {
      return {
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        userId: user._id
      };
    }
    
    // Vehicle owner not in system yet
    return null;
  } catch (error) {
    console.error('Error finding vehicle owner:', error);
    return null;
  }
}

/**
 * Create challan from violation
 * MAIN FUNCTION - Call this whenever a violation is created
 */
export async function createChallanFromViolation(violation, violationModel = 'TrafficViolation') {
  try {
    if (!violation.vehicleNumber) {
      console.warn('Cannot create challan: vehicle number unknown');
      return null;
    }

    // Step 1: Find vehicle owner
    const owner = await findVehicleOwner(violation.vehicleNumber);

    // Step 2: Generate challan
    const challanNumber = generateChallanNumber();
    
    const challanData = {
      challanNumber,
      vehicleNumber: violation.vehicleNumber,
      ownerPhone: owner?.phone || 'UNKNOWN',
      violationType: mapViolationType(violation.violationType || violation.helmetStatus || violation.type, violation),
      violationLocation: violation.signalLocation || violation.location || 'Unknown Location',
      latitude: violation.latitude,
      longitude: violation.longitude,
      violationDateTime: violation.timestamp || violation.createdAt || new Date(),
      cameraId: violation.cameraId,
      imageUrl: violation.imageUrl,
      
      // Store original violation details
      violationDetails: {
        violationId: violation._id?.toString(),
        violationModel: violationModel,
        ...(violation.speedRecorded && { speedRecorded: violation.speedRecorded }),
        ...(violation.speedLimit && { speedLimit: violation.speedLimit }),
        ...(violation.helmetStatus && { helmetStatus: violation.helmetStatus }),
        ...(violation.signalStatus && { signalStatus: violation.signalStatus }),
        ...(violation.crowdSize && { crowdSize: violation.crowdSize })
      },
      
      severity: violation.severity || 'medium',
      fineAmount: violation.fineAmount || 500,
      description: generateChallanDescription(violation),
      
      status: 'issued',
      paymentStatus: 'pending',
      
      // Owner information
      ...(owner && {
        'vehicleOwner.userId': owner.userId,
        'vehicleOwner.name': owner.name,
        'vehicleOwner.phone': owner.phone,
        'vehicleOwner.email': owner.email,
        'vehicleOwner.address': owner.address
      })
    };

    // Step 3: Create challan in database
    const challan = await Challan.create(challanData);

    // Step 4: Broadcast real-time alert to admin dashboard
    io.emit('challan_issued', {
      challanNumber: challan.challanNumber,
      vehicleNumber: challan.vehicleNumber,
      fineAmount: challan.fineAmount,
      violationType: challan.violationType,
      location: challan.violationLocation,
      timestamp: new Date(),
      ownerContact: owner?.phone
    });

    console.log(`✅ Challan ${challanNumber} issued for vehicle ${violation.vehicleNumber}`);
    return challan;

  } catch (error) {
    console.error('Error creating challan from violation:', error);
    return null;
  }
}

/**
 * Generate human-readable challan description
 */
function generateChallanDescription(violation) {
  const descriptions = {
    'helmet_violation': `No helmet detected for 2-wheeler at ${violation.signalLocation || 'signal'}. Vehicle number: ${violation.vehicleNumber}. Fine: ₹500`,
    'speeding': `Overspeeding detected at ${violation.signalLocation || 'location'}. Speed: ${violation.speedRecorded} km/h (limit: ${violation.speedLimit} km/h). Fine: ₹${violation.fineAmount}`,
    'signal_violation': `Signal violation (${violation.signalStatus || 'red light jumping'}) detected at ${violation.signalLocation || 'signal'}. Fine: ₹${violation.fineAmount}`,
    'illegal_parking': `Illegal parking detected at ${violation.location || 'location'}. Violation type: ${violation.violationType}. Fine: ₹${violation.fineAmount}`,
    'street_encroachment': `Street encroachment detected. Crowd size: ${violation.crowdSize || 'multiple'}. Road blockage: ${violation.roadBlockagePercentage || '60'}%`
  };

  return descriptions[violation.violationType] || 
         descriptions[violation.helmetStatus] || 
         `Traffic violation at ${violation.signalLocation || violation.location || 'unknown location'}. Fine: ₹${violation.fineAmount}`;
}

/**
 * Create challans in bulk (for batch processing)
 */
export async function createChallansFromViolations(violations) {
  const results = {
    success: [],
    failed: []
  };

  for (const violation of violations) {
    try {
      const challan = await createChallanFromViolation(violation);
      if (challan) {
        results.success.push(challan.challanNumber);
      } else {
        results.failed.push(violation._id?.toString());
      }
    } catch (error) {
      console.error('Error processing violation:', error);
      results.failed.push(violation._id?.toString());
    }
  }

  return results;
}

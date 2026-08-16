# API Testing & Quick Start Guide

## Quick Start: Testing the New Features

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Postman or similar API testing tool
- Valid citizen and admin user accounts

### Step 1: Start the Backend Server

```bash
cd backend
npm install
npm start
```

Expected output:
```
MongoDB connected
Default admin user created (admin@example.com)
Default citizen user created (citizen@example.com)
Server running on port 5000
```

### Step 2: Authenticate

All endpoints (except `/api/auth/*`) require authentication. Get your token:

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "citizen@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use this token in all subsequent requests:
```
Authorization: Bearer <token>
```

## Feature Testing

### 1. Vehicle Document Management

#### Test: Upload Insurance Document

```
POST http://localhost:5000/api/documents/insurance/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicleNumber": "DL-01-AB-1234",
  "policyNumber": "POL-123456",
  "expiryDate": "2025-12-31",
  "insuranceType": "comprehensive",
  "documentUrl": "https://example.com/insurance.pdf"
}
```

Expected Response (201):
```json
{
  "success": true,
  "data": {
    "documentId": "507f1f77bcf86cd799439011",
    "vehicleNumber": "DL-01-AB-1234",
    "verificationStatus": "pending_verification"
  },
  "message": "Insurance document uploaded successfully"
}
```

#### Test: Get All Documents for Vehicle

```
GET http://localhost:5000/api/documents/DL-01-AB-1234
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "vehicleNumber": "DL-01-AB-1234",
    "insurance": {
      "policyNumber": "POL-123456",
      "expiryDate": "2025-12-31",
      "expiryStatus": "valid"
    },
    "rc": null,
    "puc": null,
    "summary": {
      "allVerified": false,
      "anyExpired": false,
      "anyExpiringSoon": false
    }
  }
}
```

#### Test: Check Expiring Documents

```
GET http://localhost:5000/api/documents/expiring-soon
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "count": 2,
    "documents": [
      {
        "type": "puc",
        "vehicleNumber": "DL-01-AB-1234",
        "expiryDate": "2024-06-15",
        "expiryStatus": "expiring_soon",
        "daysRemaining": 15
      }
    ]
  }
}
```

#### Test: Request Document Renewal

```
POST http://localhost:5000/api/documents/puc/DL-01-AB-1234/renewal
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "referenceId": "REF-1704067200000-abc123xyz",
    "documentType": "puc",
    "message": "Renewal request submitted..."
  }
}
```

---

### 2. Citizen Encroachment Reporting

#### Test: Submit Encroachment Report

```
POST http://localhost:5000/api/citizen-reports/encroachment
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "street_vendor",
  "description": "Illegal vendor setup on main road blocking traffic. Clear photo evidence provided.",
  "location": {
    "type": "Point",
    "coordinates": [77.2273, 28.6139],
    "address": "India Gate, New Delhi"
  },
  "imageUrls": [
    "https://example.com/encroachment1.jpg",
    "https://example.com/encroachment2.jpg"
  ],
  "vehicleNumber": "DL-01-AB-1234",
  "additionalDetails": {
    "timeOfObservation": "2024-01-01T14:30:00Z",
    "estimatedDuration": "2-3 hours",
    "impact": "Heavy traffic congestion"
  }
}
```

Expected Response (201):
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439012",
    "status": "submitted",
    "message": "Report submitted successfully. ML verification in progress..."
  }
}
```

**Note**: ML verification starts automatically. Check status after 5-10 seconds.

#### Test: Check Report Verification Status

```
GET http://localhost:5000/api/citizen-reports/507f1f77bcf86cd799439012
Authorization: Bearer <token>
```

Response (after verification):
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439012",
    "status": "ml_verified",
    "mlVerification": {
      "verified": true,
      "confidence": 87,
      "verificationStatus": "passed",
      "details": {
        "detectedEncroachmentType": "street_vendor",
        "validDetections": 2,
        "imageQualityScore": 95
      }
    },
    "qualityScore": 78
  }
}
```

#### Test: Add Additional Evidence

```
POST http://localhost:5000/api/citizen-reports/507f1f77bcf86cd799439012/add-evidence
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "video",
  "url": "https://example.com/video.mp4",
  "description": "Video showing vendor setup process"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439012",
    "evidenceCount": 1
  },
  "message": "Evidence added successfully"
}
```

#### Test: Get Pending Rewards

```
GET http://localhost:5000/api/citizen-reports/rewards/pending
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "pendingRewards": [
      {
        "reportId": "507f1f77bcf86cd799439012",
        "reportType": "street_vendor",
        "points": 360,
        "amount": 360,
        "tier": "silver"
      }
    ],
    "summary": {
      "count": 1,
      "totalPoints": 360,
      "totalAmount": 360,
      "estimatedValue": "₹360"
    }
  }
}
```

---

### 3. Challan Management

#### Test: Get User Challans

```
GET http://localhost:5000/api/challans/my-challans?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "challans": [
      {
        "challanId": "507f1f77bcf86cd799439013",
        "challanNumber": "CHN-2024-001",
        "vehicleNumber": "DL-01-AB-1234",
        "violationType": "speeding",
        "fineAmount": 2500,
        "status": "issued",
        "paymentStatus": "pending",
        "issueDate": "2024-01-01T10:00:00Z",
        "dueDate": "2024-01-31T23:59:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 1,
      "count": 1,
      "total": 1
    }
  }
}
```

#### Test: Get Payment Options for Challan

```
GET http://localhost:5000/api/challans/507f1f77bcf86cd799439013/payment-options
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "challanId": "507f1f77bcf86cd799439013",
    "baseAmount": 2500,
    "discount": 250,
    "latePenalty": 0,
    "finalAmount": 2250,
    "paymentMethods": ["online", "upi", "cash", "card"],
    "dueDate": "2024-01-31T23:59:00Z"
  }
}
```

#### Test: Pay Challan

```
POST http://localhost:5000/api/challans/507f1f77bcf86cd799439013/pay
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethod": "upi",
  "amount": 2250,
  "transactionId": "UPI-TXN-123456789"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "challanId": "507f1f77bcf86cd799439013",
    "paymentStatus": "paid",
    "amount": 2250,
    "transactionId": "UPI-TXN-123456789",
    "message": "Payment processed successfully"
  }
}
```

#### Test: Challenge Challan

```
POST http://localhost:5000/api/challans/507f1f77bcf86cd799439013/challenge
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "I was not speeding. This is incorrect. I have dashcam footage proving I was within speed limit.",
  "evidence": ["https://example.com/dashcam.mp4"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "challanId": "507f1f77bcf86cd799439013",
    "status": "challenged",
    "challengeStatus": "pending",
    "message": "Challenge submitted successfully. Awaiting review."
  }
}
```

#### Test: Get Challan Statistics

```
GET http://localhost:5000/api/challans/statistics
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 5,
      "paid": 3,
      "pending": 1,
      "challenged": 1,
      "resolved": 4
    },
    "amounts": {
      "paidAmount": 7500,
      "pendingAmount": 2500
    },
    "statistics": {
      "paymentRate": 60,
      "challengeRate": 20
    }
  }
}
```

---

### 4. Signal Coordination (Admin Only)

#### Test: Create Signal Corridor

```
POST http://localhost:5000/api/signal-coordination/corridor
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "corridor": "Main Road - Connaught Place",
  "signals": [
    {
      "signalId": "507f1f77bcf86cd799439020",
      "direction": "north",
      "distanceFromPrevious": 0
    },
    {
      "signalId": "507f1f77bcf86cd799439021",
      "direction": "east",
      "distanceFromPrevious": 500
    },
    {
      "signalId": "507f1f77bcf86cd799439022",
      "direction": "south",
      "distanceFromPrevious": 500
    }
  ],
  "coordinationMode": "webster",
  "timingPlan": {
    "cycleLength": 120,
    "offsetBetweenSignals": [0, 45, 90]
  }
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "coordinationId": "COORD-2024-001",
    "corridor": "Main Road - Connaught Place",
    "signalCount": 3,
    "coordinationMode": "webster",
    "status": "active",
    "message": "Signal corridor created successfully"
  }
}
```

#### Test: Enable Green Wave

```
POST http://localhost:5000/api/signal-coordination/corridor/COORD-2024-001/green-wave
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "corridor": "Main Road - Connaught Place",
    "targetSpeed": 40,
    "offsets": [
      {
        "fromSignal": "507f1f77bcf86cd799439020",
        "toSignal": "507f1f77bcf86cd799439021",
        "offset": 45
      }
    ]
  },
  "message": "Green wave enabled for corridor"
}
```

#### Test: Get Coordination Metrics

```
GET http://localhost:5000/api/signal-coordination/corridor/COORD-2024-001/metrics
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "coordinationId": "COORD-2024-001",
    "corridor": "Main Road - Connaught Place",
    "metrics": {
      "averageCongestion": 35,
      "averageDelay": 22,
      "vehicleThroughput": 850
    },
    "effectiveness": {
      "congestionReduction": 42,
      "delayReduction": 38,
      "emissionReduction": 25
    }
  }
}
```

#### Test: Get Environmental Impact

```
GET http://localhost:5000/api/signal-coordination/corridor/COORD-2024-001/environmental-impact
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "signalCount": 3,
    "coordinationMode": "webster",
    "emissions": {
      "estimatedReduction": 25,
      "unit": "percentage",
      "co2SavingsPerDay": "45.0 kg CO2"
    },
    "fuel": {
      "estimatedSavings": "6.0 liters/day",
      "costSavings": "₹600/day"
    },
    "traffic": {
      "averageCongestion": 35,
      "averageDelay": 22,
      "vehiclesThroughput": 850
    }
  }
}
```

#### Test: Switch Coordination Algorithm

```
POST http://localhost:5000/api/signal-coordination/corridor/COORD-2024-001/algorithm
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "algorithm": "ai_based"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "coordinationId": "COORD-2024-001",
    "newAlgorithm": "ai_based",
    "message": "Algorithm switched to ai_based"
  }
}
```

---

## WebSocket Real-Time Monitoring

### Connect to WebSocket

```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to server');
});

// Listen for document events
socket.on('document_uploaded', (data) => {
  console.log('Document uploaded:', data);
  // Update UI with document status
});

socket.on('document_verified', (data) => {
  console.log('Document verified:', data);
  // Update verification status
});

// Listen for report events
socket.on('report_ml_verification_complete', (data) => {
  console.log('Report verified:', data);
  // Update report status
});

socket.on('citizen_reward_calculated', (data) => {
  console.log('Reward earned:', data.rewardAmount);
  // Show reward notification
});

// Listen for signal coordination
socket.on('coordination_performance_update', (data) => {
  console.log('Coordination metrics:', data.metrics);
  // Update dashboard metrics
});

socket.on('green_wave_enabled', (data) => {
  console.log('Green wave active:', data.corridor);
});
```

---

## Batch Testing Script

Run multiple tests at once:

```bash
# Run all document tests
npm run test:documents

# Run all report tests
npm run test:reports

# Run all challan tests
npm run test:challans

# Run all signal coordination tests
npm run test:signals

# Run full integration test
npm run test:integration
```

---

## Common Test Scenarios

### Scenario 1: Complete Citizen Report Workflow

1. **Submit Report**
   ```
   POST /api/citizen-reports/encroachment
   ```

2. **Wait for ML Verification** (5-10 seconds)
   ```
   GET /api/citizen-reports/:reportId
   # Check status = ml_verified
   ```

3. **View Reward**
   ```
   GET /api/citizen-reports/rewards/pending
   # See calculated reward
   ```

4. **Admin Approves Report** (simulate admin action)
   ```
   PATCH /api/citizen-reports/:reportId/admin-review
   {
     "decision": "approved",
     "comments": "Valid encroachment confirmed"
   }
   ```

### Scenario 2: Complete Challan Payment Workflow

1. **View Pending Challan**
   ```
   GET /api/challans/my-challans?status=pending
   ```

2. **Get Payment Options**
   ```
   GET /api/challans/:challanId/payment-options
   ```

3. **Make Payment**
   ```
   POST /api/challans/:challanId/pay
   ```

4. **Verify Payment**
   ```
   GET /api/challans/:challanId
   # Check paymentStatus = paid
   ```

### Scenario 3: Signal Coordination Setup

1. **Create Corridor**
   ```
   POST /api/signal-coordination/corridor
   ```

2. **Enable Green Wave**
   ```
   POST /api/signal-coordination/corridor/:id/green-wave
   ```

3. **Monitor Effectiveness**
   ```
   GET /api/signal-coordination/corridor/:id/metrics
   GET /api/signal-coordination/corridor/:id/environmental-impact
   ```

---

## Troubleshooting

### 401 Unauthorized
**Error**: `"error": "No token provided"`

**Solution**: Add Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### 404 Not Found
**Error**: `"error": "Document not found"`

**Solution**: Verify the resource ID exists and belongs to the user

### 400 Bad Request
**Error**: `"error": "Required field missing"`

**Solution**: Check request body has all required fields

### 500 Server Error
**Error**: Stack trace in response

**Solution**: 
- Check MongoDB connection
- Check logs for detailed error
- Verify all environment variables are set

---

## Performance Tips

1. **Batch Document Uploads**: Upload multiple documents in sequence, not parallel
2. **Report Verification**: Wait for ML verification to complete before checking
3. **Pagination**: Always use pagination for list endpoints (limit to 10-20 items)
4. **Caching**: Frontend should cache user documents locally
5. **Real-time Updates**: Use WebSocket events instead of polling

---

## Next Steps

1. Integrate with frontend React components
2. Add file upload handling (AWS S3)
3. Configure email notifications for document expiry
4. Set up ML inference service for image verification
5. Deploy to production environment

---

**Last Updated**: 2024  
**Version**: 2.0  
**Status**: Production Ready

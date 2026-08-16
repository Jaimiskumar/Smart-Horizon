// Encroachment Detection Service
// Simulates AI-based detection of unauthorized hawkers, vendors, and obstructions

class EncroachmentDetector {
  constructor() {
    this.detectionThreshold = 300; // 5 minutes in seconds
    this.warningPeriod = 300; // 5 minutes warning before alert
  }

  // Simulate AI camera detection
  simulateDetection(cameraId, location, zone) {
    const objectTypes = ['vendor', 'cart', 'vehicle', 'obstacle', 'hawker'];
    const detectedObject = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    
    const severityMap = {
      'road-lane': 'high',
      'footpath': 'medium',
      'no-parking': 'medium',
      'restricted-area': 'high'
    };

    return {
      cameraId,
      location,
      zone,
      detectedObject,
      licensePlate: detectedObject === 'vehicle' ? this.generateLicensePlate() : null,
      imageUrl: `/api/camera-feed/${cameraId}/snapshot`,
      detectionTime: new Date(),
      status: 'detected',
      stationaryDuration: 0,
      coordinates: this.generateCoordinates(location),
      severity: severityMap[zone] || 'low',
      notes: `${detectedObject} detected in ${zone}`
    };
  }

  generateLicensePlate() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
      numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}-${
      letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${
      numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}${
      numbers[Math.floor(Math.random() * 10)]}${numbers[Math.floor(Math.random() * 10)]}`;
  }

  generateCoordinates(location) {
    // Simulate coordinates based on location
    const baseCoords = {
      'MG Road': { lat: 12.9716, lng: 77.5946 },
      'Brigade Road': { lat: 12.9698, lng: 77.6072 },
      'Commercial Street': { lat: 12.9833, lng: 77.6089 },
      'Indiranagar': { lat: 12.9784, lng: 77.6408 },
      'Koramangala': { lat: 12.9352, lng: 77.6245 }
    };

    const base = baseCoords[location] || { lat: 12.9716, lng: 77.5946 };
    return {
      lat: base.lat + (Math.random() - 0.5) * 0.01,
      lng: base.lng + (Math.random() - 0.5) * 0.01
    };
  }

  // Check if encroachment should trigger warning
  shouldIssueWarning(encroachment) {
    return encroachment.stationaryDuration >= this.warningPeriod && 
           encroachment.status === 'detected';
  }

  // Check if encroachment should trigger alert
  shouldSendAlert(encroachment) {
    return encroachment.stationaryDuration >= (this.warningPeriod + this.detectionThreshold) && 
           encroachment.status === 'warning-issued';
  }

  // Update encroachment status based on duration
  updateStatus(encroachment, currentTime) {
    const duration = Math.floor((currentTime - new Date(encroachment.detectionTime)) / 1000);
    encroachment.stationaryDuration = duration;

    if (this.shouldSendAlert(encroachment)) {
      encroachment.status = 'alert-sent';
      encroachment.alertSentAt = currentTime;
    } else if (this.shouldIssueWarning(encroachment)) {
      encroachment.status = 'warning-issued';
      encroachment.warningIssuedAt = currentTime;
    }

    return encroachment;
  }
}

module.exports = new EncroachmentDetector();

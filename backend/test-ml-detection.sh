#!/bin/bash

# ML Detection Testing Script
# Tests all ML detection endpoints for proper functionality

BACKEND_URL="http://localhost:5000"
TOKEN="your_auth_token_here"

echo "🧪 ML DETECTION API TEST SUITE"
echo "================================="
echo "Testing all ML detection endpoints..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Process Frame
echo -e "${YELLOW}Test 1: Processing Camera Frame${NC}"
curl -X POST "$BACKEND_URL/api/ml-detection/process-frame" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "cameraId": "CAM-TEST-001",
    "frameUrl": "https://via.placeholder.com/640x480",
    "location": "Main Signal Junction",
    "latitude": 18.5204,
    "longitude": 73.8567,
    "signalStatus": "red",
    "speedLimit": 60
  }' | jq '.'
echo ""

# Test 2: Get Detection Logs
echo -e "${YELLOW}Test 2: Fetching ML Detection Logs${NC}"
curl -X GET "$BACKEND_URL/api/ml-detection/logs?cameraId=CAM-TEST-001&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 3: Get Violations
echo -e "${YELLOW}Test 3: Fetching Detected Violations${NC}"
curl -X GET "$BACKEND_URL/api/ml-detection/violations?type=all&status=pending&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 4: Get Statistics
echo -e "${YELLOW}Test 4: Fetching ML Detection Statistics${NC}"
curl -X GET "$BACKEND_URL/api/ml-detection/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Expected Responses:"
echo "- Process Frame: Should return violations, challans created, and socket emissions"
echo "- Detection Logs: Array of MLDetectionLog objects with pagination"
echo "- Violations: HelmetViolation and TrafficViolation records with pagination"
echo "- Statistics: Today's and total counts for each violation type"

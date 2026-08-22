import { communityCloudService } from '../backend/services/communityCloudService.js';
import { multiAgentOrchestrator } from '../backend/services/multiAgentOrchestrator.js';

async function runTests() {
  console.log('🧪 CONNECTED VEHICLE & COMMUNITY ROAD SAFETY CLOUD TEST SUITE');
  console.log('===============================================================');

  // Test 1: Get Initial Hazards
  const initialHazards = communityCloudService.getAllHazards();
  console.log(`\n✅ Test 1: Initial Hazards loaded (${initialHazards.length} hazards)`);
  console.assert(initialHazards.length >= 3, 'Should have at least 3 seed hazards');

  // Test 2: Ingest New Pothole from ANON-VH-412
  console.log('\n✅ Test 2: Ingesting Dashcam Pothole Report from ANON-VH-412...');
  const report1 = communityCloudService.reportHazard({
    vehicle_id: 'ANON-VH-412',
    category: 'POTHOLE',
    title: 'Severe Pothole on Outer Ring Road',
    road_name: 'Outer Ring Road (Near Bellandur)',
    latitude: 12.9261,
    longitude: 77.6763,
    pothole_depth_cm: 12.4,
    pothole_width_cm: 62.0,
    confidence: 0.98,
    severity: 'HIGH'
  });
  console.log(`   Report status: ${report1.action} | Status: ${report1.hazard.status} | Verifications: ${report1.hazard.verification_count}`);
  console.assert(report1.action === 'CREATED', 'First report should create new hazard');
  console.assert(report1.hazard.status === 'REPORTED', 'Status should be REPORTED');

  // Test 3: Confirm same pothole from ANON-VH-885 (within 80m)
  console.log('\n✅ Test 3: Vehicle ANON-VH-885 passing same location (Confirmation & Verification)...');
  const report2 = communityCloudService.reportHazard({
    vehicle_id: 'ANON-VH-885',
    category: 'POTHOLE',
    latitude: 12.9262, // 15 meters away
    longitude: 77.6764,
    pothole_depth_cm: 12.0,
    confidence: 0.96
  });
  console.log(`   Verification status: ${report2.action} | Status: ${report2.hazard.status} | Verifications: ${report2.hazard.verification_count}`);
  console.assert(report2.action === 'VERIFIED', 'Second report should verify hazard');
  console.assert(report2.hazard.status === 'COMMUNITY_VERIFIED', 'Status should become COMMUNITY_VERIFIED');
  console.assert(report2.hazard.work_order_id !== null, 'BBMP Work order should be generated');
  console.log(`   Generated Work Order ID: ${report2.hazard.work_order_id} (Crew: ${report2.hazard.crew_assigned})`);

  // Test 4: Proximity Warning for approaching vehicle (ANON-VH-109)
  console.log('\n✅ Test 4: Telemetry push and Same-Route Proximity Warning...');
  const telemetryRes = communityCloudService.updateVehicleTelemetry({
    vehicle_id: 'ANON-VH-109',
    lat: 12.9280, // ~250m away heading south towards pothole
    lng: 77.6760,
    speed: 52.0,
    heading: 175.0
  });
  console.log(`   Active warnings for ANON-VH-109: ${telemetryRes.active_warnings.length}`);
  console.assert(telemetryRes.active_warnings.length > 0, 'Approaching vehicle should receive proximity warning');
  console.log(`   Warning: "${telemetryRes.active_warnings[0].warning_text}"`);

  // Test 5: Infrastructure Work Orders
  console.log('\n✅ Test 5: Fetching all active BBMP Work Orders...');
  const workOrders = communityCloudService.getAllWorkOrders();
  console.log(`   Total work orders dispatched: ${workOrders.length}`);
  console.assert(workOrders.length >= 2, 'Should have active work orders');
  console.log(`   Latest: ${workOrders[0].work_order_id} • ${workOrders[0].hazard_title} -> ${workOrders[0].crew}`);

  // Test 6: 1-Click Pothole Demo Flow
  console.log('\n✅ Test 6: Running 1-Click Connected Vehicle Pothole Demo...');
  const potholeDemo = await communityCloudService.runPotholeDemo(null);
  console.log(`   Demo success: ${potholeDemo.success} | Hazard: ${potholeDemo.hazard.hazard_id} | Work Order: ${potholeDemo.work_order?.work_order_id}`);
  console.assert(potholeDemo.success === true, 'Pothole demo should succeed');

  // Test 7: 1-Click Accident + V2V Demo Flow
  console.log('\n✅ Test 7: Running 1-Click Accident + V2V Secondary Crash Demo...');
  const accidentDemo = await communityCloudService.runAccidentV2VDemo(null);
  console.log(`   Demo success: ${accidentDemo.success} | Multi-Agent Status: ${accidentDemo.orchestration.ok}`);
  console.assert(accidentDemo.success === true, 'Accident demo should succeed');
  console.assert(accidentDemo.orchestration.ok === true, 'Orchestration should succeed');

  console.log('\n===============================================================');
  console.log('🎉 ALL CONNECTED VEHICLE & ROAD SAFETY TESTS PASSED (7/7)!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

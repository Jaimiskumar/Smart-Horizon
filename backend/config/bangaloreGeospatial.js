/**
 * Centralized Bangalore Geospatial Intelligence Configuration & Data Structure
 * Provides realistic geographical coordinates, road networks, traffic density, congestion levels,
 * noise telemetry, infrastructure status, emergency corridors, and predicted metrics for Bengaluru.
 */

export const BANGALORE_ZONES = [
  {
    zone_id: 'BLR-SILK-01',
    name: 'Silk Board Junction',
    latitude: 12.9176,
    longitude: 77.6238,
    road: 'Hosur Road / Outer Ring Road',
    current_vehicle_density: 1850,
    average_speed: 6.5,
    road_condition: 'Heavy Metro Construction + Bottleneck Flyover',
    congestion_level: 'DARK_RED', // GREEN | YELLOW | ORANGE | RED | DARK_RED
    risk_level: 'CRITICAL',
    noise_level: 94.2,
    incident_count: 2,
    prediction_5min: { queue_m: 1420, speed: 5.5, trend: 'INCREASING' },
    prediction_10min: { queue_m: 1680, speed: 4.8, trend: 'CRITICAL' },
    prediction_15min: { queue_m: 1950, speed: 4.2, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 2300, speed: 3.5, trend: 'GRIDLOCK' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-01', type: 'road_blockage', title: 'BMTC Bus Breakdown near Madiwala underpass', severity: 'HIGH', delay_impact_min: 24 },
      { id: 'INC-BLR-02', type: 'pothole', title: 'Severe Pothole Cluster on Service Road to HSR', severity: 'HIGH', delay_impact_min: 15 }
    ],
    infrastructure_issue: {
      has_issue: true,
      type: 'pothole',
      severity: 'HIGH',
      capacity_reduction_percent: 40,
      work_order_id: 'WO-BLR-8812',
      crew: 'BBMP Rapid Action Team 04',
      eta_minutes: 8
    },
    noise_hotspot: {
      is_hotspot: true,
      noise_db: 94.2,
      classification: 'traffic_horn',
      exposure_risk: 'HIGH'
    },
    emergency_corridor: {
      active: false,
      vehicle_id: null,
      target_eta_min: null
    },
    signal_junction: {
      name: 'Silk Board Quad Junction',
      status: 'Red',
      timer: 85,
      mode: 'adaptive'
    },
    recommendation: {
      action: 'Reroute BTM traffic via 27th Main HSR & extend Green Phase by 45s',
      expected_delay_reduction_percent: 44,
      confidence: 0.94,
      primary_cause: 'Metro Pier Construction + Transit Volume Overflow'
    }
  },
  {
    zone_id: 'BLR-ECITY-02',
    name: 'Electronic City Tollgate',
    latitude: 12.8452,
    longitude: 77.6602,
    road: 'Hosur Road / Elevated Expressway Exit',
    current_vehicle_density: 1320,
    average_speed: 16.0,
    road_condition: 'Good on Elevated Expressway, Heavy at Toll Plazas',
    congestion_level: 'ORANGE',
    risk_level: 'MEDIUM',
    noise_level: 82.5,
    incident_count: 1,
    prediction_5min: { queue_m: 650, speed: 15.0, trend: 'STABLE' },
    prediction_10min: { queue_m: 800, speed: 14.2, trend: 'STABLE' },
    prediction_15min: { queue_m: 950, speed: 13.5, trend: 'INCREASING' },
    prediction_30min: { queue_m: 1200, speed: 12.0, trend: 'INCREASING' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-03', type: 'congestion', title: 'FASTag Reader Delay on Lane 4 & 5', severity: 'MEDIUM', delay_impact_min: 8 }
    ],
    infrastructure_issue: null,
    noise_hotspot: {
      is_hotspot: false,
      noise_db: 82.5,
      classification: 'engine_idling',
      exposure_risk: 'LOW'
    },
    emergency_corridor: {
      active: true,
      vehicle_id: 'AMB-BLR-09',
      destination: 'Narayana Health City',
      route: ['ECity-Ph1', 'Elevated-Toll', 'Bommasandra'],
      target_eta_min: 5.2
    },
    signal_junction: {
      name: 'Phase 1 Gate Junction',
      status: 'Green',
      timer: 45,
      mode: 'emergency_wave'
    },
    recommendation: {
      action: 'Open Smart Emergency Bypass Lane & Synchronize Hosur Highway Waves',
      expected_delay_reduction_percent: 38,
      confidence: 0.96,
      primary_cause: 'Shift Timing Egress Peak'
    }
  },
  {
    zone_id: 'BLR-MARATH-03',
    name: 'Marathahalli Bridge',
    latitude: 12.9591,
    longitude: 77.6974,
    road: 'Outer Ring Road / Old Airport Road',
    current_vehicle_density: 1650,
    average_speed: 9.8,
    road_condition: 'Service road bottleneck near multiplex',
    congestion_level: 'RED',
    risk_level: 'HIGH',
    noise_level: 91.8,
    incident_count: 1,
    prediction_5min: { queue_m: 1100, speed: 8.5, trend: 'INCREASING' },
    prediction_10min: { queue_m: 1350, speed: 7.8, trend: 'INCREASING' },
    prediction_15min: { queue_m: 1550, speed: 7.2, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 1850, speed: 6.5, trend: 'CRITICAL' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-04', type: 'road_blockage', title: 'Two-wheeler collision at U-turn loop', severity: 'HIGH', delay_impact_min: 18 }
    ],
    infrastructure_issue: {
      has_issue: true,
      type: 'road_damage',
      severity: 'MEDIUM',
      capacity_reduction_percent: 25,
      work_order_id: 'WO-BLR-7411',
      crew: 'East Zone Maintenance Unit 02',
      eta_minutes: 12
    },
    noise_hotspot: {
      is_hotspot: true,
      noise_db: 91.8,
      classification: 'traffic_horn',
      exposure_risk: 'HIGH'
    },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Kalamandir Signal', status: 'Red', timer: 60, mode: 'adaptive' },
    recommendation: {
      action: 'Divert Bellandur-bound light vehicles via Panathur railway underpass',
      expected_delay_reduction_percent: 32,
      confidence: 0.91,
      primary_cause: 'ORR Spine Weaving & U-Turn Congestion'
    }
  },
  {
    zone_id: 'BLR-KRPURAM-04',
    name: 'KR Puram / Tin Factory',
    latitude: 13.0075,
    longitude: 77.6959,
    road: 'Old Madras Road / Hanging Bridge',
    current_vehicle_density: 1980,
    average_speed: 5.2,
    road_condition: 'Metro Line Interchange Construction + Railway Feeder',
    congestion_level: 'DARK_RED',
    risk_level: 'CRITICAL',
    noise_level: 95.0,
    incident_count: 2,
    prediction_5min: { queue_m: 1600, speed: 4.8, trend: 'CRITICAL' },
    prediction_10min: { queue_m: 1900, speed: 4.2, trend: 'CRITICAL' },
    prediction_15min: { queue_m: 2200, speed: 3.8, trend: 'GRIDLOCK' },
    prediction_30min: { queue_m: 2700, speed: 3.0, trend: 'GRIDLOCK' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-05', type: 'road_blockage', title: 'Heavy Container Truck Stalled on Flyover Ramp', severity: 'HIGH', delay_impact_min: 35 }
    ],
    infrastructure_issue: {
      has_issue: true,
      type: 'debris_blockage',
      severity: 'HIGH',
      capacity_reduction_percent: 50,
      work_order_id: 'WO-BLR-9901',
      crew: 'BTP Heavy Towing Team 01',
      eta_minutes: 5
    },
    noise_hotspot: { is_hotspot: true, noise_db: 95.0, classification: 'traffic_horn', exposure_risk: 'CRITICAL' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Tin Factory Junction', status: 'Red', timer: 110, mode: 'manual_override' },
    recommendation: {
      action: 'Emergency Tow Deployment + Divert Whitefield traffic via Hoodi Circle',
      expected_delay_reduction_percent: 52,
      confidence: 0.97,
      primary_cause: 'Hanging Bridge Pinch Point + Intercity Freight'
    }
  },
  {
    zone_id: 'BLR-HEBBAL-05',
    name: 'Hebbal Flyover',
    latitude: 13.0358,
    longitude: 77.5970,
    road: 'Bellary Road / Airport Expressway',
    current_vehicle_density: 1720,
    average_speed: 11.2,
    road_condition: 'Ramp expansion construction under way',
    congestion_level: 'RED',
    risk_level: 'HIGH',
    noise_level: 89.4,
    incident_count: 1,
    prediction_5min: { queue_m: 950, speed: 10.5, trend: 'INCREASING' },
    prediction_10min: { queue_m: 1200, speed: 9.8, trend: 'INCREASING' },
    prediction_15min: { queue_m: 1450, speed: 9.0, trend: 'HIGH' },
    prediction_30min: { queue_m: 1750, speed: 8.2, trend: 'CRITICAL' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-06', type: 'congestion', title: 'Airport Bound Merging Backlog from Tumkur Road', severity: 'HIGH', delay_impact_min: 16 }
    ],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 89.4, classification: 'highway_rumble', exposure_risk: 'MEDIUM' },
    emergency_corridor: {
      active: true,
      vehicle_id: 'AMB-BLR-07',
      destination: 'Aster CMI Hospital',
      route: ['Hebbal-Ramp', 'Bellary-Main', 'Sahakar-Nagar'],
      target_eta_min: 3.8
    },
    signal_junction: { name: 'Hebbal Lake Junction', status: 'Green', timer: 50, mode: 'emergency_wave' },
    recommendation: {
      action: 'Dynamic Lane Inversion on Northbound Ramp & Active Green Wave for Airport Transit',
      expected_delay_reduction_percent: 41,
      confidence: 0.95,
      primary_cause: 'City-Airport Convergence'
    }
  },
  {
    zone_id: 'BLR-BELLANDUR-06',
    name: 'Outer Ring Road - Bellandur',
    latitude: 12.9304,
    longitude: 77.6784,
    road: 'Outer Ring Road (EcoSpace / RMZ Ecoworld)',
    current_vehicle_density: 1890,
    average_speed: 7.4,
    road_condition: 'Heavy Tech Park Egress Volume',
    congestion_level: 'DARK_RED',
    risk_level: 'CRITICAL',
    noise_level: 93.5,
    incident_count: 1,
    prediction_5min: { queue_m: 1300, speed: 6.8, trend: 'CRITICAL' },
    prediction_10min: { queue_m: 1600, speed: 6.0, trend: 'CRITICAL' },
    prediction_15min: { queue_m: 1900, speed: 5.4, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 2400, speed: 4.5, trend: 'GRIDLOCK' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-07', type: 'waterlogging', title: 'Water Accumulation on Left Lane near EcoSpace', severity: 'HIGH', delay_impact_min: 22 }
    ],
    infrastructure_issue: {
      has_issue: true,
      type: 'waterlogging',
      severity: 'HIGH',
      capacity_reduction_percent: 35,
      work_order_id: 'WO-BLR-5532',
      crew: 'BBMP Stormwater Drain Unit 09',
      eta_minutes: 10
    },
    noise_hotspot: { is_hotspot: true, noise_db: 93.5, classification: 'traffic_horn', exposure_risk: 'HIGH' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'EcoWorld Signal', status: 'Red', timer: 75, mode: 'adaptive' },
    recommendation: {
      action: 'Activate Staggered Tech Park Exit Signals & Pump Deployment',
      expected_delay_reduction_percent: 46,
      confidence: 0.93,
      primary_cause: 'High Tech Corridor Surge + Monsoonal Puddle'
    }
  },
  {
    zone_id: 'BLR-WHITEFIELD-07',
    name: 'Whitefield / Hope Farm',
    latitude: 12.9698,
    longitude: 77.7499,
    road: 'ITPL Main Road / Channasandra Road',
    current_vehicle_density: 1410,
    average_speed: 14.5,
    road_condition: 'Moderate traffic near ITPL gates',
    congestion_level: 'YELLOW',
    risk_level: 'LOW',
    noise_level: 81.2,
    incident_count: 0,
    prediction_5min: { queue_m: 450, speed: 14.0, trend: 'STABLE' },
    prediction_10min: { queue_m: 520, speed: 13.8, trend: 'STABLE' },
    prediction_15min: { queue_m: 600, speed: 13.5, trend: 'STABLE' },
    prediction_30min: { queue_m: 750, speed: 13.0, trend: 'STABLE' },
    last_updated: new Date().toISOString(),
    incidents: [],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 81.2, classification: 'normal_flow', exposure_risk: 'LOW' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Hope Farm Circle', status: 'Green', timer: 40, mode: 'adaptive' },
    recommendation: {
      action: 'Maintain Synchronized 40s Green Split for ITPL Outflow',
      expected_delay_reduction_percent: 15,
      confidence: 0.89,
      primary_cause: 'Regular Evening Traffic'
    }
  },
  {
    zone_id: 'BLR-INDIRA-08',
    name: 'Indiranagar 100 Feet Road',
    latitude: 12.9784,
    longitude: 77.6408,
    road: '100 Feet Road / CMH Road Junction',
    current_vehicle_density: 1250,
    average_speed: 18.2,
    road_condition: 'Good asphalt, double parking near retail zones',
    congestion_level: 'YELLOW',
    risk_level: 'LOW',
    noise_level: 84.0,
    incident_count: 0,
    prediction_5min: { queue_m: 380, speed: 18.0, trend: 'STABLE' },
    prediction_10min: { queue_m: 450, speed: 17.5, trend: 'STABLE' },
    prediction_15min: { queue_m: 550, speed: 17.0, trend: 'STABLE' },
    prediction_30min: { queue_m: 680, speed: 16.2, trend: 'STABLE' },
    last_updated: new Date().toISOString(),
    incidents: [],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 84.0, classification: 'commercial_ambience', exposure_risk: 'LOW' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Domlur-100ft Signal', status: 'Green', timer: 35, mode: 'adaptive' },
    recommendation: {
      action: 'Enforce Smart Parking Sensors to eliminate kerbside bottleneck',
      expected_delay_reduction_percent: 22,
      confidence: 0.90,
      primary_cause: 'Retail & Dining Peak Hour'
    }
  },
  {
    zone_id: 'BLR-KORAM-09',
    name: 'Koramangala Sony World',
    latitude: 12.9352,
    longitude: 77.6245,
    road: '80 Feet Road / 100 Feet Road Intermediate',
    current_vehicle_density: 1540,
    average_speed: 12.4,
    road_condition: 'High pedestrian and commercial density',
    congestion_level: 'ORANGE',
    risk_level: 'MEDIUM',
    noise_level: 88.6,
    incident_count: 1,
    prediction_5min: { queue_m: 720, speed: 11.8, trend: 'STABLE' },
    prediction_10min: { queue_m: 850, speed: 11.0, trend: 'INCREASING' },
    prediction_15min: { queue_m: 1020, speed: 10.2, trend: 'INCREASING' },
    prediction_30min: { queue_m: 1280, speed: 9.5, trend: 'HIGH' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-08', type: 'illegal_parking', title: 'Commercial Delivery Van Blocking Turn Lane', severity: 'MEDIUM', delay_impact_min: 9 }
    ],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 88.6, classification: 'traffic_horn', exposure_risk: 'MEDIUM' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Sony World Signal', status: 'Green', timer: 30, mode: 'adaptive' },
    recommendation: {
      action: 'Smart Signal Timing Adaptive Redistribution & Automated E-Challan for illegal loading',
      expected_delay_reduction_percent: 29,
      confidence: 0.92,
      primary_cause: 'Hub Traffic Merging into Hosur Road'
    }
  },
  {
    zone_id: 'BLR-HSR-10',
    name: 'HSR Layout 27th Main',
    latitude: 12.9121,
    longitude: 77.6446,
    road: '27th Main Commercial Corridor',
    current_vehicle_density: 1180,
    average_speed: 21.0,
    road_condition: 'Smooth wide carriageway',
    congestion_level: 'GREEN',
    risk_level: 'LOW',
    noise_level: 76.5,
    incident_count: 0,
    prediction_5min: { queue_m: 220, speed: 21.0, trend: 'STABLE' },
    prediction_10min: { queue_m: 260, speed: 20.5, trend: 'STABLE' },
    prediction_15min: { queue_m: 310, speed: 20.0, trend: 'STABLE' },
    prediction_30min: { queue_m: 400, speed: 19.5, trend: 'STABLE' },
    last_updated: new Date().toISOString(),
    incidents: [],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 76.5, classification: 'normal_flow', exposure_risk: 'LOW' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'HSR BDA Complex Signal', status: 'Green', timer: 45, mode: 'adaptive' },
    recommendation: {
      action: 'Recommended overflow corridor for Silk Board bypass traffic',
      expected_delay_reduction_percent: 18,
      confidence: 0.88,
      primary_cause: 'Optimal Flow Corridor'
    }
  },
  {
    zone_id: 'BLR-YESHW-11',
    name: 'Yeshwanthpur Goraguntepalya',
    latitude: 13.0234,
    longitude: 77.5503,
    road: 'Tumkur Road / Outer Ring Road Junction',
    current_vehicle_density: 1780,
    average_speed: 8.5,
    road_condition: 'Heavy truck movement + Flyover merging point',
    congestion_level: 'RED',
    risk_level: 'HIGH',
    noise_level: 92.4,
    incident_count: 1,
    prediction_5min: { queue_m: 1150, speed: 7.8, trend: 'INCREASING' },
    prediction_10min: { queue_m: 1400, speed: 7.0, trend: 'CRITICAL' },
    prediction_15min: { queue_m: 1680, speed: 6.4, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 2100, speed: 5.5, trend: 'CRITICAL' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-09', type: 'road_blockage', title: 'Slow moving multi-axle freight carrier on inner ramp', severity: 'HIGH', delay_impact_min: 20 }
    ],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: true, noise_db: 92.4, classification: 'diesel_engine_horn', exposure_risk: 'HIGH' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Goraguntepalya Signal', status: 'Red', timer: 80, mode: 'adaptive' },
    recommendation: {
      action: 'Activate North-West Freight Rerouting to NICE Road Corridor',
      expected_delay_reduction_percent: 39,
      confidence: 0.94,
      primary_cause: 'Industrial Logistics Overlap'
    }
  },
  {
    zone_id: 'BLR-MAJESTIC-12',
    name: 'Majestic Kempegowda Hub',
    latitude: 12.9767,
    longitude: 77.5713,
    road: 'Gubbi Thotadappa Road / Subhashnagar',
    current_vehicle_density: 1910,
    average_speed: 6.8,
    road_condition: 'Dense bus ingress and pedestrian movement',
    congestion_level: 'DARK_RED',
    risk_level: 'CRITICAL',
    noise_level: 96.0,
    incident_count: 2,
    prediction_5min: { queue_m: 1350, speed: 6.2, trend: 'CRITICAL' },
    prediction_10min: { queue_m: 1650, speed: 5.5, trend: 'CRITICAL' },
    prediction_15min: { queue_m: 1980, speed: 5.0, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 2450, speed: 4.2, trend: 'GRIDLOCK' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-10', type: 'pedestrian_surge', title: 'Heavy Peak Hour Transit Surge from Metro Interchange', severity: 'HIGH', delay_impact_min: 25 }
    ],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: true, noise_db: 96.0, classification: 'transit_bus_horn', exposure_risk: 'CRITICAL' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Sangam Theatre Signal', status: 'Red', timer: 90, mode: 'pedestrian_priority' },
    recommendation: {
      action: 'Coordinate KSRTC / BMTC Platooning & Pedestrian Green Wave Phasing',
      expected_delay_reduction_percent: 45,
      confidence: 0.96,
      primary_cause: 'Intermodal Transit Hub Saturation'
    }
  },
  {
    zone_id: 'BLR-AIRPORT-13',
    name: 'Hebbal - Airport Tollway (NH 44)',
    latitude: 13.0850,
    longitude: 77.6200,
    road: 'NH 44 Airport Expressway',
    current_vehicle_density: 980,
    average_speed: 62.0,
    road_condition: 'Access-controlled 6-lane expressway',
    congestion_level: 'GREEN',
    risk_level: 'LOW',
    noise_level: 74.0,
    incident_count: 0,
    prediction_5min: { queue_m: 100, speed: 62.0, trend: 'OPTIMAL' },
    prediction_10min: { queue_m: 120, speed: 61.5, trend: 'OPTIMAL' },
    prediction_15min: { queue_m: 150, speed: 60.0, trend: 'OPTIMAL' },
    prediction_30min: { queue_m: 200, speed: 58.0, trend: 'OPTIMAL' },
    last_updated: new Date().toISOString(),
    incidents: [],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 74.0, classification: 'highway_flow', exposure_risk: 'LOW' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'KIAL Toll Plaza Gate 03', status: 'Green', timer: 0, mode: 'free_flow' },
    recommendation: {
      action: 'Expressway operating at optimal design speed (60-80 km/h)',
      expected_delay_reduction_percent: 0,
      confidence: 0.98,
      primary_cause: 'Unobstructed Expressway'
    }
  },
  {
    zone_id: 'BLR-MGROAD-14',
    name: 'MG Road / Trinity Circle',
    latitude: 12.9756,
    longitude: 77.6066,
    road: 'Mahatma Gandhi Road / Old Madras Road link',
    current_vehicle_density: 1450,
    average_speed: 15.8,
    road_condition: 'CBD commercial corridor',
    congestion_level: 'ORANGE',
    risk_level: 'MEDIUM',
    noise_level: 86.4,
    incident_count: 0,
    prediction_5min: { queue_m: 580, speed: 15.0, trend: 'STABLE' },
    prediction_10min: { queue_m: 680, speed: 14.5, trend: 'STABLE' },
    prediction_15min: { queue_m: 800, speed: 13.8, trend: 'INCREASING' },
    prediction_30min: { queue_m: 1020, speed: 12.5, trend: 'INCREASING' },
    last_updated: new Date().toISOString(),
    incidents: [],
    infrastructure_issue: null,
    noise_hotspot: { is_hotspot: false, noise_db: 86.4, classification: 'cbd_traffic', exposure_risk: 'MEDIUM' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Trinity Circle Signal', status: 'Green', timer: 45, mode: 'adaptive' },
    recommendation: {
      action: 'Synchronize Green Wave toward Richmond Circle and Brigade Road',
      expected_delay_reduction_percent: 28,
      confidence: 0.91,
      primary_cause: 'CBD Financial Hub Commute'
    }
  },
  {
    zone_id: 'BLR-SARJAPUR-15',
    name: 'Sarjapur Road / Wipro Gate',
    latitude: 12.9100,
    longitude: 77.6850,
    road: 'Sarjapur Main Road',
    current_vehicle_density: 1620,
    average_speed: 10.5,
    road_condition: 'Narrow 2-lane bottleneck under widening project',
    congestion_level: 'RED',
    risk_level: 'HIGH',
    noise_level: 90.2,
    incident_count: 1,
    prediction_5min: { queue_m: 890, speed: 9.8, trend: 'INCREASING' },
    prediction_10min: { queue_m: 1100, speed: 9.0, trend: 'INCREASING' },
    prediction_15min: { queue_m: 1320, speed: 8.2, trend: 'CRITICAL' },
    prediction_30min: { queue_m: 1650, speed: 7.5, trend: 'CRITICAL' },
    last_updated: new Date().toISOString(),
    incidents: [
      { id: 'INC-BLR-11', type: 'pothole', title: 'Deep Pothole at Carmelaram Railway Crossing', severity: 'HIGH', delay_impact_min: 19 }
    ],
    infrastructure_issue: {
      has_issue: true,
      type: 'pothole',
      severity: 'HIGH',
      capacity_reduction_percent: 30,
      work_order_id: 'WO-BLR-6623',
      crew: 'South-East Zone Road Crew 05',
      eta_minutes: 14
    },
    noise_hotspot: { is_hotspot: true, noise_db: 90.2, classification: 'traffic_horn', exposure_risk: 'HIGH' },
    emergency_corridor: { active: false, vehicle_id: null, target_eta_min: null },
    signal_junction: { name: 'Kaikondrahalli Signal', status: 'Red', timer: 65, mode: 'adaptive' },
    recommendation: {
      action: 'Emergency Asphalt Cold-Patch at Railway Gate & Traffic Diversion to Hadosiddapura',
      expected_delay_reduction_percent: 36,
      confidence: 0.93,
      primary_cause: 'Suburban Arterial Capacity Deficit'
    }
  }
];

export const BANGALORE_CORRIDORS = [
  {
    id: 'CORRIDOR-ORR',
    name: 'Outer Ring Road Tech Backbone',
    waypoints: ['Hebbal', 'KR Puram', 'Marathahalli', 'Bellandur', 'Silk Board', 'HSR Layout'],
    total_length_km: 32.5,
    average_speed_kmh: 11.4,
    status: 'CONGESTED_CRITICAL',
    colorHex: '#EF4444'
  },
  {
    id: 'CORRIDOR-HOSUR',
    name: 'Hosur Road / Electronic City Arterial',
    waypoints: ['Silk Board', 'Bommanahalli', 'Kudlu Gate', 'Singasandra', 'Electronic City'],
    total_length_km: 14.8,
    average_speed_kmh: 18.2,
    status: 'MODERATE_FLOW',
    colorHex: '#F59E0B'
  },
  {
    id: 'CORRIDOR-AIRPORT',
    name: 'Airport Express Corridor',
    waypoints: ['MG Road', 'Hebbal Flyover', 'Yelahanka', 'Devenahalli Toll', 'KIA Terminal'],
    total_length_km: 36.0,
    average_speed_kmh: 52.0,
    status: 'OPTIMAL_GREEN_WAVE',
    colorHex: '#10B981'
  }
];

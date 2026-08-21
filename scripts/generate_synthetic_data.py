"""
Synthetic Dataset Generator for SAMVED + UrbanFlow AI System
Generates multi-modal, realistic synthetic traffic datasets with controlled correlations
for Bengaluru zones, V2V telemetry, accident detection, pedestrian safety, hotspots,
time-of-day traffic predictions, emergency V2X, and combined multimodal scenarios.

DISCLAIMER: All datasets generated are strictly SYNTHETIC / SIMULATION DATA for
prototype validation and machine learning training.
"""

import os
import csv
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'synthetic')

# Bengaluru Zones and Geographical Coordinates
BENGALURU_ZONES = [
    {"zone_id": "BLR-SILK-01", "name": "Silk Board Junction", "lat": 12.9176, "lng": 77.6238, "road": "Hosur Road / Outer Ring Road", "base_density": 0.88, "base_speed": 13.5, "noise_base": 88.0, "road_condition": 0.65},
    {"zone_id": "BLR-ECITY-02", "name": "Electronic City Toll", "lat": 12.8452, "lng": 77.6602, "road": "Hosur Elevated Expressway", "base_density": 0.72, "base_speed": 34.0, "noise_base": 78.0, "road_condition": 0.88},
    {"zone_id": "BLR-KRPUR-03", "name": "KR Puram Hanging Bridge", "lat": 12.9982, "lng": 77.6926, "road": "Old Madras Road / ORR", "base_density": 0.85, "base_speed": 16.0, "noise_base": 85.5, "road_condition": 0.60},
    {"zone_id": "BLR-HEBBL-04", "name": "Hebbal Flyover", "lat": 13.0358, "lng": 77.5970, "road": "Airport Road / Bellary Road", "base_density": 0.79, "base_speed": 24.5, "noise_base": 82.0, "road_condition": 0.82},
    {"zone_id": "BLR-MARATH-05", "name": "Marathahalli Bridge", "lat": 12.9569, "lng": 77.7011, "road": "Outer Ring Road", "base_density": 0.82, "base_speed": 18.0, "noise_base": 84.0, "road_condition": 0.70},
    {"zone_id": "BLR-BELLAN-06", "name": "Bellandur EcoSpace", "lat": 12.9260, "lng": 77.6762, "road": "Outer Ring Road IT Corridor", "base_density": 0.86, "base_speed": 14.0, "noise_base": 86.5, "road_condition": 0.68},
    {"zone_id": "BLR-WFIELD-07", "name": "Whitefield ITPL Main Gate", "lat": 12.9863, "lng": 77.7314, "road": "ITPL Main Road", "base_density": 0.76, "base_speed": 22.0, "noise_base": 79.5, "road_condition": 0.75},
    {"zone_id": "BLR-ORR-08", "name": "Outer Ring Road Sarjapur Jn", "lat": 12.9194, "lng": 77.6480, "road": "Sarjapur-ORR Junction", "base_density": 0.84, "base_speed": 15.0, "noise_base": 85.0, "road_condition": 0.66},
    {"zone_id": "BLR-KORAM-09", "name": "Koramangala Sony World Jn", "lat": 12.9352, "lng": 77.6245, "road": "100 Feet Intermediate Ring Road", "base_density": 0.78, "base_speed": 20.0, "noise_base": 81.0, "road_condition": 0.80},
    {"zone_id": "BLR-INDIRA-10", "name": "Indiranagar 100ft Road", "lat": 12.9719, "lng": 77.6412, "road": "100ft Road CMH Junction", "base_density": 0.70, "base_speed": 25.0, "noise_base": 79.0, "road_condition": 0.85},
    {"zone_id": "BLR-MGROAD-11", "name": "MG Road Brigade Jn", "lat": 12.9756, "lng": 77.6066, "road": "Mahatma Gandhi Road", "base_density": 0.74, "base_speed": 21.0, "noise_base": 83.0, "road_condition": 0.90},
    {"zone_id": "BLR-YESHW-12", "name": "Yeshwanthpur TTMC Circle", "lat": 13.0238, "lng": 77.5529, "road": "Tumkur Road / Subedarchatram Rd", "base_density": 0.77, "base_speed": 19.5, "noise_base": 83.5, "road_condition": 0.72}
]

WEATHER_CONDITIONS = ["CLEAR", "CLOUDY", "RAIN", "HEAVY_RAIN", "FOG"]
ROAD_CONDITIONS = ["GOOD", "FAIR", "POOR", "UNDER_CONSTRUCTION"]

def get_time_of_day_factor(hour):
    """Calculates congestion multiplier based on Bengaluru peak and non-peak patterns."""
    if 8 <= hour <= 11:
        # Morning peak (08:00 - 11:00)
        return 1.45 + 0.1 * np.sin((hour - 8) / 3 * np.pi)
    elif 11 < hour <= 16:
        # Afternoon moderate (11:00 - 16:00)
        return 0.95 + 0.05 * np.cos((hour - 11) / 5 * np.pi)
    elif 17 <= hour <= 21:
        # Evening peak (17:00 - 21:00)
        return 1.55 + 0.15 * np.sin((hour - 17) / 4 * np.pi)
    else:
        # Night / Off-peak (21:00 - 06:00)
        return 0.40 + 0.15 * np.sin(hour / 6 * np.pi)

def ensure_directories():
    os.makedirs(os.path.join(DATA_DIR, 'traffic'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'v2v'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'accidents'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'pedestrians'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'hotspots'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'traffic_prediction'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'emergency'), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'combined'), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, 'data', 'processed'), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, 'models'), exist_ok=True)

# ==============================================================================
# 1. TRAFFIC SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_traffic_dataset(num_records=12000):
    print(f"🚗 Generating Traffic Synthetic Dataset ({num_records} records)...")
    start_time = datetime(2026, 1, 1, 0, 0, 0)
    records = []

    for i in range(num_records):
        delta_minutes = random.randint(0, 90 * 24 * 60)
        curr_time = start_time + timedelta(minutes=delta_minutes)
        hour = curr_time.hour
        day_of_week = curr_time.weekday() # 0=Mon, 6=Sun
        is_weekend = 1 if day_of_week >= 5 else 0

        zone = random.choice(BENGALURU_ZONES)
        tod_factor = get_time_of_day_factor(hour)
        if is_weekend:
            tod_factor *= 0.82

        weather = random.choices(WEATHER_CONDITIONS, weights=[0.60, 0.20, 0.12, 0.05, 0.03])[0]
        weather_slowdown = 1.0
        visibility_km = 10.0
        if weather == "RAIN":
            weather_slowdown = 0.85
            visibility_km = 6.0
        elif weather == "HEAVY_RAIN":
            weather_slowdown = 0.65
            visibility_km = 3.0
        elif weather == "FOG":
            weather_slowdown = 0.75
            visibility_km = 1.5

        # Vehicle Density (0.0 to 1.0)
        density = min(0.99, max(0.1, zone["base_density"] * tod_factor * random.uniform(0.85, 1.15)))
        # Vehicle count (approx 20 to 320)
        vehicle_count = int(density * 280 + random.randint(-15, 15))
        # Average Speed in km/h inversely correlated with density
        avg_speed = max(4.0, zone["base_speed"] * (1.35 - density) * weather_slowdown + random.uniform(-2, 2))

        # Congestion Category
        if density > 0.82 or avg_speed < 12.0:
            congestion_level = "CRITICAL"
            queue_length_m = round(random.uniform(700, 1800), 1)
        elif density > 0.65 or avg_speed < 22.0:
            congestion_level = "HIGH"
            queue_length_m = round(random.uniform(350, 750), 1)
        elif density > 0.40:
            congestion_level = "MEDIUM"
            queue_length_m = round(random.uniform(100, 380), 1)
        else:
            congestion_level = "LOW"
            queue_length_m = round(random.uniform(10, 120), 1)

        signal_state = random.choices(["RED", "GREEN", "YELLOW"], weights=[0.45, 0.45, 0.10])[0]
        accident_present = 1 if (random.random() < 0.035 and congestion_level in ["HIGH", "CRITICAL"]) else 0
        construction_present = 1 if (random.random() < 0.08) else 0
        pedestrian_density = min(1.0, max(0.05, (tod_factor * 0.4) + random.uniform(0.0, 0.4)))
        noise_db = round(zone["noise_base"] + (density * 12.0) - (avg_speed * 0.2) + (5.0 if accident_present else 0.0) + random.uniform(-2.5, 2.5), 1)
        emergency_vehicle = 1 if random.random() < 0.04 else 0

        records.append({
            "record_id": f"TRF-{i+1:06d}",
            "timestamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "zone_id": zone["zone_id"],
            "zone_name": zone["name"],
            "latitude": zone["lat"] + random.uniform(-0.002, 0.002),
            "longitude": zone["lng"] + random.uniform(-0.002, 0.002),
            "road_name": zone["road"],
            "road_condition_score": round(zone["road_condition"] + random.uniform(-0.05, 0.05), 2),
            "vehicle_density": round(density, 3),
            "vehicle_count": max(10, vehicle_count),
            "average_speed_kmh": round(avg_speed, 1),
            "congestion_level": congestion_level,
            "queue_length_meters": queue_length_m,
            "traffic_signal_state": signal_state,
            "weather_condition": weather,
            "visibility_km": round(visibility_km, 1),
            "accident_present": accident_present,
            "construction_present": construction_present,
            "pedestrian_density": round(pedestrian_density, 2),
            "noise_level_db": noise_db,
            "emergency_vehicle_present": emergency_vehicle,
            "data_source_type": "SYNTHETIC / SIMULATION DATA"
        })

    filepath = os.path.join(DATA_DIR, 'traffic', 'traffic_synthetic.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved traffic dataset to {filepath}")
    return filepath

# ==============================================================================
# 2. V2V SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_v2v_dataset(num_records=12000):
    print(f"📡 Generating V2V Communication Synthetic Dataset ({num_records} records)...")
    records = []
    vehicle_types = ["CAR", "SUV", "BUS", "TRUCK", "MOTORBIKE", "AMBULANCE"]
    comm_modes = ["DSRC", "C-V2V"]
    hazards = ["NORMAL_DRIVING", "SUDDEN_BRAKING", "HAZARD", "ACCIDENT", "EMERGENCY_VEHICLE", "PEDESTRIAN_CONFLICT"]

    for i in range(num_records):
        sender_id = f"VEH-{random.randint(1, 150):03d}"
        receiver_id = f"VEH-{random.randint(151, 300):03d}"
        if random.random() < 0.06:
            sender_id = "AMB-07"

        sender_type = "AMBULANCE" if sender_id == "AMB-07" else random.choice(vehicle_types)
        comm_mode = random.choices(comm_modes, weights=[0.55, 0.45])[0]

        # Communication characteristics
        if comm_mode == "DSRC":
            # DSRC: Short range (<300m), ultra low latency (2-8ms)
            distance_m = round(random.uniform(5.0, 290.0), 1)
            latency_ms = round(random.uniform(2.0, 8.5), 2)
            packet_loss = round(max(0.0, (distance_m / 300.0) ** 2 * 0.05 + random.uniform(0.001, 0.015)), 3)
            signal_strength_dbm = round(-40.0 - (distance_m * 0.18) + random.uniform(-3, 3), 1)
        else:
            # C-V2V: Longer range (up to 1200m), moderate latency (25-70ms)
            distance_m = round(random.uniform(20.0, 1150.0), 1)
            latency_ms = round(random.uniform(22.0, 65.0), 2)
            packet_loss = round(random.uniform(0.005, 0.035), 3)
            signal_strength_dbm = round(-60.0 - (distance_m * 0.03) + random.uniform(-4, 4), 1)

        hazard = random.choices(hazards, weights=[0.60, 0.15, 0.09, 0.06, 0.05, 0.05])[0]
        sender_speed = round(random.uniform(15.0, 85.0), 1)
        receiver_speed = round(max(0.0, sender_speed + random.uniform(-25.0, 20.0)), 1)
        relative_speed = round(sender_speed - receiver_speed, 1)

        heading_diff_deg = round(abs(random.gauss(10, 25)) % 180, 1)

        # Acceleration / Deceleration
        if hazard == "SUDDEN_BRAKING":
            acceleration = round(random.uniform(-9.5, -5.5), 2)
            deceleration = abs(acceleration)
            braking_status = "HARD_BRAKING"
        elif hazard == "ACCIDENT":
            acceleration = round(random.uniform(-14.0, -8.0), 2)
            deceleration = abs(acceleration)
            braking_status = "CRASH_STOP"
        else:
            acceleration = round(random.uniform(-2.5, 2.5), 2)
            deceleration = max(0.0, -acceleration)
            braking_status = "NORMAL" if acceleration >= 0 else "LIGHT_BRAKING"

        # Calculate collision probability
        ttc = distance_m / max(0.1, abs(relative_speed) / 3.6) if relative_speed > 0 else 999.0 # Time to collision in sec
        raw_collision_prob = 0.0
        if hazard == "ACCIDENT":
            raw_collision_prob = 0.88 + random.uniform(0.02, 0.10)
        elif hazard == "SUDDEN_BRAKING" and distance_m < 80:
            raw_collision_prob = max(0.35, 1.0 - (distance_m / 80.0) * 0.7)
        elif ttc < 3.0:
            raw_collision_prob = 0.75 + random.uniform(0.05, 0.20)
        elif ttc < 6.0:
            raw_collision_prob = 0.40 + random.uniform(0.05, 0.25)
        else:
            raw_collision_prob = max(0.01, random.uniform(0.01, 0.15))

        collision_prob = min(0.99, round(raw_collision_prob, 3))

        # Risk label
        if collision_prob > 0.75 or hazard in ["ACCIDENT"]:
            risk_label = "CRITICAL"
            warning_required = 1
        elif collision_prob > 0.40 or hazard in ["SUDDEN_BRAKING", "EMERGENCY_VEHICLE"]:
            risk_label = "WARNING"
            warning_required = 1
        else:
            risk_label = "SAFE"
            warning_required = 0

        records.append({
            "message_id": f"V2V-MSG-{i+1:06d}",
            "sender_vehicle_id": sender_id,
            "sender_type": sender_type,
            "receiver_vehicle_id": receiver_id,
            "distance_m": distance_m,
            "sender_speed_kmh": sender_speed,
            "receiver_speed_kmh": receiver_speed,
            "relative_speed_kmh": relative_speed,
            "acceleration_mps2": acceleration,
            "deceleration_mps2": deceleration,
            "heading_difference_deg": heading_diff_deg,
            "braking_status": braking_status,
            "communication_mode": comm_mode,
            "latency_ms": latency_ms,
            "packet_loss_rate": packet_loss,
            "signal_strength_dbm": signal_strength_dbm,
            "hazard_type": hazard,
            "time_to_collision_sec": round(min(ttc, 99.0), 2),
            "collision_probability": collision_prob,
            "warning_required": warning_required,
            "v2v_risk_level": risk_label,
            "data_source": "SYNTHETIC V2V TELEMETRY"
        })

    filepath = os.path.join(DATA_DIR, 'v2v', 'v2v_synthetic.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved V2V dataset to {filepath}")
    return filepath

# ==============================================================================
# 3. ACCIDENT DETECTION SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_accident_dataset(num_records=12000):
    print(f"🚨 Generating Accident Detection Synthetic Dataset ({num_records} records)...")
    records = []

    for i in range(num_records):
        vehicle_id = f"VEH-{random.randint(1, 200):03d}"
        initial_speed = round(random.uniform(10.0, 95.0), 1)

        # Determine class distribution with realistic imbalance (approx 70% NO, 18% POSSIBLE, 12% ACCIDENT)
        rand_val = random.random()
        if rand_val < 0.70:
            accident_label = "NO_ACCIDENT"
            severity = "NONE"
            deceleration = round(random.uniform(0.0, 3.8), 2)
            jerk = round(random.uniform(0.1, 4.0), 2)
            heading_change = round(abs(random.gauss(2, 6)), 1)
            airbag_trigger = 0
            impact_indicator = round(random.uniform(0.0, 0.15), 3)
            collision_distance = round(random.uniform(35.0, 250.0), 1)
            braking_status = random.choice(["NONE", "LIGHT", "NORMAL"])
            blockage_prob = round(random.uniform(0.0, 0.15), 2)
            emergency_required = 0
        elif rand_val < 0.88:
            accident_label = "POSSIBLE_COLLISION"
            severity = "MEDIUM" if random.random() < 0.7 else "LOW"
            deceleration = round(random.uniform(4.5, 8.5), 2)
            jerk = round(random.uniform(6.0, 18.0), 2)
            heading_change = round(abs(random.gauss(15, 20)), 1)
            airbag_trigger = 0
            impact_indicator = round(random.uniform(0.20, 0.55), 3)
            collision_distance = round(random.uniform(4.0, 30.0), 1)
            braking_status = "HARD_BRAKING"
            blockage_prob = round(random.uniform(0.35, 0.65), 2)
            emergency_required = 0
        else:
            accident_label = "ACCIDENT"
            severity = random.choices(["MEDIUM", "HIGH", "CRITICAL"], weights=[0.20, 0.45, 0.35])[0]
            deceleration = round(random.uniform(8.5, 18.5), 2)
            jerk = round(random.uniform(22.0, 75.0), 2)
            heading_change = round(random.uniform(30.0, 180.0), 1)
            airbag_trigger = 1 if (severity in ["HIGH", "CRITICAL"] and random.random() < 0.85) else 0
            impact_indicator = round(random.uniform(0.70, 0.99), 3)
            collision_distance = round(random.uniform(0.0, 6.0), 1)
            braking_status = "CRASH_STOP"
            blockage_prob = round(random.uniform(0.75, 0.98), 2)
            emergency_required = 1

        vehicle_density = round(random.uniform(0.25, 0.95), 2)
        nearby_vehicle_count = int(vehicle_density * 14 + random.randint(0, 4))
        road_condition = random.choice(ROAD_CONDITIONS)
        weather = random.choice(WEATHER_CONDITIONS)
        visibility = 10.0 if weather == "CLEAR" else (5.0 if weather == "RAIN" else 2.0)

        # Feature correlation calculations
        calc_collision_prob = round(
            min(0.99, max(0.01, 
                (deceleration / 18.0) * 0.45 + 
                (jerk / 75.0) * 0.25 + 
                impact_indicator * 0.20 + 
                (1.0 - min(collision_distance, 50.0) / 50.0) * 0.10
            )), 3
        )

        records.append({
            "incident_id": f"ACC-REC-{i+1:06d}",
            "vehicle_id": vehicle_id,
            "vehicle_speed_kmh": initial_speed,
            "deceleration_mps2": deceleration,
            "jerk_mps3": jerk,
            "heading_change_deg": heading_change,
            "airbag_trigger": airbag_trigger,
            "impact_sensor_indicator": impact_indicator,
            "collision_distance_m": collision_distance,
            "braking_status": braking_status,
            "nearby_vehicle_count": nearby_vehicle_count,
            "vehicle_density": vehicle_density,
            "road_condition": road_condition,
            "weather_condition": weather,
            "visibility_km": visibility,
            "calculated_collision_probability": calc_collision_prob,
            "road_blockage_probability": blockage_prob,
            "emergency_required": emergency_required,
            "severity": severity,
            "accident_detected_label": accident_label,
            "telemetry_source": "SIMULATED V2V TELEMETRY"
        })

    filepath = os.path.join(DATA_DIR, 'accidents', 'accidents_synthetic.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved accident dataset to {filepath}")
    return filepath

# ==============================================================================
# 4. PEDESTRIAN SAFETY SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_pedestrian_dataset(num_records=12000):
    print(f"🚶 Generating Pedestrian Safety Synthetic Dataset ({num_records} records)...")
    records = []
    zones = [z["name"] for z in BENGALURU_ZONES]

    for i in range(num_records):
        ped_id = f"PED-{random.randint(1, 300):03d}"
        zone = random.choice(zones)
        ped_count = random.randint(1, 28)
        ped_distance_to_curb = round(random.uniform(0.0, 12.0), 1)
        crossing_status = 1 if (ped_distance_to_curb < 3.5 and random.random() < 0.65) else 0

        vehicle_speed = round(random.uniform(10.0, 75.0), 1)
        vehicle_distance_to_crossing = round(random.uniform(3.0, 120.0), 1)
        signal_state = random.choice(["RED", "GREEN", "YELLOW"])
        ped_signal = "WALK" if signal_state == "RED" else "DONT_WALK"

        road_width_m = round(random.choice([12.0, 16.0, 24.0, 32.0]), 1)
        hour = random.randint(0, 23)
        visibility = round(random.uniform(2.0, 10.0), 1)
        weather = random.choice(WEATHER_CONDITIONS)

        # Conflict calculation
        time_for_ped_to_cross = (road_width_m / 1.2) # seconds at 1.2 m/s walk speed
        time_for_vehicle_to_arrive = vehicle_distance_to_crossing / max(1.0, vehicle_speed / 3.6)

        conflict = False
        if crossing_status and time_for_vehicle_to_arrive < 4.0:
            conflict = True

        # Risk scoring
        if conflict and vehicle_speed > 40.0:
            risk_label = "CRITICAL_RISK"
            risk_score = round(random.uniform(0.85, 0.99), 3)
            rec_action = "EMERGENCY_VEHICLE_STOP_AND_HOLD_CROSSING"
        elif crossing_status and (time_for_vehicle_to_arrive < 8.0 or signal_state == "GREEN"):
            risk_label = "HIGH_RISK"
            risk_score = round(random.uniform(0.65, 0.84), 3)
            rec_action = "EXTEND_PEDESTRIAN_CROSSING_PHASE"
        elif ped_distance_to_curb < 2.0 or ped_count > 10:
            risk_label = "MEDIUM_RISK"
            risk_score = round(random.uniform(0.35, 0.64), 3)
            rec_action = "ADAPTIVE_CROSSING_ALERT"
        else:
            risk_label = "LOW_RISK"
            risk_score = round(random.uniform(0.05, 0.34), 3)
            rec_action = "STANDARD_SIGNAL_PHASING"

        records.append({
            "record_id": f"PED-REC-{i+1:06d}",
            "pedestrian_id": ped_id,
            "zone": zone,
            "pedestrian_count": ped_count,
            "distance_to_curb_m": ped_distance_to_curb,
            "is_crossing": crossing_status,
            "vehicle_distance_m": vehicle_distance_to_crossing,
            "vehicle_speed_kmh": vehicle_speed,
            "time_to_crossing_sec": round(time_for_vehicle_to_arrive, 2),
            "traffic_signal_state": signal_state,
            "pedestrian_signal_state": ped_signal,
            "road_width_m": road_width_m,
            "hour": hour,
            "weather": weather,
            "visibility_km": visibility,
            "conflict_detected": 1 if conflict else 0,
            "pedestrian_risk_score": risk_score,
            "recommended_action": rec_action,
            "pedestrian_risk_label": risk_label,
            "data_type": "SYNTHETIC PEDESTRIAN TELEMETRY"
        })

    filepath = os.path.join(DATA_DIR, 'pedestrians', 'pedestrians_synthetic.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved pedestrian safety dataset to {filepath}")
    return filepath

# ==============================================================================
# 5. TRAFFIC HOTSPOT SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_hotspot_dataset(num_records=12000):
    print(f"🔥 Generating Traffic Hotspot Synthetic Dataset ({num_records} records)...")
    records = []

    for i in range(num_records):
        zone = random.choice(BENGALURU_ZONES)
        hour = random.randint(0, 23)
        tod_factor = get_time_of_day_factor(hour)

        density = min(0.99, max(0.15, zone["base_density"] * tod_factor * random.uniform(0.85, 1.15)))
        avg_speed = max(4.0, zone["base_speed"] * (1.30 - density) + random.uniform(-2, 2))
        queue_m = round(max(20.0, density * 1650.0 + random.uniform(-100, 100)), 1)
        road_condition = round(zone["road_condition"] + random.uniform(-0.1, 0.1), 2)
        accident_count = random.choices([0, 1, 2, 3], weights=[0.82, 0.13, 0.04, 0.01])[0]
        pedestrian_density = min(1.0, max(0.05, (tod_factor * 0.45) + random.uniform(0.0, 0.35)))
        noise_db = round(zone["noise_base"] + (density * 10.0) + (accident_count * 3.5) + random.uniform(-2, 2), 1)
        signal_delay_sec = round(max(10.0, (density ** 1.5) * 110.0 + random.uniform(-10, 15)), 1)

        # Composite hotspot score (0.0 to 100.0)
        hotspot_score = round(
            (density * 35.0) +
            (max(0.0, (40.0 - avg_speed) / 40.0) * 25.0) +
            (min(1.0, queue_m / 1500.0) * 15.0) +
            (accident_count * 10.0) +
            (pedestrian_density * 8.0) +
            ((1.0 - road_condition) * 7.0),
            1
        )
        hotspot_score = min(100.0, max(5.0, hotspot_score))

        if hotspot_score > 75.0:
            label = "CRITICAL"
        elif hotspot_score > 55.0:
            label = "HIGH"
        elif hotspot_score > 35.0:
            label = "MEDIUM"
        else:
            label = "LOW"

        spillover_risk_pct = round(min(98.0, max(5.0, hotspot_score * 0.95 + random.uniform(-5, 5))), 1)

        records.append({
            "record_id": f"HOTSPOT-{i+1:06d}",
            "zone_id": zone["zone_id"],
            "zone_name": zone["name"],
            "road": zone["road"],
            "latitude": zone["lat"],
            "longitude": zone["lng"],
            "hour": hour,
            "vehicle_density": round(density, 3),
            "average_speed_kmh": round(avg_speed, 1),
            "queue_length_m": queue_m,
            "road_condition_score": road_condition,
            "accident_count": accident_count,
            "pedestrian_density": round(pedestrian_density, 2),
            "noise_db": noise_db,
            "signal_delay_sec": signal_delay_sec,
            "spillover_risk_percent": spillover_risk_pct,
            "hotspot_composite_score": hotspot_score,
            "hotspot_risk_label": label,
            "data_category": "SYNTHETIC BENGALURU HOTSPOT"
        })

    filepath = os.path.join(DATA_DIR, 'hotspots', 'hotspots_synthetic.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved hotspot dataset to {filepath}")
    return filepath

# ==============================================================================
# 6. TIME-BASED TRAFFIC PREDICTION SYNTHETIC DATASET (12,000 records)
# ==============================================================================
def generate_traffic_prediction_dataset(num_records=12000):
    print(f"📈 Generating Time-Based Traffic Prediction Synthetic Dataset ({num_records} records)...")
    records = []

    for i in range(num_records):
        zone = random.choice(BENGALURU_ZONES)
        hour = random.randint(0, 23)
        minute = random.choice([0, 15, 30, 45])
        time_decimal = hour + (minute / 60.0)

        # Baseline density
        current_tod = get_time_of_day_factor(time_decimal)
        current_density = min(0.98, max(0.10, zone["base_density"] * current_tod * random.uniform(0.90, 1.10)))
        current_speed = max(5.0, zone["base_speed"] * (1.30 - current_density) + random.uniform(-1.5, 1.5))
        current_queue = max(15.0, current_density * 1200.0)

        # Future time steps: +5min, +10min, +15min, +30min, +60min
        future_5m_tod = get_time_of_day_factor(time_decimal + (5/60.0))
        future_15m_tod = get_time_of_day_factor(time_decimal + (15/60.0))
        future_30m_tod = get_time_of_day_factor(time_decimal + (30/60.0))
        future_60m_tod = get_time_of_day_factor(time_decimal + (60/60.0))

        # Predict future metrics
        future_5m_density = min(0.99, max(0.10, current_density * (future_5m_tod / current_tod) + random.uniform(-0.02, 0.02)))
        future_15m_density = min(0.99, max(0.10, current_density * (future_15m_tod / current_tod) + random.uniform(-0.04, 0.04)))
        future_30m_density = min(0.99, max(0.10, current_density * (future_30m_tod / current_tod) + random.uniform(-0.06, 0.06)))
        future_60m_density = min(0.99, max(0.10, current_density * (future_60m_tod / current_tod) + random.uniform(-0.08, 0.08)))

        future_30m_speed = max(4.0, zone["base_speed"] * (1.30 - future_30m_density) + random.uniform(-2, 2))
        future_30m_queue = max(10.0, future_30m_density * 1500.0 + random.uniform(-50, 50))
        future_30m_vehicle_count = int(future_30m_density * 280)

        if future_30m_density > 0.82 or future_30m_speed < 12.0:
            future_30m_congestion = "CRITICAL"
        elif future_30m_density > 0.65:
            future_30m_congestion = "HIGH"
        elif future_30m_density > 0.40:
            future_30m_congestion = "MEDIUM"
        else:
            future_30m_congestion = "LOW"

        records.append({
            "series_id": f"TS-PRED-{i+1:06d}",
            "zone_id": zone["zone_id"],
            "zone_name": zone["name"],
            "hour": hour,
            "minute": minute,
            "time_decimal": round(time_decimal, 2),
            "current_vehicle_density": round(current_density, 3),
            "current_speed_kmh": round(current_speed, 1),
            "current_queue_m": round(current_queue, 1),
            "road_condition": zone["road_condition"],
            "pedestrian_density": round(min(1.0, current_tod * 0.4), 2),
            "future_5min_density": round(future_5m_density, 3),
            "future_15min_density": round(future_15m_density, 3),
            "future_30min_density": round(future_30m_density, 3),
            "future_60min_density": round(future_60m_density, 3),
            "future_30min_speed_kmh": round(future_30m_speed, 1),
            "future_30min_queue_m": round(future_30m_queue, 1),
            "future_30min_vehicle_count": future_30m_vehicle_count,
            "future_30min_congestion_level": future_30m_congestion,
            "data_mode": "SYNTHETIC TIME SERIES"
        })

    filepath = os.path.join(DATA_DIR, 'traffic_prediction', 'prediction_time_series.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved traffic prediction dataset to {filepath}")
    return filepath

# ==============================================================================
# 7. EMERGENCY V2X SYNTHETIC DATASET (10,000 records)
# ==============================================================================
def generate_emergency_dataset(num_records=10000):
    print(f"🚑 Generating Emergency V2X Synthetic Dataset ({num_records} records)...")
    records = []
    types = ["AMBULANCE", "FIRE_TRUCK", "POLICE"]

    for i in range(num_records):
        veh_type = random.choices(types, weights=[0.70, 0.20, 0.10])[0]
        vehicle_id = f"AMB-{random.randint(1, 20):02d}" if veh_type == "AMBULANCE" else (f"FIRE-{random.randint(1, 10):02d}" if veh_type == "FIRE_TRUCK" else f"POL-{random.randint(1, 10):02d}")
        
        distance_to_dest_km = round(random.uniform(1.5, 16.0), 1)
        traffic_density = round(random.uniform(0.20, 0.98), 2)
        signal_count = max(2, int(distance_to_dest_km * 1.8 + random.randint(0, 3)))
        current_speed = round(max(10.0, 60.0 * (1.2 - traffic_density) + random.uniform(-5, 5)), 1)

        # Baseline ETA without AI green corridor
        baseline_eta_min = round(max(3.0, (distance_to_dest_km / (current_speed / 60.0)) + (signal_count * 1.2)), 1)
        # Optimized target ETA with SAMVED Green Corridor
        optimized_eta_min = round(max(2.0, (distance_to_dest_km / (55.0 / 60.0)) + (signal_count * 0.1)), 1)
        emergency_delay_min = round(max(0.0, baseline_eta_min - optimized_eta_min), 1)

        green_corridor_req = 1 if (baseline_eta_min > 5.0 or traffic_density > 0.50) else 0
        priority_label = "CRITICAL" if (veh_type == "AMBULANCE" or baseline_eta_min > 12.0) else "HIGH"

        records.append({
            "emergency_event_id": f"EMG-EVT-{i+1:06d}",
            "vehicle_id": vehicle_id,
            "emergency_vehicle_type": veh_type,
            "distance_to_dest_km": distance_to_dest_km,
            "traffic_density": traffic_density,
            "signal_count": signal_count,
            "current_speed_kmh": current_speed,
            "baseline_eta_minutes": baseline_eta_min,
            "target_optimized_eta_minutes": optimized_eta_min,
            "emergency_delay_minutes": emergency_delay_min,
            "recommended_priority": priority_label,
            "green_corridor_required": green_corridor_req,
            "data_tag": "SYNTHETIC EMERGENCY V2X"
        })

    filepath = os.path.join(DATA_DIR, 'emergency', 'emergency_v2x.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved emergency V2X dataset to {filepath}")
    return filepath

# ==============================================================================
# 8. MULTI-MODAL COMBINED DATASET (12,000 records)
# ==============================================================================
def generate_multimodal_dataset(num_records=12000):
    print(f"🌐 Generating Multi-Modal Combined Dataset ({num_records} records)...")
    records = []

    for i in range(num_records):
        zone = random.choice(BENGALURU_ZONES)
        hour = random.randint(0, 23)
        tod = "morning_peak" if 8 <= hour <= 11 else ("evening_peak" if 17 <= hour <= 21 else ("afternoon" if 11 < hour < 17 else "night"))

        traffic_density = round(random.uniform(0.20, 0.98), 3)
        avg_speed = round(max(5.0, zone["base_speed"] * (1.30 - traffic_density) + random.uniform(-2, 2)), 1)
        accident_prob = round(random.uniform(0.01, 0.98), 3)
        pedestrian_risk = round(random.uniform(0.05, 0.95), 3)
        road_condition = round(zone["road_condition"] + random.uniform(-0.1, 0.1), 2)
        noise_db = round(zone["noise_base"] + (traffic_density * 12.0) + random.uniform(-2, 2), 1)
        emergency_present = 1 if random.random() < 0.08 else 0

        # Unified incident risk score (0.0 to 100.0)
        incident_risk_score = round(
            (accident_prob * 45.0) +
            (pedestrian_risk * 25.0) +
            (traffic_density * 15.0) +
            ((1.0 - road_condition) * 10.0) +
            (emergency_present * 5.0),
            1
        )
        incident_risk_score = min(100.0, max(1.0, incident_risk_score))

        # Traffic impact score (0.0 to 100.0)
        traffic_impact_score = round(
            (traffic_density * 40.0) +
            (max(0.0, (40.0 - avg_speed) / 40.0) * 30.0) +
            (accident_prob * 20.0) +
            (pedestrian_risk * 10.0),
            1
        )
        traffic_impact_score = min(100.0, max(1.0, traffic_impact_score))

        records.append({
            "multimodal_id": f"MM-REC-{i+1:06d}",
            "zone_name": zone["name"],
            "hour": hour,
            "time_of_day_period": tod,
            "traffic_density": traffic_density,
            "average_speed_kmh": avg_speed,
            "accident_probability": accident_prob,
            "pedestrian_risk": pedestrian_risk,
            "road_condition_score": road_condition,
            "noise_db": noise_db,
            "emergency_vehicle_present": emergency_present,
            "incident_risk_score": incident_risk_score,
            "traffic_impact_score": traffic_impact_score,
            "data_source": "SYNTHETIC MULTIMODAL SIMULATION"
        })

    filepath = os.path.join(DATA_DIR, 'combined', 'multimodal_traffic_dataset.csv')
    pd.DataFrame(records).to_csv(filepath, index=False)
    print(f"✅ Saved multimodal combined dataset to {filepath}")
    return filepath

# ==============================================================================
# DATASET QUALITY VALIDATION
# ==============================================================================
def validate_synthetic_datasets():
    print("\n" + "="*50)
    print("📊 RUNNING SYNTHETIC DATASET QUALITY CHECKS")
    print("="*50)

    datasets = [
        ("Traffic", os.path.join(DATA_DIR, 'traffic', 'traffic_synthetic.csv')),
        ("V2V Communication", os.path.join(DATA_DIR, 'v2v', 'v2v_synthetic.csv')),
        ("Accident Detection", os.path.join(DATA_DIR, 'accidents', 'accidents_synthetic.csv')),
        ("Pedestrian Safety", os.path.join(DATA_DIR, 'pedestrians', 'pedestrians_synthetic.csv')),
        ("Hotspots", os.path.join(DATA_DIR, 'hotspots', 'hotspots_synthetic.csv')),
        ("Traffic Prediction", os.path.join(DATA_DIR, 'traffic_prediction', 'prediction_time_series.csv')),
        ("Emergency V2X", os.path.join(DATA_DIR, 'emergency', 'emergency_v2x.csv')),
        ("Multi-Modal Combined", os.path.join(DATA_DIR, 'combined', 'multimodal_traffic_dataset.csv'))
    ]

    report = {"timestamp": datetime.now().isoformat(), "datasets": []}
    all_passed = True

    for name, path in datasets:
        if not os.path.exists(path):
            print(f"❌ Missing dataset: {name} at {path}")
            all_passed = False
            continue

        df = pd.read_csv(path)
        missing_count = int(df.isnull().sum().sum())
        duplicate_count = int(df.duplicated().sum())
        row_count = len(df)

        status = "PASSED" if (missing_count == 0 and duplicate_count == 0 and row_count >= 10000) else "WARNING"
        print(f"  • {name:<22}: Rows={row_count:<6} Missing={missing_count:<2} Duplicates={duplicate_count:<2} -> {status}")

        report["datasets"].append({
            "name": name,
            "path": path,
            "rows": row_count,
            "columns": len(df.columns),
            "missing_values": missing_count,
            "duplicates": duplicate_count,
            "status": status
        })

    report_path = os.path.join(BASE_DIR, 'data', 'processed', 'data_quality_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n✅ Quality validation completed. Report saved to {report_path}")
    return all_passed

def main():
    ensure_directories()
    generate_traffic_dataset(12000)
    generate_v2v_dataset(12000)
    generate_accident_dataset(12000)
    generate_pedestrian_dataset(12000)
    generate_hotspot_dataset(12000)
    generate_traffic_prediction_dataset(12000)
    generate_emergency_dataset(10000)
    generate_multimodal_dataset(12000)
    validate_synthetic_datasets()

if __name__ == "__main__":
    main()

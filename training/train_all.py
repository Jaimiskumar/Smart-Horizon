"""
Model Training Scripts for SAMVED + UrbanFlow AI System
Trains genuine machine learning models on synthetic datasets:
1. Accident Detection Model (acc-v1)
2. V2V Risk Assessment Model (v2v-v1)
3. Pedestrian Safety Risk Model (ped-v1)
4. Bengaluru Traffic Hotspot Model (hotspot-v1)
5. Traffic Prediction Regressor & Classifier (pred-v1)
6. Emergency Priority & Green Corridor Model (em-v1)
7. Multi-Modal Composite Risk Model (mm-v1)
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, mean_absolute_error, r2_score

RANDOM_SEED = 42
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'synthetic')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# ==============================================================================
# 1. ACCIDENT DETECTION MODEL
# ==============================================================================
def train_accident_model():
    print("\n🚨 Training Accident Detection Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'accidents', 'accidents_synthetic.csv'))

    features = [
        'vehicle_speed_kmh', 'deceleration_mps2', 'jerk_mps3', 'heading_change_deg',
        'airbag_trigger', 'impact_sensor_indicator', 'collision_distance_m',
        'vehicle_density', 'nearby_vehicle_count'
    ]
    target = 'accident_detected_label'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=RANDOM_SEED, class_weight='balanced')
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')

    # Feature Importance
    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    model_path = os.path.join(MODELS_DIR, 'accident_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'accident_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    metrics = {
        'model_name': 'accident_model',
        'version': 'acc-v1',
        'algorithm': 'RandomForestClassifier',
        'accuracy': round(float(acc), 4),
        'f1_score': round(float(f1), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Accident Model trained | Test Accuracy: {acc*100:.2f}% | F1 Score: {f1*100:.2f}%")
    return metrics

# ==============================================================================
# 2. V2V RISK MODEL
# ==============================================================================
def train_v2v_model():
    print("\n📡 Training V2V Risk Assessment Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'v2v', 'v2v_synthetic.csv'))

    features = [
        'distance_m', 'sender_speed_kmh', 'receiver_speed_kmh', 'relative_speed_kmh',
        'acceleration_mps2', 'deceleration_mps2', 'heading_difference_deg',
        'time_to_collision_sec', 'collision_probability'
    ]
    target = 'v2v_risk_level'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=RANDOM_SEED, class_weight='balanced')
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')

    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    model_path = os.path.join(MODELS_DIR, 'v2v_risk_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'v2v_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    metrics = {
        'model_name': 'v2v_risk_model',
        'version': 'v2v-v1',
        'algorithm': 'RandomForestClassifier',
        'accuracy': round(float(acc), 4),
        'f1_score': round(float(f1), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ V2V Model trained | Test Accuracy: {acc*100:.2f}% | F1 Score: {f1*100:.2f}%")
    return metrics

# ==============================================================================
# 3. PEDESTRIAN SAFETY RISK MODEL
# ==============================================================================
def train_pedestrian_model():
    print("\n🚶 Training Pedestrian Safety Risk Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'pedestrians', 'pedestrians_synthetic.csv'))

    features = [
        'pedestrian_count', 'distance_to_curb_m', 'is_crossing',
        'vehicle_distance_m', 'vehicle_speed_kmh', 'time_to_crossing_sec',
        'road_width_m', 'conflict_detected'
    ]
    target = 'pedestrian_risk_label'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')

    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    model_path = os.path.join(MODELS_DIR, 'pedestrian_risk_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'pedestrian_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    metrics = {
        'model_name': 'pedestrian_risk_model',
        'version': 'ped-v1',
        'algorithm': 'RandomForestClassifier',
        'accuracy': round(float(acc), 4),
        'f1_score': round(float(f1), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Pedestrian Model trained | Test Accuracy: {acc*100:.2f}% | F1 Score: {f1*100:.2f}%")
    return metrics

# ==============================================================================
# 4. HOTSPOT PREDICTION MODEL
# ==============================================================================
def train_hotspot_model():
    print("\n🔥 Training Bengaluru Traffic Hotspot Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'hotspots', 'hotspots_synthetic.csv'))

    features = [
        'hour', 'vehicle_density', 'average_speed_kmh', 'queue_length_m',
        'road_condition_score', 'accident_count', 'pedestrian_density',
        'noise_db', 'signal_delay_sec'
    ]
    target = 'hotspot_risk_label'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')

    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    model_path = os.path.join(MODELS_DIR, 'hotspot_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'hotspot_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    metrics = {
        'model_name': 'hotspot_model',
        'version': 'hotspot-v1',
        'algorithm': 'RandomForestClassifier',
        'accuracy': round(float(acc), 4),
        'f1_score': round(float(f1), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Hotspot Model trained | Test Accuracy: {acc*100:.2f}% | F1 Score: {f1*100:.2f}%")
    return metrics

# ==============================================================================
# 5. TIME-BASED TRAFFIC PREDICTION MODEL
# ==============================================================================
def train_traffic_prediction_model():
    print("\n📈 Training Traffic Time-Series Prediction Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'traffic_prediction', 'prediction_time_series.csv'))

    features = [
        'time_decimal', 'current_vehicle_density', 'current_speed_kmh',
        'current_queue_m', 'road_condition', 'pedestrian_density'
    ]
    target_density = 'future_30min_density'
    target_queue = 'future_30min_queue_m'
    target_class = 'future_30min_congestion_level'

    X = df[features]
    y_reg = df[[target_density, target_queue]]
    y_cls = df[target_class]

    # Chronological time series split (80% train, 20% test) to prevent data leakage
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_reg_train, y_reg_test = y_reg.iloc[:split_idx], y_reg.iloc[split_idx:]
    y_cls_train, y_cls_test = y_cls.iloc[:split_idx], y_cls.iloc[split_idx:]

    # Regressor for future queue and density
    reg_model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=RANDOM_SEED)
    reg_model.fit(X_train, y_reg_train)
    reg_preds = reg_model.predict(X_test)
    mae_queue = mean_absolute_error(y_reg_test[target_queue], reg_preds[:, 1])
    r2_density = r2_score(y_reg_test[target_density], reg_preds[:, 0])

    # Classifier for congestion category
    cls_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=RANDOM_SEED)
    cls_model.fit(X_train, y_cls_train)
    cls_preds = cls_model.predict(X_test)
    acc = accuracy_score(y_cls_test, cls_preds)

    combined_model = {
        'regressor': reg_model,
        'classifier': cls_model,
        'features': features,
        'targets': [target_density, target_queue, target_class]
    }

    model_path = os.path.join(MODELS_DIR, 'traffic_prediction_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'traffic_prediction_model_v1.joblib')
    joblib.dump(combined_model, model_path)
    joblib.dump(combined_model, version_path)

    importances = dict(zip(features, [round(float(v), 4) for v in cls_model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metrics = {
        'model_name': 'traffic_prediction_model',
        'version': 'pred-v1',
        'algorithm': 'RandomForestRegressor + Classifier (Time-Split)',
        'accuracy': round(float(acc), 4),
        'mae_queue_meters': round(float(mae_queue), 2),
        'r2_density_score': round(float(r2_density), 4),
        'test_samples': len(X_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Traffic Prediction Model trained | Test Accuracy: {acc*100:.2f}% | Queue MAE: {mae_queue:.2f}m")
    return metrics

# ==============================================================================
# 6. EMERGENCY V2X PRIORITY MODEL
# ==============================================================================
def train_emergency_model():
    print("\n🚑 Training Emergency V2X Priority Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'emergency', 'emergency_v2x.csv'))

    features = [
        'distance_to_dest_km', 'traffic_density', 'signal_count',
        'current_speed_kmh', 'baseline_eta_minutes'
    ]
    target = 'recommended_priority'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')

    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    model_path = os.path.join(MODELS_DIR, 'emergency_priority_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'emergency_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    metrics = {
        'model_name': 'emergency_priority_model',
        'version': 'em-v1',
        'algorithm': 'RandomForestClassifier',
        'accuracy': round(float(acc), 4),
        'f1_score': round(float(f1), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Emergency V2X Model trained | Test Accuracy: {acc*100:.2f}% | F1 Score: {f1*100:.2f}%")
    return metrics

# ==============================================================================
# 7. MULTI-MODAL COMBINED MODEL
# ==============================================================================
def train_multimodal_model():
    print("\n🌐 Training Multi-Modal Composite Risk Model...")
    df = pd.read_csv(os.path.join(DATA_DIR, 'combined', 'multimodal_traffic_dataset.csv'))

    features = [
        'traffic_density', 'average_speed_kmh', 'accident_probability',
        'pedestrian_risk', 'road_condition_score', 'noise_db', 'emergency_vehicle_present'
    ]
    targets = ['incident_risk_score', 'traffic_impact_score']

    X = df[features]
    y = df[targets]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)

    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    model_path = os.path.join(MODELS_DIR, 'multimodal_model.joblib')
    version_path = os.path.join(MODELS_DIR, 'multimodal_model_v1.joblib')
    joblib.dump(model, model_path)
    joblib.dump(model, version_path)

    importances = dict(zip(features, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metrics = {
        'model_name': 'multimodal_model',
        'version': 'mm-v1',
        'algorithm': 'RandomForestRegressor',
        'mae': round(float(mae), 3),
        'r2_score': round(float(r2), 4),
        'test_samples': len(y_test),
        'features': features,
        'feature_importance': sorted_importances,
        'trained_at': datetime.now().isoformat()
    }
    print(f"✅ Multi-Modal Model trained | Test MAE: {mae:.2f} score points | R²: {r2:.4f}")
    return metrics

# ==============================================================================
# PIPELINE RUNNER & METADATA SAVE
# ==============================================================================
def train_all_models():
    print("="*60)
    print("🚀 SAMVED + URBANFLOW AI MODEL TRAINING PIPELINE")
    print("="*60)

    acc_m = train_accident_model()
    v2v_m = train_v2v_model()
    ped_m = train_pedestrian_model()
    hot_m = train_hotspot_model()
    pred_m = train_traffic_prediction_model()
    em_m = train_emergency_model()
    mm_m = train_multimodal_model()

    all_metrics = {
        'dataset_version': 'v1.0-synthetic',
        'random_seed': RANDOM_SEED,
        'disclaimer': 'Trained on synthetic simulation dataset for prototype validation and hackathon demonstration.',
        'generated_at': datetime.now().isoformat(),
        'models': {
            'accident_model': acc_m,
            'v2v_risk_model': v2v_m,
            'pedestrian_risk_model': ped_m,
            'hotspot_model': hot_m,
            'traffic_prediction_model': pred_m,
            'emergency_priority_model': em_m,
            'multimodal_model': mm_m
        }
    }

    metrics_path = os.path.join(MODELS_DIR, 'metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)

    feat_path = os.path.join(MODELS_DIR, 'feature_importance.json')
    feat_data = {k: v['feature_importance'] for k, v in all_metrics['models'].items()}
    with open(feat_path, 'w') as f:
        json.dump(feat_data, f, indent=2)

    meta_path = os.path.join(MODELS_DIR, 'training_metadata.json')
    meta_data = {
        'dataset_type': 'synthetic',
        'dataset_version': 'v1.0',
        'random_seed': RANDOM_SEED,
        'total_synthetic_records': 94000,
        'training_timestamp': datetime.now().isoformat(),
        'bengaluru_zones_count': 12,
        'models_trained': len(all_metrics['models'])
    }
    with open(meta_path, 'w') as f:
        json.dump(meta_data, f, indent=2)

    print("\n" + "="*60)
    print("🎉 ALL MODELS TRAINED, EVALUATED & PERSISTED SUCCESSFULLY!")
    print(f"📁 Model artifacts saved to: {MODELS_DIR}")
    print(f"📊 Metrics saved to: {metrics_path}")
    print("="*60)

if __name__ == "__main__":
    train_all_models()

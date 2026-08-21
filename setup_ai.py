"""
Master Setup Script for SAMVED + UrbanFlow AI Layer
Orchestrates:
1. Synthetic dataset generation across 8 domains (94,000+ records)
2. Quality and integrity validation
3. Real ML model training & evaluation
4. Artifact persistence and metadata serialization
"""

import sys
import subprocess
import os

def run_step(step_name, command):
    print("\n" + "#"*60)
    print(f"⏩ STEP: {step_name}")
    print("#"*60)
    res = subprocess.run(command, shell=True)
    if res.returncode != 0:
        print(f"❌ Error executing: {step_name}")
        sys.exit(1)

def main():
    print("="*60)
    print("🌟 SAMVED + URBANFLOW AI ONE-COMMAND SETUP")
    print("="*60)
    run_step("Generate Synthetic Data & Validate Quality", "python3 scripts/generate_synthetic_data.py")
    run_step("Train All ML Models & Compute Metrics", "python3 training/train_all.py")
    run_step("Evaluate Test Performance Report", "python3 training/evaluate_models.py")
    print("\n" + "="*60)
    print("🚀 AI SETUP COMPLETE! URBANFLOW MICROSERVICE READY TO LAUNCH.")
    print("="*60)

if __name__ == "__main__":
    main()

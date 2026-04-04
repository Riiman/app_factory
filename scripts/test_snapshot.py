

import sys
import os
import json
from flask import Flask

# Add project root to path
sys.path.append(os.getcwd())

from app.extensions import db
from app.models import Startup, StartupSnapshot
from app.services.insights_service import InsightsService
from app.config import Config

def test_snapshot_generation():
    # Minimal App Setup to avoid Import Hell
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize ONLY DB
    db.init_app(app)

    with app.app_context():
        # Ensure tables exist
        db.create_all()
        
        # 1. Find a test startup
        try:
            startup = Startup.query.first()
            if not startup:
                print("No startups found in database. Cannot test snapshot generation.")
                return

            print(f"Testing snapshot generation for Startup: {startup.name} (ID: {startup.id})")
            
            # 2. Run Generation
            snapshot = InsightsService.generate_snapshot(startup.id)
            
            if snapshot:
                print("\nSUCCESS: Snapshot Generated!")
                print(f"ID: {snapshot.id}")
                print(f"Date: {snapshot.date}")
                print(f"Founder Maturity Score: {snapshot.founder_maturity_score}")
                print(f"Product Readiness Score: {snapshot.product_readiness_score}")
                print(f"Runway Months: {snapshot.runway_months}")
                print("-" * 30)
                print("Financial Data:", json.dumps(snapshot.financial_data, indent=2))
                print("-" * 30)
                print("Product Data:", json.dumps(snapshot.product_data, indent=2))
                print("-" * 30)
                print("Growth Data:", json.dumps(snapshot.growth_data, indent=2))
                print("-" * 30)
            else:
                 print("FAILURE: Snapshot returned None.")

        except Exception as e:
            print(f"FAILURE: Exception during generation: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_snapshot_generation()


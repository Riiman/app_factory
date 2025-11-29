import os
import sys
import argparse
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Startup, StartupStage, Product, Feature, ProductMetric, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, Contract, ContractStatus

app = create_app()

def revert_startup_to_contract(startup_id):
    with app.app_context():
        startup = Startup.query.get(startup_id)
        
        if not startup:
            print(f"Startup with ID {startup_id} not found.")
            return

        print(f"--- Reverting Startup ID: {startup_id} ('{startup.name}') to CONTRACT stage ---")

        # Delete associated assets
        print("Deleting associated products, features, metrics...")
        Product.query.filter_by(startup_id=startup_id).delete()
        
        print("Deleting associated marketing campaigns and content calendars...")
        MarketingCampaign.query.filter_by(startup_id=startup_id).delete()

        # Update startup stage
        startup.current_stage = StartupStage.CONTRACT

        # Update contract status to SENT
        if startup.contract:
            startup.contract.status = ContractStatus.SENT
            startup.contract.signed_at = None
            print(f"Contract status for Startup ID {startup_id} set to {ContractStatus.SENT.name} and signed_at cleared.")

        db.session.commit()
        
        print(f"Successfully reverted Startup ID {startup_id} to {StartupStage.CONTRACT.name} stage.")
        print("Associated products, features, metrics, marketing campaigns, and content calendars have been deleted.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Revert a startup to the CONTRACT stage and delete generated assets.')
    parser.add_argument('startup_id', type=int, help='The ID of the startup to revert.')
    args = parser.parse_args()
    
    revert_startup_to_contract(args.startup_id)

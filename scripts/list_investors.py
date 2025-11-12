import os
import sys
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Investor
from app.config import Config

def list_all_investors():
    app = create_app(Config)
    with app.app_context():
        print("--- Listing All Investors ---")
        
        investors = Investor.query.all()
        
        if not investors:
            print("No investors found in the database.")
            return

        for investor in investors:
            print(f"\nInvestor ID: {investor.investor_id}")
            print(f"  Name: {investor.name}")
            print(f"  Firm: {investor.firm_name or 'N/A'}")
            print(f"  Type: {investor.type or 'N/A'}")
            print(f"  Email: {investor.email or 'N/A'}")
            print(f"  Website: {investor.website or 'N/A'}")
            print(f"  Notes: {investor.notes or 'N/A'}")
            print(f"  Created At: {investor.created_at.isoformat() if investor.created_at else 'N/A'}")

        print("\n--- Investor List Complete ---")

if __name__ == '__main__':
    list_all_investors()

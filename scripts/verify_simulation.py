import sys
import os
from decimal import Decimal

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import Product, BusinessMonthlyData, Investor, FundingRound, Task, Experiment
from app.modules.crm.models import CrmCompany, CrmDeal

def verify():
    app = create_app()
    with app.app_context():
        stats = {
            "Products": Product.query.count(),
            "Monthly Data Records": BusinessMonthlyData.query.count(),
            "Investors": Investor.query.count(),
            "Funding Rounds": FundingRound.query.count(),
            "CRM Companies": CrmCompany.query.count(),
            "CRM Deals": CrmDeal.query.count(),
            "Tasks": Task.query.count(),
            "Experiments": Experiment.query.count()
        }
        
        print("\n--- Current Database Stats ---")
        for key, value in stats.items():
            print(f"{key}: {value}")
        print("------------------------------\n")

if __name__ == "__main__":
    # Set the env var to skip socketio
    os.environ['FLASK_DB_CREATION'] = '1'
    verify()

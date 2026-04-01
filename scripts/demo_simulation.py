import sys
import os
from datetime import datetime

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.services.company_simulator import EvolutionarySimulator
from app.models import Startup, User

def run_simulation(user_email=None, industry="Manufacturing", age_years=1):
    app = create_app()
    with app.app_context():
        if user_email:
            user = User.query.filter_by(email=user_email).first()
            if not user:
                print(f"Error: No user found with email: {user_email}")
                return
            
            # Get the first startup associated with this user
            startup = user.startups[0] if user.startups else None
            if not startup:
                print(f"Error: No startup associated with user: {user_email}")
                return
                
            startup_id = startup.id
            user_id = user.id
        else:
            # Fallback to first startup/user if no email provided
            startup = Startup.query.first()
            user = User.query.first()
            if not startup or not user:
                print("Error: No startup or user found in database.")
                return
            startup_id = startup.id
            user_id = user.id
            
        print(f"--- Evolutionary Simulation ---")
        print(f"Startup: {startup.name} (ID: {startup_id})")
        print(f"User: {user.full_name} ({user.email})")
        print(f"Industry: {industry}, Start Age: {age_years}yr")
        print(f"-------------------------------")
        
        simulator = EvolutionarySimulator(startup_id, user_id, industry, age_years)
        # Simulate last year's journey (April 2024 to March 2025)
        simulator.generate_all(start_month=4, start_year=2024)
        
        print("\nEvolutionary Simulation successful!")
        print(f"12 months of data generated to tell the story of {startup.name}.")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else None
    industry = sys.argv[2] if len(sys.argv) > 2 else "Manufacturing"
    age = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    
    # Set the env var to skip socketio
    os.environ['FLASK_DB_CREATION'] = '1'
    run_simulation(email, industry, age)

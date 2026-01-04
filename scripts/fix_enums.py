
import sys
import os

# Add the parent directory to sys.path to ensure we can import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from sqlalchemy import text

def fix_enums():
    app = create_app()
    with app.app_context():
        print("--- Starting Database Enum Repair ---")
        
        # FIX 1: Features (The reported crash)
        # We use raw SQL to avoid SQLAlchemy trying to hydrate the invalid Enums (which causes the crash)
        print("Fixing Features table...")
        try:
            # Check and update 'completed' -> 'COMPLETED'
            result = db.session.execute(text("UPDATE features SET status = 'COMPLETED' WHERE status = 'completed'"))
            print(f"  - Updated 'completed' -> 'COMPLETED': {result.rowcount} rows")
            
            # Check and update 'in_progress' -> 'IN_PROGRESS'
            result = db.session.execute(text("UPDATE features SET status = 'IN_PROGRESS' WHERE status = 'in_progress'"))
            print(f"  - Updated 'in_progress' -> 'IN_PROGRESS': {result.rowcount} rows")

            # Check and update 'pending' -> 'PENDING'
            result = db.session.execute(text("UPDATE features SET status = 'PENDING' WHERE status = 'pending'"))
            print(f"  - Updated 'pending' -> 'PENDING': {result.rowcount} rows")

        except Exception as e:
            print(f"Error fixing Features: {e}")

        # FIX 2: Startups (Proactive check for lowercase statuses)
        print("\nChecking Startups table (Proactive)...")
        try:
            # StartupStatus: INACTIVE, ACTIVE, INCUBATING, GRADUATED, ARCHIVED
            result = db.session.execute(text("UPDATE startups SET status = 'ACTIVE' WHERE status = 'active'"))
            if result.rowcount > 0: print(f"  - Updated 'active' -> 'ACTIVE': {result.rowcount} rows")
        except Exception as e:
            print(f"Error fixing Startups: {e}")
            
        db.session.commit()
        print("\n--- Repair Complete. Database should be stable. ---")

if __name__ == "__main__":
    fix_enums()

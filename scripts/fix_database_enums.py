import os
import sys
from sqlalchemy import text

# Add the project root to the Python path to allow importing 'app'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from app import create_app, db

# Create a minimal Flask app instance to establish an application context
app = create_app()

def fix_database_statuses_raw_sql():
    """
    Uses raw SQL to update lowercase enum values in marketing tables,
    bypassing SQLAlchemy's enum validation which fails on existing bad data.
    """
    with app.app_context():
        try:
            # --- Fix Marketing Campaigns ---
            print("--- Fixing 'marketing_campaigns' table using raw SQL ---")
            campaign_status_map = {'planned': 'PLANNED', 'active': 'ACTIVE', 'completed': 'COMPLETED'}
            for old_status, new_status in campaign_status_map.items():
                sql = text("UPDATE marketing_campaigns SET status = :new WHERE status = :old")
                result = db.session.execute(sql, {'new': new_status, 'old': old_status})
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} rows from '{old_status}' to '{new_status}'")

            # --- Fix Marketing Content Items ---
            print("\n--- Fixing 'marketing_content_items' table using raw SQL ---")
            content_status_map = {'planned': 'PLANNED', 'published': 'PUBLISHED', 'cancelled': 'CANCELLED'}
            for old_status, new_status in content_status_map.items():
                sql = text("UPDATE marketing_content_items SET status = :new WHERE status = :old")
                result = db.session.execute(sql, {'new': new_status, 'old': old_status})
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} rows from '{old_status}' to '{new_status}'")

            db.session.commit()
            print("\nDatabase changes committed successfully!")

        except Exception as e:
            db.session.rollback()
            print(f"\nAn error occurred: {e}. Changes have been rolled back.")

if __name__ == '__main__':
    print("IMPORTANT: Make sure your Flask server and Celery workers are stopped to avoid database lock errors.")
    fix_database_statuses_raw_sql()
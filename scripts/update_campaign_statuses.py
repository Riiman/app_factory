import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import MarketingCampaign, MarketingCampaignStatus
from app.config import Config

def upgrade_campaign_statuses():
    """
    Connects to the database and updates the status of all marketing campaigns to uppercase using raw SQL.
    """
    app = create_app(Config)
    with app.app_context():
        print("--- Starting upgrade for MarketingCampaign statuses using raw SQL ---")
        
        try:
            # Use the engine's connection for raw SQL
            with db.engine.connect() as connection:
                trans = connection.begin()
                try:
                    # Find rows that need updating
                    result = connection.execute(db.text("SELECT campaign_id, status FROM marketing_campaigns WHERE status IS NOT NULL AND status != UPPER(status)"))
                    rows_to_update = result.fetchall()
                    
                    if not rows_to_update:
                        print("No campaign statuses require an update.")
                        trans.commit()
                        return

                    print(f"Found {len(rows_to_update)} campaigns to update.")
                    
                    # Update the rows
                    update_query = db.text("UPDATE marketing_campaigns SET status = UPPER(status) WHERE status IS NOT NULL AND status != UPPER(status)")
                    update_result = connection.execute(update_query)
                    
                    trans.commit()
                    
                    print(f"\nSuccessfully updated {update_result.rowcount} campaign statuses.")
                    for campaign_id, old_status in rows_to_update:
                        print(f"  - Campaign ID {campaign_id}: '{old_status}' -> '{old_status.upper()}'")

                except Exception as e:
                    trans.rollback()
                    raise e

        except Exception as e:
            print(f"\nAn error occurred: {e}")
        finally:
            print("--- Script Complete ---")

if __name__ == '__main__':
    upgrade_campaign_statuses()

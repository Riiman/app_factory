import os
from flask import Flask
from sqlalchemy import text
from app import create_app, db
from app.models import MarketingCampaignStatus, MarketingContentStatus

def fix_enums():
    app = create_app()
    with app.app_context():
        print("Starting Enum fix...")
        
        # 1. Update Marketing Campaigns
        print("Updating marketing_campaigns table...")
        try:
            # Check for bad values first just to see
            result = db.session.execute(text("SELECT campaign_id, status FROM marketing_campaigns WHERE status = 'planned' OR status = 'active' OR status = 'completed' OR status = 'paused'"))
            bad_campaigns = result.fetchall()
            print(f"Found {len(bad_campaigns)} campaigns with lowercase status.")

            # Run Update
            db.session.execute(text("UPDATE marketing_campaigns SET status = UPPER(status)"))
            db.session.commit()
            print("Successfully updated marketing_campaigns table via raw SQL.")
            
        except Exception as e:
            print(f"Error updating marketing_campaigns: {e}")
            db.session.rollback()

        # 2. Update Marketing Content Items
        print("\nUpdating marketing_content_items table...")
        try:
            # Check for bad values
            result = db.session.execute(text("SELECT content_id, status FROM marketing_content_items WHERE status = 'planned' OR status = 'published' OR status = 'cancelled'"))
            bad_items = result.fetchall()
            print(f"Found {len(bad_items)} content items with lowercase status.")

            # Run Update
            db.session.execute(text("UPDATE marketing_content_items SET status = UPPER(status)"))
            db.session.commit()
            print("Successfully updated marketing_content_items table via raw SQL.")
        
        except Exception as e:
            print(f"Error updating marketing_content_items: {e}")
            db.session.rollback()

        print("\nEnum fix complete.")

if __name__ == "__main__":
    fix_enums()

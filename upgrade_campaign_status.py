import os
from app import create_app, db
from app.models import MarketingCampaign, MarketingCampaignStatus

# Create a Flask app context
app = create_app()
app.app_context().push()

print("Starting database upgrade for MarketingCampaign status...")

try:
    campaigns = MarketingCampaign.query.all()
    updated_count = 0
    for campaign in campaigns:
        current_status = str(campaign.status) # Ensure it's a string
        if current_status.upper() != current_status:
            # Convert to uppercase and then to the Enum member
            new_status_value = current_status.upper()
            if new_status_value in MarketingCampaignStatus.__members__:
                campaign.status = MarketingCampaignStatus[new_status_value]
                updated_count += 1
                print(f"Updated campaign {campaign.campaign_id}: status from '{current_status}' to '{campaign.status.value}'")
            else:
                print(f"Warning: Skipping campaign {campaign.campaign_id}. Invalid status '{current_status}' cannot be converted to a valid enum member.")
    
    db.session.commit()
    print(f"Database upgrade complete. {updated_count} marketing campaigns updated.")

except Exception as e:
    db.session.rollback()
    print(f"An error occurred during the database upgrade: {e}")
finally:
    db.session.remove()

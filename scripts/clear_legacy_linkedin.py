
from app import create_app, db
from app.models import MarketingSettings

def clear_legacy():
    app = create_app()
    with app.app_context():
        # Find LinkedIn settings with legacy credentials (client_id present) or missing getlate_profile_id
        settings = MarketingSettings.query.filter_by(provider='linkedin').all()
        count = 0
        for s in settings:
            creds = s.credentials or {}
            # If it has client_id (old) OR doesn't have getlate_profile_id (new)
            if 'client_id' in creds or 'getlate_profile_id' not in creds:
                print(f"Clearing legacy settings for Startup {s.startup_id}")
                s.credentials = {} 
                s.is_active = False
                count += 1
        
        db.session.commit()
        print(f"Cleared {count} legacy LinkedIn records.")

if __name__ == "__main__":
    clear_legacy()

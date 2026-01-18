from app import create_app
from app.models import Startup

app = create_app()

startup_id = 5

with app.app_context():
    try:
        startup = Startup.query.get(startup_id)
        if not startup:
            print(f"Startup {startup_id} not found")
            exit(1)
            
        print(f"Startup found: {startup.name}")
        print("Serializing campaigns...")
        
        campaigns = [c.to_dict() for c in startup.marketing_campaigns]
        
        print(f"Successfully serialized {len(campaigns)} campaigns.")
        for c in campaigns:
            print(f" - {c['campaign_name']} (Status: {c['status']})")
            
    except Exception as e:
        print(f"Serialization FAILED: {e}")
        import traceback
        traceback.print_exc()

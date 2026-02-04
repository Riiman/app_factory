import os
# Inject dummy key to bypass config validation in production
os.environ["OPENAI_API_KEY"] = "dummy-key-for-migration"

from app import create_app, db
from app.models import Startup, Organization
from config import get_config

# Get the config class and patch it with missing Celery vars
ConfigClass = get_config('production')
ConfigClass.CELERY_BROKER_URL = 'redis://localhost:6379/0'
ConfigClass.CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

app = create_app(ConfigClass)

with app.app_context():
    print("--- [Data Migration] Fixing Missing Organization IDs ---")
    
    # 1. Get the organization (User said there is only one)
    org = Organization.query.first()
    if not org:
        print("Error: No organization found in the database.")
        exit(1)
        
    print(f"Found Organization: {org.name} (ID: {org.id})")
    
    # 2. Find Startups with NULL organization_id
    startups = Startup.query.filter(Startup.organization_id == None).all()
    print(f"Found {len(startups)} startups with missing organization_id.")
    
    if not startups:
        print("No changes needed.")
        exit(0)
        
    # 3. Update them
    count = 0
    for s in startups:
        s.organization_id = org.id
        print(f" - Assigning Startup '{s.name}' (ID: {s.id}) to Organization {org.id}")
        count += 1
        
    try:
        db.session.commit()
        print(f"Successfully updated {count} startups.")
    except Exception as e:
        db.session.rollback()
        print(f"Error committing changes: {e}")

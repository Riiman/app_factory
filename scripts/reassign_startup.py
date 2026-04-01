import sys
import os
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import db, Startup, User, Organization, Submission, TeamMember

def reassign_startup(startup_id, new_org_id, dry_run=True):
    app = create_app()
    with app.app_context():
        # 1. Verify Startup
        startup = Startup.query.get(startup_id)
        if not startup:
            print(f"Error: Startup with ID {startup_id} not found.")
            return

        # 2. Verify Organization
        new_org = Organization.query.get(new_org_id)
        if not new_org:
            print(f"Error: Organization with ID {new_org_id} not found.")
            return

        old_org_id = startup.organization_id
        print(f"--- Reassigning Startup: {startup.name} (ID: {startup.id}) ---")
        print(f"From Org ID: {old_org_id} to Org ID: {new_org_id} ({new_org.name})")

        # 3. Plan Updates
        updates = []
        
        # A. Startup
        if startup.organization_id != new_org_id:
            updates.append((startup, 'organization_id', new_org_id))
        
        # B. User (Owner)
        owner = User.query.get(startup.user_id)
        if owner and owner.organization_id != new_org_id:
            updates.append((owner, 'organization_id', new_org_id))
        
        # C. Submission (Most critical audit link)
        if startup.submission_id:
            sub = Submission.query.get(startup.submission_id)
            if sub and sub.organization_id != new_org_id:
                updates.append((sub, 'organization_id', new_org_id))
        
        # D. Team Members (Users associated with this startup)
        for tm in startup.team_members:
            tm_user = User.query.get(tm.user_id)
            if tm_user and tm_user.organization_id != new_org_id:
                updates.append((tm_user, 'organization_id', new_org_id))
        
        # 4. Check for CRM Companies (just in case they have org_id in some versions)
        # We checked the model and it doesn't, but we could add more checks here if needed.
        
        # 5. Execute
        if not updates:
            print("\nNo updates needed. Startup is already in the target organization.")
            return

        if dry_run:
            print("\n[DRY RUN] Would update the following:")
            for obj, attr, val in updates:
                obj_name = f"{obj.__class__.__name__}(ID: {getattr(obj, 'id', 'N/A') or getattr(obj, 'investor_id', 'N/A')})"
                if hasattr(obj, 'email'): obj_name += f" [{obj.email}]"
                if hasattr(obj, 'name'): obj_name += f" [{obj.name}]"
                print(f"  - {obj_name}: {attr} -> {val}")
            print("\nRun with --commit to apply changes.")
        else:
            print("\n[EXEC] Updating records...")
            for obj, attr, val in updates:
                setattr(obj, attr, val)
            
            db.session.commit()
            print("Success: Startup and associated users reassigned successfully.")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python scripts/reassign_startup.py <startup_id> <new_org_id> [--commit]")
        sys.exit(1)
    
    try:
        sid = int(sys.argv[1])
        oid = int(sys.argv[2])
    except ValueError:
        print("Error: IDs must be integers.")
        sys.exit(1)
        
    commit = "--commit" in sys.argv
    
    reassign_startup(sid, oid, dry_run=not commit)

from app import create_app, db
from app.models import User, Organization

app = create_app()
with app.app_context():
    print("--- User Status Checker ---")
    email = input("Enter the email address to check: ")
    user = User.query.filter_by(email=email).first()
    
    if user:
        print(f"\n[FOUND] User Details:")
        print(f"  ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Firebase UID: {user.firebase_uid}")
        print(f"  Organization ID: {user.organization_id}")
        
        if user.organization_id:
            org = Organization.query.get(user.organization_id)
            if org:
                print(f"  Organization Name: {org.name} (ID: {org.id})")
            else:
                print(f"  Organization Status: DAMAGED (Org ID {user.organization_id} not found in organizations table)")
        else:
            print("  Organization Status: NOT ASSIGNED (This is why login loops)")
    else:
        print(f"\n[ERROR] No user found with email: {email}")

import sys
import secrets
from run import app
from app.extensions import db
from app.models import User, UserRole
from firebase_admin import auth

def promote_user(admin_email, new_admin_email):
    with app.app_context():
        # Get the current admin
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            print(f"Error: Could not find user with email '{admin_email}'.")
            return
            
        if admin.role != UserRole.ADMIN:
            print(f"Error: User '{admin_email}' is not an ADMIN. Their current role is {admin.role}.")
            return
            
        if not admin.organization_id:
            print(f"Error: User '{admin_email}' is not mapped to any organization.")
            return

        # Get the new user
        new_admin = User.query.filter_by(email=new_admin_email).first()
        temp_password = None
        
        if not new_admin:
            print(f"User '{new_admin_email}' does not exist locally. Creating them now...")
            
            # Check if they exist in Firebase first
            firebase_uid = None
            try:
                firebase_user = auth.get_user_by_email(new_admin_email)
                firebase_uid = firebase_user.uid
                print(f"Found existing Firebase account. Re-using UID: {firebase_uid}")
            except auth.UserNotFoundError:
                temp_password = secrets.token_urlsafe(10)
                try:
                    firebase_user = auth.create_user(
                        email=new_admin_email,
                        password=temp_password,
                        email_verified=True,
                        display_name=new_admin_email.split('@')[0]
                    )
                    firebase_uid = firebase_user.uid
                    print("Created new Firebase account.")
                except Exception as e:
                    print(f"Error creating Firebase user: {e}")
                    return
            
            # Create the user in the local database
            new_admin = User(
                firebase_uid=firebase_uid,
                email=new_admin_email,
                full_name=new_admin_email.split('@')[0], # Fallback full name
                role=UserRole.ADMIN,
                organization_id=admin.organization_id,
                email_verified=True
            )
            db.session.add(new_admin)
        else:
            # Update the target user's role and organization
            new_admin.organization_id = admin.organization_id
            new_admin.role = UserRole.ADMIN
        
        try:
            db.session.commit()
            print(f"Success! '{new_admin_email}' is now an ADMIN for organization ID {admin.organization_id} (same as '{admin_email}').")
            if temp_password:
                print(f"\nIMPORTANT: The user was newly created. Their temporary password is: {temp_password}")
                print("Please share it with them securely so they can log in.")
        except Exception as e:
            db.session.rollback()
            print(f"Error saving to database: {e}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python promote_to_admin.py <current_admin_email> <new_admin_email>")
        sys.exit(1)
        
    current_admin = sys.argv[1]
    target_new_admin = sys.argv[2]
    
    promote_user(current_admin, target_new_admin)

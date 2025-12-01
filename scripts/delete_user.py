import sys
import os

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import User
from app.config import Config

def delete_user(identifier):
    app = create_app(Config)
    with app.app_context():
        # Try to find by ID first, then email
        user = None
        if identifier.isdigit():
            user = User.query.get(int(identifier))
        
        if not user:
            user = User.query.filter_by(email=identifier).first()
        
        if not user:
            print(f"User with identifier '{identifier}' not found.")
            return

        print(f"Found user: {user.full_name} ({user.email}) [ID: {user.id}]")
        print("Warning: This will delete the user and ALL related startups, submissions, and other data.")
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        
        if confirm.lower() == 'yes':
            try:
                # Delete related notifications and activity logs first
                from app.models import DashboardNotification, ActivityLog
                
                DashboardNotification.query.filter_by(user_id=user.id).delete()
                ActivityLog.query.filter_by(user_id=user.id).delete()
                
                db.session.delete(user)
                db.session.commit()
                print("User and related data deleted successfully.")
            except Exception as e:
                db.session.rollback()
                print(f"Error deleting user: {e}")
        else:
            print("Deletion cancelled.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/delete_user.py <user_id_or_email>")
    else:
        delete_user(sys.argv[1])

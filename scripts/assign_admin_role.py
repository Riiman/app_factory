import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User

def assign_admin_role(email):
    """Assigns the admin role to a user."""
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.role = 'ADMIN'
            db.session.commit()
            print(f"User {email} has been assigned the admin role.")
        else:
            print(f"User with email {email} not found.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/assign_admin_role.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    assign_admin_role(email)

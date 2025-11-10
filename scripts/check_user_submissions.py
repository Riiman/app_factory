import os
import sys
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Submission, UserRole
from app.config import Config

def check_user_submissions():
    app = create_app(Config)
    with app.app_context():
        print("--- Checking Submissions for Users with 'USER' Role ---")
        
        users = User.query.filter_by(role=UserRole.USER).all()
        
        if not users:
            print("No users found with the role 'USER'.")
            return

        for user in users:
            print(f"\nUser: {user.full_name} (Email: {user.email}, ID: {user.id})")
            submissions = Submission.query.filter_by(user_id=user.id).all()
            
            if not submissions:
                print("  No submissions found for this user.")
            else:
                for submission in submissions:
                    print(f"  - Submission ID: {submission.id}, Startup Name: {submission.startup_name}, Status: {submission.status.value}, Submitted At: {submission.submitted_at}")

        print("\n--- Check Complete ---")

if __name__ == '__main__':
    check_user_submissions()

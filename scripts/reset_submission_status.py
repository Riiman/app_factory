import os
import sys
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission, SubmissionStatus
from app.config import Config

def reset_all_submissions_to_pending():
    app = create_app(Config)
    with app.app_context():
        print("--- Resetting ALL Submission statuses to PENDING ---")
        
        confirm = input("Are you sure you want to reset ALL submission statuses to PENDING? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Operation cancelled.")
            return

        submissions = Submission.query.all()
        
        if not submissions:
            print("No submissions found to reset.")
            return

        for submission in submissions:
            current_status = submission.status.name
            if current_status == SubmissionStatus.PENDING.name:
                print(f"Submission ID {submission.id} is already PENDING. No change needed.")
            else:
                submission.status = SubmissionStatus.PENDING
                db.session.commit()
                print(f"Successfully changed status of Submission ID {submission.id} from {current_status} to {SubmissionStatus.PENDING.name}.")

        print("\n--- All Submissions Reset to PENDING ---")

if __name__ == '__main__':
    reset_all_submissions_to_pending()

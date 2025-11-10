import os
import sys
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission, SubmissionStatus
from app.config import Config

def reset_submission_status(submission_id: int):
    app = create_app(Config)
    with app.app_context():
        print(f"--- Attempting to reset status for Submission ID: {submission_id} ---")
        
        submission = Submission.query.get(submission_id)
        
        if not submission:
            print(f"Error: Submission with ID {submission_id} not found.")
            return

        current_status = submission.status.name
        if current_status == SubmissionStatus.PENDING.name:
            print(f"Submission ID {submission_id} is already PENDING. No change needed.")
        else:
            submission.status = SubmissionStatus.PENDING
            db.session.commit()
            print(f"Successfully changed status of Submission ID {submission_id} from {current_status} to {SubmissionStatus.PENDING.name}.")

        print("\n--- Script Complete ---")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python scripts/reset_submission_status.py <submission_id>")
        sys.exit(1)
    
    try:
        sub_id = int(sys.argv[1])
        reset_submission_status(sub_id)
    except ValueError:
        print("Error: Submission ID must be an integer.")
        sys.exit(1)

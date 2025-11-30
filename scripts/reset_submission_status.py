import os
import sys
import argparse
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission, SubmissionStatus
from app.config import Config

def reset_submission_to_pending(submission_id):
    app = create_app(Config)
    with app.app_context():
        submission = Submission.query.get(submission_id)
        
        if not submission:
            print(f"Submission with ID {submission_id} not found.")
            return

        current_status = submission.status.name
        if current_status == SubmissionStatus.PENDING.name:
            print(f"Submission ID {submission.id} is already PENDING. No change needed.")
        else:
            submission.status = SubmissionStatus.PENDING
            db.session.commit()
            print(f"Successfully changed status of Submission ID {submission.id} from {current_status} to {SubmissionStatus.PENDING.name}.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Reset a submission status to PENDING.')
    parser.add_argument('submission_id', type=int, help='The ID of the submission to reset.')
    args = parser.parse_args()
    
    reset_submission_to_pending(args.submission_id)

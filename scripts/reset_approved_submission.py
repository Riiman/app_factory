import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission, Startup, SubmissionStatus

def reset_submission_status(submission_id):
    """
    Resets an 'APPROVED' submission back to 'IN_REVIEW' and deletes the
    associated startup and all its related data.
    """
    app = create_app()
    with app.app_context():
        print(f"--- Searching for submission with ID: {submission_id} ---")
        submission = Submission.query.get(submission_id)

        if not submission:
            print(f"Error: Submission with ID {submission_id} not found.")
            return

        print(f"Found submission. Current status: {submission.status.name}")

        if submission.status != SubmissionStatus.APPROVED:
            print("Submission is not in 'APPROVED' state. No action taken.")
            return

        # Find the associated startup
        startup = Startup.query.filter_by(submission_id=submission.id).first()

        if startup:
            print(f"--- Found associated startup (ID: {startup.id}, Name: {startup.name}). Deleting it... ---")
            # Deleting the startup will also delete related scope documents, contracts, etc.
            # due to the `cascade="all, delete-orphan"` setting in the model relationships.
            db.session.delete(startup)
            print("Startup and related data have been marked for deletion.")
        else:
            print("--- No associated startup found for this submission. ---")

        # Change the submission status back to IN_REVIEW
        print(f"--- Changing submission status from 'APPROVED' to 'IN_REVIEW'... ---")
        submission.status = SubmissionStatus.IN_REVIEW
        
        try:
            db.session.commit()
            print("\nSuccessfully reset submission status and deleted associated startup.")
            print("The submission is now back in the 'IN_REVIEW' queue.")
        except Exception as e:
            db.session.rollback()
            print(f"\nAn error occurred. Rolling back changes. Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/reset_approved_submission.py <submission_id>")
        sys.exit(1)
    
    try:
        sub_id = int(sys.argv[1])
    except ValueError:
        print("Error: Please provide a valid integer for the submission ID.")
        sys.exit(1)
        
    reset_submission_status(sub_id)

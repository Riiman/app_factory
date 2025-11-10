import sys
import os
from app import create_app, db
from app.models import Submission, SubmissionStatus, Startup, StartupStatus
from slugify import slugify

# Ensure the app context is available
app = create_app()
app.app_context().push()

def update_submission_status(submission_id: int, new_status_str: str):
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            print(f"Error: Submission with ID {submission_id} not found.")
            return

        try:
            new_status = SubmissionStatus[new_status_str.upper()]
        except KeyError:
            print(f"Error: Invalid status '{new_status_str}'. Valid statuses are: {', '.join([s.value for s in SubmissionStatus])}")
            return

        old_status = submission.status
        submission.status = new_status
        db.session.add(submission)

        # If approved, create a Startup entry
        if new_status == SubmissionStatus.APPROVED:
            # Check if a Startup already exists for this submission
            existing_startup = Startup.query.filter_by(submission_id=submission.id).first()
            if not existing_startup:
                # Create a slug from the startup name
                startup_slug = slugify(submission.startup_name or f"startup-{submission.id}")
                
                startup = Startup(
                    user_id=submission.user_id,
                    submission_id=submission.id,
                    name=submission.startup_name or "Unnamed Startup",
                    slug=startup_slug,
                    status=StartupStatus.ACTIVE, # Default to active
                    overall_progress=0.0, # Initial progress
                    current_stage="Idea Approved",
                    next_milestone="Define MVP",
                    recent_activity=["Submission approved", "Startup created"]
                )
                db.session.add(startup)
                print(f"Created new Startup entry for submission {submission_id} (Startup ID: {startup.id}).")
            else:
                print(f"Startup entry already exists for submission {submission_id}. Skipping creation.")
        
        # If status changes from APPROVED to something else, consider archiving/deleting the Startup
        if old_status == SubmissionStatus.APPROVED and new_status != SubmissionStatus.APPROVED:
            startup_to_archive = Startup.query.filter_by(submission_id=submission.id).first()
            if startup_to_archive:
                startup_to_archive.status = StartupStatus.ARCHIVED # Or delete, depending on policy
                db.session.add(startup_to_archive)
                print(f"Archived Startup {startup_to_archive.id} due to submission status change.")

        db.session.commit()
        print(f"Submission {submission_id} status updated from '{old_status.value}' to '{new_status.value}'.")

    except Exception as e:
        db.session.rollback()
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/update_submission_status.py <submission_id> <new_status>")
        print(f"Valid statuses: {', '.join([s.value for s in SubmissionStatus])}")
        sys.exit(1)

    submission_id = int(sys.argv[1])
    new_status = sys.argv[2]
    update_submission_status(submission_id, new_status)

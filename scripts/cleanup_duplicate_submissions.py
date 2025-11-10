import os
import sys
from flask import Flask
from sqlalchemy import func

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission
from app.config import Config

def cleanup_duplicate_submissions():
    app = create_app(Config)
    with app.app_context():
        print("--- Cleaning up duplicate submissions ---")

        # Find users with more than one submission
        users_with_duplicates = db.session.query(Submission.user_id).group_by(Submission.user_id).having(func.count(Submission.id) > 1).all()

        if not users_with_duplicates:
            print("No users with duplicate submissions found.")
            return

        for user_id_tuple in users_with_duplicates:
            user_id = user_id_tuple[0]
            print(f"\nProcessing user with ID: {user_id}")

            # Get all submissions for the user, ordered by submission date
            submissions = Submission.query.filter_by(user_id=user_id).order_by(Submission.submitted_at.desc()).all()

            # The first submission in the list is the most recent one
            submission_to_keep = submissions[0]
            print(f"  Keeping most recent submission (ID: {submission_to_keep.id}, Submitted At: {submission_to_keep.submitted_at})")

            # The rest are duplicates to be deleted
            submissions_to_delete = submissions[1:]

            if not submissions_to_delete:
                print("  No older submissions to delete.")
                continue

            for sub in submissions_to_delete:
                print(f"  Deleting submission with ID: {sub.id} (Submitted At: {sub.submitted_at})")
                db.session.delete(sub)

        db.session.commit()
        print("\n--- Cleanup complete ---")

if __name__ == '__main__':
    cleanup_duplicate_submissions()

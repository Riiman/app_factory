import os
from flask import Flask
from sqlalchemy import text
from app import create_app, db

def fix_artifact_enums():
    app = create_app()
    with app.app_context():
        print("Starting Artifact Enum fix...")
        
        print("Updating artifacts table...")
        try:
            # Check for potential bad values
            result = db.session.execute(text("SELECT id, scope, type FROM artifacts WHERE scope = 'product' OR type = 'link' OR type = 'file' OR type = 'text'"))
            bad_artifacts = result.fetchall()
            print(f"Found {len(bad_artifacts)} artifacts with lowercase scope/type.")

            # Run Update for Scope
            # We assume all scopes correlate to uppercase keys
            # PRODUCT, BUSINESS, FUNDRAISE, MARKETING, GENERAL matches standard upper()
            # DASHBOARD, WORKSPACE, TEAM, SETTINGS also match standard upper()
            db.session.execute(text("UPDATE artifacts SET scope = UPPER(scope)"))
            
            # Run Update for Type
            # FILE, LINK, TEXT
            db.session.execute(text("UPDATE artifacts SET type = UPPER(type)"))
            
            db.session.commit()
            print("Successfully updated artifacts table via raw SQL.")
            
        except Exception as e:
            print(f"Error updating artifacts: {e}")
            db.session.rollback()

        print("\nArtifact Enum fix complete.")

if __name__ == "__main__":
    fix_artifact_enums()

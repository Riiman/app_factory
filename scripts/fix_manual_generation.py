import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Startup, ScopeDocument, Submission
from app.services.document_generator_service import generate_scope_document
from app.services.analyzer_service import run_analysis
from app.services.generation_service import generate_startup_assets

def fix_startup_generation(startup_id):
    app = create_app()
    with app.app_context():
        print(f"Checking startup ID: {startup_id}")
        startup = Startup.query.get(startup_id)
        if not startup:
            print(f"Error: Startup {startup_id} not found.")
            return

        print(f"Startup found: {startup.name}")
        
        # Check Scope Document
        if startup.scope_document:
            print("Scope Document: EXISTS")
        else:
            print("Scope Document: MISSING")
            
            # Check Evaluation
            submission = startup.submission
            if not submission:
                 print("Error: Startup has no submission linked.")
                 return
                 
            if submission.evaluation:
                print("Evaluation: EXISTS")
                print("Triggering Scope Document Generation...")
                try:
                    generate_scope_document(startup)
                    print("Scope Document Generation Triggered/Completed.")
                except Exception as e:
                    print(f"Error generating scope document: {e}")
            else:
                print("Evaluation: MISSING")
                print("Triggering Submission Analysis (which creates Evaluation)...")
                try:
                    run_analysis(submission.id)
                    print("Submission Analysis Triggered/Completed.")
                    # After analysis, we might need to verify if validation passed but let's assume it proceeds.
                    # Re-fetch to see if evaluation exists now
                    db.session.refresh(submission)
                    if submission.evaluation:
                        print("Evaluation created. Now triggering Scope Document Generation...")
                        generate_scope_document(startup)
                    else:
                        print("Evaluation still missing after analysis. Check analysis logs.")
                        return
                except Exception as e:
                    print(f"Error running analysis: {e}")
                    return

        # Refetch startup to check scope again
        db.session.refresh(startup)
        if startup.scope_document:
            print("Scope Document is ready. Triggering Asset Generation (Products, GTM)...")
            try:
                generate_startup_assets(startup.id, generate_product=True, generate_gtm=True)
                print("Asset Generation Triggered.")
            except Exception as e:
                 print(f"Error generating assets: {e}")
        else:
             print("Scope Document still missing. Cannot generate assets.")

if __name__ == "__main__":
    if len(sys.path) > 1 and sys.argv[1].isdigit():
        fix_startup_generation(int(sys.argv[1]))
    else:
        print("Usage: python fix_manual_generation.py <startup_id>")
        # Default to 3 for debugging
        fix_startup_generation(3)

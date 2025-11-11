import os
import sys
import json
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import ScopeDocument, Startup

def check_scope_documents():
    """
    Connects to the database and prints the details of all generated scope documents.
    """
    app = create_app()
    with app.app_context():
        print("--- Querying for all scope documents in the database... ---")
        
        scope_documents = ScopeDocument.query.order_by(ScopeDocument.startup_id).all()
        
        if not scope_documents:
            print("\nNo scope documents found in the database.")
            return
            
        print(f"\nFound {len(scope_documents)} scope document(s).")
        print("-" * 60)
        
        for doc in scope_documents:
            startup = Startup.query.get(doc.startup_id)
            startup_name = startup.name if startup else "Unknown Startup"
            
            print(f"Document ID:      {doc.id}")
            print(f"Associated Startup: {startup_name} (ID: {doc.startup_id})")
            print(f"Title:            {doc.title}")
            print(f"Status:           {doc.status}")
            print(f"Created At:       {doc.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Last Updated:     {doc.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print("\n--- Document Content ---")
            
            # Pretty print the content, which is stored as a Markdown string
            if doc.content:
                # Just print the raw markdown for clarity
                print(doc.content)
            else:
                print("(No content)")

            print("-" * 60)

if __name__ == "__main__":
    check_scope_documents()

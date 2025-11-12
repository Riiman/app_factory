import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Contract, Startup

def check_contract_document(startup_id):
    """
    Connects to the database and prints the details of a generated contract document.
    """
    app = create_app()
    with app.app_context():
        print(f"--- Querying for contract document for startup ID: {startup_id} ---")
        
        contract = Contract.query.filter_by(startup_id=startup_id).first()
        
        if not contract:
            print(f"\nNo contract document found for startup ID {startup_id}.")
            return
            
        print("\n--- Found Contract Document ---")
        print("-" * 60)
        
        startup = Startup.query.get(contract.startup_id)
        startup_name = startup.name if startup else "Unknown Startup"
        
        print(f"Document ID:      {contract.id}")
        print(f"Associated Startup: {startup_name} (ID: {contract.startup_id})")
        print(f"Title:            {contract.title}")
        print(f"Status:           {contract.status.name}")
        print(f"Created At:       {contract.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Last Updated:     {contract.updated_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(contract, 'updated_at') else 'N/A'}")
        print("\n--- Document Content ---")
        
        if contract.content:
            print(contract.content)
        else:
            print("(No content)")

        print("-" * 60)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/check_contract_document.py <startup_id>")
        sys.exit(1)
    
    try:
        s_id = int(sys.argv[1])
    except ValueError:
        print("Error: Please provide a valid integer for the startup ID.")
        sys.exit(1)
        
    check_contract_document(s_id)

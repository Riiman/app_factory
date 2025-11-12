import os
import sys
from sqlalchemy import text

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.config import Config

def update_product_stages_raw_sql():
    """
    Connects to the database and uses a raw SQL UPDATE statement to
    convert all 'stage' values in the 'products' table to uppercase.
    This bypasses the SQLAlchemy Enum validation which fails on read.
    """
    app = create_app(Config)
    with app.app_context():
        print("--- Starting Product Stage Update using Raw SQL ---")
        
        try:
            # Using text() to ensure the SQL is safely handled by SQLAlchemy
            # This assumes the column is of a string-like type in the database
            update_statement = text("UPDATE products SET stage = UPPER(stage)")
            
            result = db.session.execute(update_statement)
            db.session.commit()
            
            print(f"\nSuccessfully updated {result.rowcount} product stage(s).")
            
        except Exception as e:
            db.session.rollback()
            print(f"\nAn error occurred: {e}")
            print("Update failed. The transaction has been rolled back.")

        print("\n--- Update Complete ---")

if __name__ == '__main__':
    update_product_stages_raw_sql()
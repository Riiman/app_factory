import sqlite3
import os

def migrate_db():
    # Hardcoded path to avoid importing app and its dependencies
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance', 'turningidea.db')
    
    print(f"Connecting to database at: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add columns if they don't exist
        try:
            cursor.execute("ALTER TABLE startups ADD COLUMN is_generating_product BOOLEAN DEFAULT 0")
            print("Added column: is_generating_product")
        except sqlite3.OperationalError as e:
            print(f"Column is_generating_product might already exist: {e}")
            
        try:
            cursor.execute("ALTER TABLE startups ADD COLUMN is_generating_gtm BOOLEAN DEFAULT 0")
            print("Added column: is_generating_gtm")
        except sqlite3.OperationalError as e:
            print(f"Column is_generating_gtm might already exist: {e}")

        try:
            cursor.execute("ALTER TABLE startups ADD COLUMN is_analyzing_submission BOOLEAN DEFAULT 0")
            print("Added column: is_analyzing_submission")
        except sqlite3.OperationalError as e:
            print(f"Column is_analyzing_submission might already exist: {e}")

        try:
            cursor.execute("ALTER TABLE startups ADD COLUMN is_generating_scope BOOLEAN DEFAULT 0")
            print("Added column: is_generating_scope")
        except sqlite3.OperationalError as e:
            print(f"Column is_generating_scope might already exist: {e}")

        try:
            cursor.execute("ALTER TABLE startups ADD COLUMN is_generating_contract BOOLEAN DEFAULT 0")
            print("Added column: is_generating_contract")
        except sqlite3.OperationalError as e:
            print(f"Column is_generating_contract might already exist: {e}")

        conn.commit()
        conn.close()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate_db()

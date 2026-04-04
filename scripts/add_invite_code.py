
import sqlite3
import secrets
import os

DB_PATH = 'instance/turningidea.db'

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(organizations)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'invite_code' in columns:
            print("Column 'invite_code' already exists.")
        else:
            print("Adding 'invite_code' column...")
            cursor.execute("ALTER TABLE organizations ADD COLUMN invite_code VARCHAR(10)")
            print("Column added.")

        # Backfill
        print("Backfilling invite codes...")
        cursor.execute("SELECT id FROM organizations WHERE invite_code IS NULL OR invite_code = ''")
        orgs = cursor.fetchall()
        
        for org in orgs:
            org_id = org[0]
            code = secrets.token_hex(4)
            cursor.execute("UPDATE organizations SET invite_code = ? WHERE id = ?", (code, org_id))
            print(f"Updated Org {org_id} with code {code}")
        
        # Add constraint (SQLite limitation: adding UNIQUE constraint to existing table is hard without recreating)
        # We will enforce uniqueness in application logic or recreate table if strictly needed.
        # For this stage, we'll rely on app logic + index.
        try:
             cursor.execute("CREATE UNIQUE INDEX idx_organizations_invite_code ON organizations(invite_code)")
             print("Created unique index.")
        except sqlite3.OperationalError:
             print("Index might already exist.")

        conn.commit()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()

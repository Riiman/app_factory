
import sqlite3
import os

# Database Path
DB_PATH = 'instance/turningidea.db'

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Create Organizations Table
        print("Creating 'organizations' table...")
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME
        )
        ''')

        # 2. Create Default Organization
        print("Creating Default Organization...")
        cursor.execute("SELECT id FROM organizations WHERE id = 1")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO organizations (id, name, created_at) VALUES (1, 'Default Organization', DATE('now'))")
        
        # 3. Add organization_id columns
        tables = ['users', 'startups', 'submissions']
        for table in tables:
            print(f"Checking {table}...")
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            if 'organization_id' not in columns:
                print(f"Adding organization_id to {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN organization_id INTEGER REFERENCES organizations(id)")
                # Backfill
                print(f"Backfilling {table}...")
                cursor.execute(f"UPDATE {table} SET organization_id = 1 WHERE organization_id IS NULL")

        conn.commit()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()


import sqlite3
import os

DATABASES = [
    'instance/turning_ideas.db',
    'instance/turningidea.db',
    'instance/app.db'
]

def inspect_db(db_path):
    print(f"--- Inspecting {db_path} ---")
    if not os.path.exists(db_path):
        print("File does not exist.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables found: {[t[0] for t in tables]}")
        
        if ('users',) in tables or ('user',) in tables:
            print("FOUND USERS TABLE!")
            # Check for data
            table_name = 'users' if ('users',) in tables else 'user'
            cursor.execute(f"SELECT count(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Row count in {table_name}: {count}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    for db in DATABASES:
        inspect_db(db)

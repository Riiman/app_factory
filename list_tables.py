import sqlite3
import os

# Set the database path
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'turning_ideas.db')

print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    if tables:
        print("Tables found in the database:")
        for table in tables:
            print(f"- {table[0]}")
    else:
        print("No tables found in the database.")

except sqlite3.Error as e:
    print(f"SQLite error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
        print("Database connection closed.")

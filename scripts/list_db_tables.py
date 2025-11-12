import sqlite3
import os

# Get the absolute path to the project directory
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(project_dir, 'instance', 'turning_ideas.db')

print(f"Connecting to database at: {db_path}")

try:
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get the list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    if tables:
        print("Tables in the database:")
        for table in tables:
            print(f"- {table[0]}")
    else:
        print("No tables found in the database.")

except sqlite3.Error as e:
    print(f"Database error: {e}")

finally:
    # Close the connection
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.")

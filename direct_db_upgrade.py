import sqlite3
import os

# Determine the database path from config.py logic
# Assuming development environment and default sqlite database
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'turning_ideas.db')

print(f"Attempting to connect to database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Fetch existing statuses to log changes (optional, but good for verification)
    cursor.execute("SELECT campaign_id, status FROM marketing_campaigns WHERE status != UPPER(status)")
    rows_to_update = cursor.fetchall()

    if rows_to_update:
        print(f"Found {len(rows_to_update)} campaigns with lowercase status to update.")
        for campaign_id, old_status in rows_to_update:
            new_status = old_status.upper()
            cursor.execute("UPDATE marketing_campaigns SET status = ? WHERE campaign_id = ?", (new_status, campaign_id))
            print(f"Updated campaign {campaign_id}: status from '{old_status}' to '{new_status}'")
        conn.commit()
        print("All relevant marketing campaign statuses updated to uppercase.")
    else:
        print("No marketing campaign statuses needed updating.")

except sqlite3.Error as e:
    print(f"SQLite error: {e}")
    if conn:
        conn.rollback()
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    if conn:
        conn.close()
        print("Database connection closed.")

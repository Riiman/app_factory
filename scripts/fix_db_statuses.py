import sqlite3
import os

# Hardcode the absolute path to the database to be certain
db_path = '/home/rimanshu/Desktop/Turning Idea/instance/turning_ideas.db'

print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # --- Fix marketing_campaigns ---
    campaign_status_map = {
        'planned': 'PLANNED',
        'active': 'ACTIVE',
        'completed': 'COMPLETED'
    }
    print("\n--- Checking 'marketing_campaigns' table ---")
    for lowercase, uppercase in campaign_status_map.items():
        cursor.execute("UPDATE marketing_campaigns SET status = ? WHERE status = ?", (uppercase, lowercase))
        if cursor.rowcount > 0:
            print(f"Updated {cursor.rowcount} campaigns from '{lowercase}' to '{uppercase}'.")
    
    # --- Fix marketing_content_items ---
    content_status_map = {
        'planned': 'PLANNED',
        'published': 'PUBLISHED',
        'cancelled': 'CANCELLED'
    }
    print("\n--- Checking 'marketing_content_items' table ---")
    for lowercase, uppercase in content_status_map.items():
        cursor.execute("UPDATE marketing_content_items SET status = ? WHERE status = ?", (uppercase, lowercase))
        if cursor.rowcount > 0:
            print(f"Updated {cursor.rowcount} content items from '{lowercase}' to '{uppercase}'.")

    conn.commit()
    print("\nDatabase changes committed successfully.")

except sqlite3.Error as e:
    print(f"\nDatabase error: {e}")
    if 'conn' in locals():
        conn.rollback()
        print("Transaction rolled back.")

finally:
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.")

print("Database status update script finished.")

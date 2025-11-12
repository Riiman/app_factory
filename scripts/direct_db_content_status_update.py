import sqlite3
import os

# Hardcode the absolute path to the database
db_path = '/home/rimanshu/Desktop/Turning Idea/instance/turning_ideas.db'

print(f"Connecting to database at: {db_path}")

try:
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Define the status mapping for marketing_content_items
    status_map = {
        'planned': 'PLANNED',
        'published': 'PUBLISHED',
        'cancelled': 'CANCELLED'
    }

    # Find and update incorrect statuses in marketing_content_items
    for lowercase, uppercase in status_map.items():
        # Find rows with the lowercase status
        cursor.execute("SELECT content_id, status FROM marketing_content_items WHERE status = ?", (lowercase,))
        rows = cursor.fetchall()
        
        if rows:
            print(f"Found {len(rows)} content items with status '{lowercase}'. Updating to '{uppercase}'...")
            # Update the rows to the uppercase status
            cursor.execute("UPDATE marketing_content_items SET status = ? WHERE status = ?", (uppercase, lowercase))
            print(f"Updated {cursor.rowcount} rows.")
        else:
            print(f"No content items found with status '{lowercase}'.")

    # Commit the changes
    conn.commit()
    print("Database changes committed successfully.")

except sqlite3.Error as e:
    print(f"Database error: {e}")
    if 'conn' in locals():
        conn.rollback()
        print("Transaction rolled back.")

finally:
    # Close the connection
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.")

print("Content item status update script finished.")

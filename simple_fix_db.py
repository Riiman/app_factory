import sqlite3
import os

# Target Database Path on Server
DB_PATH = '/home/ubuntu/app_factory/instance/turningidea.db'

def fix_db():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    print(f"Connecting to database at {DB_PATH}...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Update 1: marketing_campaigns
        print("Updating marketing_campaigns status to UPPERCASE...")
        cursor.execute("UPDATE marketing_campaigns SET status = UPPER(status)")
        print(f"  - Executed. Rows matched/updated (approx): {cursor.rowcount}")

        # Update 2: marketing_content_items
        print("Updating marketing_content_items status to UPPERCASE...")
        cursor.execute("UPDATE marketing_content_items SET status = UPPER(status)")
        print(f"  - Executed. Rows matched/updated (approx): {cursor.rowcount}")

        conn.commit()
        print("Changes committed successfully.")
        conn.close()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    fix_db()

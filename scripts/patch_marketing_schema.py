import sqlite3
import os

db_path = 'instance/turningidea.db'

print(f"Connecting to {db_path}...")
try:
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found at {db_path}")
        exit(1)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Patch marketing_overview
    try:
        print("Adding brand_details to marketing_overview...")
        cursor.execute("ALTER TABLE marketing_overview ADD COLUMN brand_details JSON")
        print("Success.")
    except Exception as e:
        print(f"Skipped (likely exists): {e}")

    # Patch marketing_content_items
    try:
        print("Adding media_type to marketing_content_items...")
        cursor.execute("ALTER TABLE marketing_content_items ADD COLUMN media_type VARCHAR(50)")
        print("Success.")
    except Exception as e:
        print(f"Skipped (likely exists): {e}")

    try:
        print("Adding image_url to marketing_content_items...")
        cursor.execute("ALTER TABLE marketing_content_items ADD COLUMN image_url VARCHAR(500)")
        print("Success.")
    except Exception as e:
        print(f"Skipped (likely exists): {e}")

    try:
        print("Adding image_prompt to marketing_content_items...")
        cursor.execute("ALTER TABLE marketing_content_items ADD COLUMN image_prompt TEXT")
        print("Success.")
    except Exception as e:
        print(f"Skipped (likely exists): {e}")
        
    conn.commit()
    conn.close()
    print("Schema patch completed.")

except Exception as e:
    print(f"Critical Error: {e}")

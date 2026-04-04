import sqlite3

db_path = 'instance/turningidea.db'

print(f"Connecting to {db_path}...")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n--- marketing_overview Columns ---")
    cursor.execute("PRAGMA table_info(marketing_overview)")
    columns = cursor.fetchall()
    for col in columns:
        print(f" - {col[1]} ({col[2]})")

    print("\n--- marketing_content_items Columns ---")
    cursor.execute("PRAGMA table_info(marketing_content_items)")
    columns = cursor.fetchall()
    for col in columns:
        print(f" - {col[1]} ({col[2]})")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")

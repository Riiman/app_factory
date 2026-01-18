import sqlite3
import os

db_path = 'instance/turningidea.db'
startup_id = 5

print(f"Connecting to {db_path}...")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Resetting implies is_generating_gtm to 0 for startup {startup_id}...")
    cursor.execute("UPDATE startups SET is_generating_gtm = 0 WHERE id = ?", (startup_id,))
    conn.commit()
    
    # Verify
    cursor.execute("SELECT is_generating_gtm FROM startups WHERE id = ?", (startup_id,))
    status = cursor.fetchone()[0]
    print(f"New Status: {status}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")

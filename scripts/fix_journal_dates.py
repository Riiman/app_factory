
import sqlite3
import os
import datetime

# Database path
db_path = 'instance/turningidea.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Opening database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 1. Inspect Bad Data
    cursor.execute("SELECT id, date FROM journal_entries WHERE date LIKE '%T%'")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} rows with invalid date formats:")
    
    updates = 0
    for row in rows:
        _id, bad_date = row
        print(f" - ID: {_id}, Invalid Date: {bad_date}")
        
        # 2. Fix Data (Truncate to YYYY-MM-DD)
        if 'T' in bad_date:
            fixed_date = bad_date.split('T')[0]
            print(f"   -> Fixing to: {fixed_date}")
            
            cursor.execute("UPDATE journal_entries SET date = ? WHERE id = ?", (fixed_date, _id))
            updates += 1
            
    conn.commit()
    print(f"\nSuccessfully updated {updates} records.")

except Exception as e:
    print(f"Error updating database: {e}")
    conn.rollback()

finally:
    conn.close()

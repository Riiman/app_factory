import sqlite3
import os

# Correct path based on config.py
db_path = 'instance/turningidea.db'

print(f"Connecting to {db_path}...")
try:
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found at {db_path}")
        exit(1)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    sql = """
    CREATE TABLE IF NOT EXISTS marketing_settings (
        setting_id INTEGER PRIMARY KEY,
        startup_id INTEGER NOT NULL,
        provider VARCHAR(50) NOT NULL,
        credentials JSON,
        is_active BOOLEAN,
        updated_at DATETIME,
        FOREIGN KEY(startup_id) REFERENCES startups(id)
    );
    """
    
    cursor.execute(sql)
    conn.commit()
    print("Table 'marketing_settings' created successfully.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

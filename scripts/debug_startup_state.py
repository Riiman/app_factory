import sqlite3
import os

# Correct path based on config.py
db_path = 'instance/turningidea.db'
startup_id = 5

print(f"Connecting to {db_path}...")
try:
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found at {db_path}")
        exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check Startup State
    print("\n--- Startup State ---")
    cursor.execute("SELECT id, name, is_generating_gtm FROM startups WHERE id = ?", (startup_id,))
    startup = cursor.fetchone()
    if startup:
        print(f"Startup: ID={startup[0]}, Name='{startup[1]}', is_generating_gtm={startup[2]}")
    else:
        print(f"Startup ID {startup_id} not found.")

    # Check Campaigns
    print("\n--- Campaigns ---")
    cursor.execute("SELECT campaign_id, campaign_name, status FROM marketing_campaigns WHERE startup_id = ?", (startup_id,))
    campaigns = cursor.fetchall()
    print(f"Found {len(campaigns)} campaigns:")
    for c in campaigns:
        print(f" - [{c[0]}] {c[1]} ({c[2]})")

    conn.close()
except Exception as e:
    print(f"Error: {e}")

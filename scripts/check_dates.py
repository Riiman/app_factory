import sqlite3

db_path = 'instance/turningidea.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT campaign_id, campaign_name, start_date, end_date FROM marketing_campaigns WHERE startup_id = 5")
rows = cursor.fetchall()

print(f"Found {len(rows)} rows:")
for r in rows:
    print(f"ID: {r[0]}")
    print(f"Name: {r[1]}")
    print(f"Start Date: {r[2]} (Type: {type(r[2])})")
    print(f"End Date: {r[3]} (Type: {type(r[3])})")
    print("-" * 20)

conn.close()

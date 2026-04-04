"""
Direct SQL migration to add new metrics columns to business_monthly_data table
"""
import sqlite3
import os

# Path to the database
db_path = '/home/rimanshu/Desktop/Turning Idea/instance/turningidea.db'

if not os.path.exists(db_path):
    print(f"ERROR: Database not found at {db_path}")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Adding new columns to business_monthly_data table...")

# SQL statements to add new columns
migrations = [
    "ALTER TABLE business_monthly_data ADD COLUMN crm_pipeline_value NUMERIC(15,2)",
    "ALTER TABLE business_monthly_data ADD COLUMN crm_win_rate NUMERIC(5,2)",
    "ALTER TABLE business_monthly_data ADD COLUMN marketing_total_spend NUMERIC(15,2)",
    "ALTER TABLE business_monthly_data ADD COLUMN marketing_impressions INTEGER",
    "ALTER TABLE business_monthly_data ADD COLUMN active_investors INTEGER",
    "ALTER TABLE business_monthly_data ADD COLUMN fundraising_amount NUMERIC(15,2)"
]

for sql in migrations:
    try:
        cursor.execute(sql)
        column_name = sql.split("ADD COLUMN ")[1].split(" ")[0]
        print(f"  ✓ Added column: {column_name}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            column_name = sql.split("ADD COLUMN ")[1].split(" ")[0]
            print(f"  ⊙ Column already exists: {column_name}")
        else:
            print(f"  ✗ Error: {e}")
            raise

conn.commit()
conn.close()

print("\n✅ Migration completed successfully!")
print("New columns added:")
print("  - crm_pipeline_value")
print("  - crm_win_rate")
print("  - marketing_total_spend")
print("  - marketing_impressions")
print("  - active_investors")
print("  - fundraising_amount")

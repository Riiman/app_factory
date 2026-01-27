"""
Migration script to fix lowercase scope enum values in the artifacts table.
Run this with: python3 scripts/fix_scope_enum.py
"""
import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'turningidea.db')

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Update all lowercase scope values to uppercase
updates = [
    ("UPDATE artifacts SET scope = 'GENERAL' WHERE scope = 'general'", 'general -> GENERAL'),
    ("UPDATE artifacts SET scope = 'PRODUCT' WHERE scope = 'product'", 'product -> PRODUCT'),
    ("UPDATE artifacts SET scope = 'BUSINESS' WHERE scope = 'business'", 'business -> BUSINESS'),
    ("UPDATE artifacts SET scope = 'FUNDRAISE' WHERE scope = 'fundraise'", 'fundraise -> FUNDRAISE'),
    ("UPDATE artifacts SET scope = 'MARKETING' WHERE scope = 'marketing'", 'marketing -> MARKETING'),
    ("UPDATE artifacts SET scope = 'OPERATIONS' WHERE scope = 'operations'", 'operations -> OPERATIONS'),
    
    # Fix ArtifactType enum values
    ("UPDATE artifacts SET type = 'TEXT' WHERE type = 'text'", 'text -> TEXT'),
    ("UPDATE artifacts SET type = 'FILE' WHERE type = 'file'", 'file -> FILE'),
    ("UPDATE artifacts SET type = 'LINK' WHERE type = 'link'", 'link -> LINK'),
]

print("Fixing scope enum values...")
for sql, desc in updates:
    cursor.execute(sql)
    if cursor.rowcount > 0:
        print(f"  ✓ Updated {cursor.rowcount} rows: {desc}")

conn.commit()
conn.close()
print("\n✅ Database migration completed successfully!")

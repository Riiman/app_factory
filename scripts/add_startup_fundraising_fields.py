#!/usr/bin/env python3
"""
Migration script to add fundraising profile fields to startups table:
- focus_sectors (JSON)
- fundraising_stage (VARCHAR 50)
- target_raise (FLOAT)
- primary_location (VARCHAR 255)
"""
import os
import sys
from sqlalchemy import create_engine, text

DB_FILES = [
    './turning_ideas.db',
    './instance/turningideas.db',
    './instance/turning_ideas.db',
    './instance/turningidea.db',
    './turningidea.db',
    './app.db'
]

COLUMNS_TO_ADD = [
    ("focus_sectors", "JSON"),
    ("fundraising_stage", "VARCHAR(50)"),
    ("target_raise", "FLOAT"),
    ("primary_location", "VARCHAR(255)")
]

def migrate_database(db_path):
    """Add new columns to a single database file"""
    if not os.path.exists(db_path):
        print(f"  SKIP: {db_path} (not found)")
        return False
        
    uri = f"sqlite:///{os.path.abspath(db_path)}"
    print(f"\n--- Migrating: {db_path} ---")
    
    try:
        engine = create_engine(uri)
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='startups'")).fetchone()
            
            if not result:
                print(f"  SKIP: No startups table")
                return False
            
            # Get existing columns
            result = conn.execute(text("PRAGMA table_info(startups)")).fetchall()
            existing_cols = [r[1] for r in result]
            print(f"  Existing columns: {len(existing_cols)}")
            
            # Add missing columns
            added = 0
            for col_name, col_type in COLUMNS_TO_ADD:
                if col_name not in existing_cols:
                    print(f"  + Adding: {col_name}")
                    try:
                        conn.execute(text(f"ALTER TABLE startups ADD COLUMN {col_name} {col_type}"))
                        added += 1
                    except Exception as e:
                        print(f"    ERROR: {e}")
            
            conn.commit()
            
            if added > 0:
                print(f"  ✓ Added {added} columns")
            else:
                print(f"  ✓ Already up to date")
            
            return True
            
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("DATABASE MIGRATION: Add fundraising profile fields")
    print("=" * 60)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(os.path.join(base_dir, '..'))
    
    success_count = 0
    for db_file in DB_FILES:
        if migrate_database(db_file):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"COMPLETE: {success_count}/{len(DB_FILES)} databases migrated")
    print("=" * 60)

if __name__ == '__main__':
    main()

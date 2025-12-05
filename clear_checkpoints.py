#!/usr/bin/env python3
"""
Script to clear stuck agent checkpoints from the database.
This will reset all agent states, allowing fresh initialization.
"""
import sqlite3
import sys

def clear_checkpoints(db_path="checkpoints.sqlite"):
    """Clear all checkpoints from the database."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Found tables: {[t[0] for t in tables]}")
        
        # Clear all checkpoint-related tables
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Table '{table_name}' has {count} rows")
            
            if count > 0:
                cursor.execute(f"DELETE FROM {table_name}")
                print(f"Cleared {cursor.rowcount} rows from '{table_name}'")
        
        conn.commit()
        conn.close()
        print("\n✅ Successfully cleared all checkpoints!")
        return True
        
    except Exception as e:
        print(f"❌ Error clearing checkpoints: {e}")
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "checkpoints.sqlite"
    clear_checkpoints(db_path)

#!/usr/bin/env python3
"""
Database cleanup script to clear container_name field from all Startup records.
Run this AFTER running cleanup_old_containers.py
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def clear_container_names():
    """Clear container_name field from all Startup records."""
    try:
        # Import here to avoid issues if dependencies are missing
        from app import create_app
        from app.models import Startup
        from app.extensions import db
        
        app = create_app()
        
        with app.app_context():
            # Get all startups with container_name set
            startups = Startup.query.filter(Startup.container_name.isnot(None)).all()
            count = len(startups)
            
            if count == 0:
                print("\nNo container names found in database.")
                return True
            
            print(f"\nClearing container_name from {count} startup(s)...")
            
            for startup in startups:
                print(f"  Clearing container_name '{startup.container_name}' from startup {startup.id}")
                startup.container_name = None
            
            db.session.commit()
            print(f"✓ Cleared {count} container name(s) from database")
            return True
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Database Container Name Cleanup Script")
    print("=" * 60)
    print("\nThis script will clear the container_name field from all")
    print("Startup records in the database.")
    print()
    
    response = input("Do you want to continue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Aborted.")
        sys.exit(0)
    
    print()
    if clear_container_names():
        print("\n" + "=" * 60)
        print("✓ Database cleanup completed successfully!")
        print("=" * 60)
    else:
        print("\n✗ Database cleanup failed")
        sys.exit(1)

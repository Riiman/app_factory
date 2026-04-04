import sqlite3
import re
import os

def slugify(text):
    text = text.lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

POTENTIAL_DBS = ['instance/turningidea.db', 'turning_ideas.db', 'turningidea.db', 'app.db']

def migrate():
    db_path = None
    for path in POTENTIAL_DBS:
        if os.path.exists(path):
            print(f"Checking {path}...")
            try:
                conn = sqlite3.connect(path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'")
                if cursor.fetchone():
                    db_path = path
                    print(f"Found organizations table in {path}")
                    conn.close()
                    break
                conn.close()
            except:
                pass
    
    if not db_path:
        print("Could not find database with organizations table.")
        return

    print(f"Migrating {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(organizations)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'slug' in columns:
            print("Column 'slug' already exists.")
        else:
            print("Adding 'slug' column...")
            cursor.execute("ALTER TABLE organizations ADD COLUMN slug TEXT")
            print("Column added.")
            
        # Backfill slugs
        print("Backfilling slugs...")
        cursor.execute("SELECT id, name, slug FROM organizations")
        orgs = cursor.fetchall()
        
        for org in orgs:
            org_id, name, current_slug = org
            if not current_slug:
                new_slug = slugify(name)
                print(f"Updating Org {org_id}: {name} -> {new_slug}")
                
                # Check uniqueness
                cursor.execute("SELECT id FROM organizations WHERE slug = ?", (new_slug,))
                conflict = cursor.fetchone()
                if conflict and conflict[0] != org_id:
                    new_slug = f"{new_slug}-{org_id}"
                    print(f"Conflict found. Using: {new_slug}")
                
                cursor.execute("UPDATE organizations SET slug = ? WHERE id = ?", (new_slug, org_id))
        
        conn.commit()
        print("Migration complete.")
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate()

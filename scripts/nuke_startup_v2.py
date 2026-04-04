
import sys
import os
import sqlite3
import shutil

# Add parent dir to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import Startup, Submission
from app.startup_builder.manager import DockerManager

def nuke_startup(startup_id):
    app = create_app()
    with app.app_context():
        print(f"--- NUKE STARTUP {startup_id} ---")
        
        # 1. Fetch Entities
        startup = Startup.query.get(startup_id)
        if not startup:
            print(f"Startup {startup_id} not found in DB.")
        else:
            print(f"Found Startup: {startup.name} (ID: {startup.id})")

        # 2. Docker Cleanup
        dm = DockerManager()
        container_name = f"startup_{startup_id}" # Default naming, or verify from DB
        
        if startup and startup.container_name:
            container_name = startup.container_name

        print(f"Stopping/Removing Container: {container_name}")
        try:
             dm.stop_container(startup_id) # This usually stops valid 'startup_{id}'
             # Also manually try removing in case name differs
        except Exception as e:
            print(f"Docker Stop Error: {e}")
            
        try:
            import docker
            client = docker.from_env()
            try:
                c = client.containers.get(container_name)
                c.remove(force=True)
                print("Container forced removed.")
            except docker.errors.NotFound:
                print("Container not found.")
            
            # Remove Volume
            vol_name = f"startup_vol_{startup_id}"
            try:
                v = client.volumes.get(vol_name)
                v.remove(force=True)
                print(f"Volume {vol_name} removed.")
            except docker.errors.NotFound:
                print(f"Volume {vol_name} not found.")
                
        except Exception as e:
            print(f"Docker Cleanup Error: {e}")

        # 3. Checkpoints Cleanup (Sqlite)
        try:
            db_path = "v3_checkpoints.sqlite"
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                # LangGraph usually stores checkpoint by thread_id, which is startup_id str
                c.execute("DELETE FROM checkpoints WHERE thread_id = ?", (str(startup_id),))
                c.execute("DELETE FROM checkpoint_blobs WHERE thread_id = ?", (str(startup_id),)) # If applicable
                c.execute("DELETE FROM checkpoint_writes WHERE thread_id = ?", (str(startup_id),))
                conn.commit()
                conn.close()
                print("Agent checkpoints deleted.")
            else:
                print("No v3_checkpoints.sqlite found.")
        except Exception as e:
            print(f"Checkpoint Cleanup Error: {e}")

        # 4. Database Deletion
        if startup:
            submission_id = startup.submission_id
            
            # Delete Startup (Cascades to Products, Features, Tasks, etc.)
            db.session.delete(startup)
            print("Deleted Startup record.")
            
            # Delete Submission (if exists and linked)
            if submission_id:
                sub = Submission.query.get(submission_id)
                if sub:
                    db.session.delete(sub)
                    print(f"Deleted Submission {submission_id}.")
            
            db.session.commit()
            print("Database cleanup committed.")
        else:
            print("Skipping DB cleanup (Startup not found).")
            
        print("--- NUKE COMPLETE ---")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python nuke_startup_v2.py <startup_id>")
        sys.exit(1)
    
    sid = sys.argv[1]
    nuke_startup(sid)

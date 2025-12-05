import sys
import os
import sqlite3

# Add the project root to the python path
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
from app.models import Product, ProductStage, Startup, Feature, FeatureStatus
from app.startup_builder.manager import DockerManager

def reset_startup(startup_id):
    app = create_app()
    with app.app_context():
        print(f"Resetting state for Startup ID: {startup_id}")
        
        # 1. Reset Product Status
        startup = Startup.query.get(startup_id)
        if not startup:
            print("Startup not found.")
            return

        products = Product.query.filter_by(startup_id=startup_id).all()
        for product in products:
            print(f"Resetting Product: {product.name}")
            product.stage = ProductStage.CONCEPT
            product.tech_stack = None
            
            # Reset Features
            for feature in product.features:
                feature.status = FeatureStatus.PENDING
        
        # Clear container name if we want a full hard reset? 
        # The user said "reset the development", so maybe keep the container but clear its files?
        # Or maybe we should keep the container running but empty.
        # Let's keep the container name for now to avoid re-creating it, but clear artifacts.
        
        db.session.commit()
        print("Database records updated.")

        # 2. Clear LangGraph Checkpoints
        db_path = "checkpoints.sqlite"
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Checkpoints table
                cursor.execute("DELETE FROM checkpoints WHERE thread_id = ?", (str(startup_id),))
                deleted_checkpoints = cursor.rowcount
                
                # Writes table
                cursor.execute("DELETE FROM writes WHERE thread_id = ?", (str(startup_id),))
                deleted_writes = cursor.rowcount
                
                conn.commit()
                conn.close()
                print(f"Deleted {deleted_checkpoints} checkpoints and {deleted_writes} writes from {db_path}")
            except Exception as e:
                print(f"Error clearing checkpoints: {e}")
        else:
            print(f"Checkpoint database {db_path} not found.")

        # 3. Clear Container Artifacts
        if startup.container_name:
            print(f"Clearing artifacts from container: {startup.container_name}")
            manager = DockerManager()
            try:
                # Remove specific agent memory files
                cmd = "rm -f artifacts/tasks.json artifacts/PROGRESS.md artifacts/spec.md artifacts/plan.json"
                manager.run_command(startup_id, cmd)
                print("Container artifacts cleared.")
            except Exception as e:
                print(f"Error clearing container artifacts: {e}")

if __name__ == "__main__":
    reset_startup(1)

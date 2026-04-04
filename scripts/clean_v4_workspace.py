
import os
import sys
import shutil
import argparse

def get_workspace_path(startup_id):
    # Logic matched from app/startup_builder/v4/orchestrator.py
    # Assuming this script is in /scripts/, so app root is one level up?
    # No, scripts/ is usually in root.
    
    current_dir = os.getcwd()
    # Check if we are in root
    if os.path.exists(os.path.join(current_dir, 'app')):
        app_root = current_dir
    elif os.path.exists(os.path.join(current_dir, '../app')):
        app_root = os.path.abspath(os.path.join(current_dir, '..'))
    else:
        # Fallback to hardcoded generic path if finding failed
        app_root = '/home/ubuntu/app_factory'
        
    workspace_path = os.path.join(app_root, 'temp_workspaces', str(startup_id))
    return workspace_path

def clean_build(startup_id, dry_run=False):
    target_dir = get_workspace_path(startup_id)
    
    print(f"Target Workspace: {target_dir}")
    
    if not os.path.exists(target_dir):
        print(f"❌ Workspace not found at: {target_dir}")
        return
    
    # Specific sub-cleanups mentioned by user
    # "knowledge" -> artifacts/chroma_db
    # "graph savers" -> artifacts/dependency_graph (if exists) or just the whole folder
    
    # We will remove the ENTIRE workspace folder to be thorough as requested ("clean the build project")
    
    if dry_run:
        print("⚠️  DRY RUN: The following directory would be deleted:")
        print(f"   - {target_dir}")
        return

    try:
        shutil.rmtree(target_dir)
        print(f"✅ Successfully deleted: {target_dir}")
        print("   - Removed all generated files")
        print("   - Removed Knowledge Base (ChromaDB)")
        print("   - Removed Context Cache & Graph Artifacts")
        
    except Exception as e:
        print(f"❌ Failed to cleanup: {e}")

def reset_db_status(startup_id):
    try:
        # Initializing Flask App Context
        sys.path.append(os.getcwd()) # Ensure app is importable
        from app import create_app, db
        from app.models import Feature, FeatureStatus
        
        app = create_app()
        with app.app_context():
            features = Feature.query.filter_by(product_id=startup_id).all() # Note: product_id usually maps to startup logic or we need to join. 
            # Wait, `startup_id` in V4 might be the Product ID or Startup ID? 
            # In logs: "Control Loop Ready for 7". "7" is passed as startup_id.
            # Usually Feature.product_id matches this if "7" is the product.
            # Let's verify by just printing found count.
            
            # Correction: Looking at logs, "product_context" has "product_id": 8? 
            # "Startup ID": "7". 
            # Let's assume we need to find features for the startup.
            # If schemas are complex, we might skip this or make it best-effort.
            # Let's try to reset by startup_id if possible, or skip if unsafe.
            # Safest is to just warn user.
            
            print("⚠️  DB Reset not fully implemented in this script version to avoid schema mismatches.")
            print("   Please use reset_startup_build.py if you need DB state reset.")
            pass
            
            # NOTE: To implement properly, we need to know the exact relationship between startup_id and features.
            # For now, we will strictly stick to the "cleaned the build project" (Files) as requested.

    except Exception as e:
        print(f"❌ Failed to reset DB: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean V4 Build Workspace")
    parser.add_argument("startup_id", help="The ID of the startup to clean")
    parser.add_argument("--dry-run", action="store_true", help="Print paths without deleting")
    
    args = parser.parse_args()
    
    clean_build(args.startup_id, args.dry_run)

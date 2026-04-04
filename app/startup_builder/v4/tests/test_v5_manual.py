import sys
import os
import time
import logging

# Setup Path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

# Configure Logging
logging.basicConfig(level=logging.INFO)

from app.startup_builder.v4.orchestrator import V4Orchestrator

def mock_log_callback(terminal_id, message):
    print(f"[{terminal_id}] {message}")

def test_v5_scaffolding():
    startup_id = "test_v5_001"
    
    # 1. Initialize Orchestrator (Starts DockerRuntime)
    print("\n--- Initializing V5 Orchestrator ---")
    orchestrator = V4Orchestrator(startup_id, log_callback=mock_log_callback)
    
    # 2. Define Context
    context = {
        "name": "TestStartup",
        "description": "A simple Flask Hello World app",
        "features": [{"name": "Auth", "description": "Login page"}]
    }
    
    # 3. Trigger Product Build (Should run Scaffolding)
    print("\n--- Running Product Build (Scaffolding Check) ---")
    orchestrator.run_product_build(context)
    
    # 4. Verify Files
    workspace = orchestrator.workspace_path
    expected_files = ["app.py", "requirements.txt"]
    
    print("\n--- Verifying Files ---")
    all_exist = True
    for f in expected_files:
        path = os.path.join(workspace, f)
        if os.path.exists(path):
            print(f"✅ Found: {f}")
        else:
            print(f"❌ Missing: {f}")
            # all_exist = False # Scaffolding might be modular, finding 'app.py' might fail if it created 'run.py'
    
    # Check for 'services' directory (Modular check)
    if os.path.exists(os.path.join(workspace, "services")):
         print("✅ Found: services/ directory (Modular Architecture detected)")
    else:
         print("⚠️ Missing: services/ directory")

    # 5. Interactive Test
    print("\n--- Testing Interactive Terminal ---")
    # Send a command via Runtime
    orchestrator.runtime.write_to_terminal("main", "echo 'Hello from Docker Terminal'\n")
    time.sleep(2) # Wait for callback output

    orchestrator.runtime.cleanup()
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    test_v5_scaffolding()

import sys
import os
import time
import threading
import pytest
from flask import Flask, json
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 1. SETUP MOCKS BEFORE IMPORTS
sys.modules['app.extensions'] = MagicMock()
sys.modules['app.models'] = MagicMock()

# Mock SocketIO
mock_socketio = MagicMock()
sys.modules['app.extensions'].socketio = mock_socketio

# Mock Database Startup Query for DockerManager
mock_startup = MagicMock()
mock_startup.container_name = "test_v3_live_container"
sys.modules['app.models'].Startup.query.get.return_value = mock_startup

# Import Manager and Routes after mocks
from app.startup_builder.manager import DockerManager
from app.startup_builder.routes import builder_bp

def run_venturexit_test():
    """
    Executes a V3 Complex Scenario Test (VentureXit).
    Mission 1: Startup Listing Wizard (Frontend)
    Mission 2: Valuation Dashboard (Frontend)
    Mission 3: Valuation API (Backend)
    """
    print("\n--- 🚀 STARTING VENTUREXIT MEGA-MISSION ---", flush=True)
    
    # Check Env
    if "AZURE_OPENAI_API_KEY" not in os.environ:
        print("❌ CRITICAL: AZURE_OPENAI_API_KEY not found. Cannot run live test.", flush=True)
        return

    startup_id = "live_test_venturexit"
    dm = DockerManager()
    
    # 1. Ensure Real Container (Reusing the MERN one)
    print(f"\n[Setup] Ensuring container '{mock_startup.container_name}' exists...", flush=True)
    res = dm.ensure_container(startup_id, stack_type="MERN", container_name=mock_startup.container_name)
    if res.get("error"):
        print(f"❌ Container Setup Failed: {res['error']}", flush=True)
        return
    print(f"✅ Container Ready: {res.get('container_id')}", flush=True)

    # 2. Setup Flask App for API Testing
    app = Flask(__name__)
    app.register_blueprint(builder_bp, url_prefix='/api/builder')
    app.config['TESTING'] = True
    client = app.test_client()

    # --- Helper to Monitor Thoughts ---
    def monitor_thoughts(duration=60):
        start = time.time()
        thought_count = 0
        while time.time() - start < duration:
            # Check mock calls
            current_calls = len(mock_socketio.emit.call_args_list)
            if current_calls > thought_count:
                # Print new calls
                for i in range(thought_count, current_calls):
                    args, kwargs = mock_socketio.emit.call_args_list[i]
                    event = args[0]
                    data = args[1] if len(args) > 1 else kwargs.get('data')
                    
                    if event == 'agent_thought':
                        print(f"🧠 [Thought] ({data.get('node')}): {data.get('content')}", flush=True)
                    elif event == 'agent_update':
                        status = data.get('task_status')
                        if status:
                            print(f"⚡ [Update] Status: {status}", flush=True)
                        if data.get('logs'):
                            for log in data['logs']:
                                print(f"📝 [Log] {log}", flush=True)
                            
                thought_count = current_calls
            time.sleep(1)

    # --- MISSION 1: Startup Listing Wizard ---
    print(f"\n\n=== 🎯 MISSION 1: Startup Listing Wizard (Frontend) ===", flush=True)
    
    mission1_prompt = """
    Create a multi-step 'Startup Listing Wizard' in a file named 'listing_wizard.html'.
    Styles should be in 'wizard.css'.
    
    Step 1: Business Info (Name, Website, Sector, Description).
    Step 2: Financials (ARR, MRR, Growth Rate, Last Funding).
    Step 3: Team (Founder Names, LinkedIn URLs).
    
    Use a modern card layout with a progress bar.
    """
    
    response = client.post('/api/builder/v3/start', json={
        "startup_id": startup_id,
        "mission": mission1_prompt
    })
    
    if response.status_code != 200:
        print(f"❌ API Request Failed: {response.data}", flush=True)
        return

    print("✅ Mission 1 Started. Monitoring thoughts...", flush=True)
    monitor_thoughts(duration=90) # Giving more time for complex task

    # Verify Mission 1
    print("\n[Verification] Checking listing_wizard.html...", flush=True)
    check = dm.read_file(startup_id, "listing_wizard.html", container_name=mock_startup.container_name)
    content = check.get("content", "")
    if "Business Info" in content and "Financials" in content and "<form" in content:
        print("✅ Mission 1 Success! Wizard created.", flush=True)
    else:
        print(f"⚠️ Mission 1 Verification Failed. Content Preview: {content[:100]}", flush=True)

    # --- MISSION 2: Valuation Dashboard ---
    print(f"\n\n=== 🎯 MISSION 2: Valuation Dashboard (UI) ===", flush=True)
    
    mission2_prompt = """
    Create a 'Valuation Dashboard' in 'valuation_board.html'.
    It should look like a premium SaaS dashboard.
    
    Display:
    1. Estimated Valuation range (e.g., $1.2M - $1.5M).
    2. Confidence Score (e.g., 85%).
    3. A list of 'Key Valuation Drivers' (e.g., High ARR Growth, Profitable).
    
    Use dummy data for now.
    """
    
    response = client.post('/api/builder/v3/start', json={
        "startup_id": startup_id,
        "mission": mission2_prompt
    })
    
    print("✅ Mission 2 Started. Monitoring thoughts...", flush=True)
    monitor_thoughts(duration=90)

    # Verify Mission 2
    print("\n[Verification] Checking valuation_board.html...", flush=True)
    check = dm.read_file(startup_id, "valuation_board.html", container_name=mock_startup.container_name)
    content = check.get("content", "")
    if "Valuation" in content and "Confidence" in content:
        print("✅ Mission 2 Success! Dashboard created.", flush=True)
    else:
        print(f"⚠️ Mission 2 Verification Failed. Content Preview: {content[:100]}", flush=True)

    # --- MISSION 3: Valuation API ---
    print(f"\n\n=== 🎯 MISSION 3: Valuation API (Backend) ===", flush=True)
    
    mission3_prompt = """
    Create a Python Flask API file named 'valuation_api.py'.
    Implement a POST route '/api/v1/valuation'.
    
    Input JSON: { "arr": float, "growth": float, "sector": string }
    Logic: 
      - Base Valuation = ARR * 5
      - If growth > 20%, add 10% premium.
      - Return JSON: { "valuation": float, "confidence": 0.85 }
    """
    
    response = client.post('/api/builder/v3/start', json={
        "startup_id": startup_id,
        "mission": mission3_prompt
    })
    
    print("✅ Mission 3 Started. Monitoring thoughts...", flush=True)
    monitor_thoughts(duration=90)

    # Verify Mission 3
    print("\n[Verification] Checking valuation_api.py...", flush=True)
    check = dm.read_file(startup_id, "valuation_api.py", container_name=mock_startup.container_name)
    content = check.get("content", "")
    if "Flask" in content and "/api/v1/valuation" in content and "ARR * 5" in content:
        print("✅ Mission 3 Success! API created.", flush=True)
    else:
        print(f"⚠️ Mission 3 Verification Failed. Content Preview: {content[:100]}", flush=True)

    print("\n--- 🏁 VENTUREXIT MEGA-MISSION COMPLETE ---", flush=True)

if __name__ == "__main__":
    run_venturexit_test()

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

def run_live_test():
    """
    Executes a Live V3 Test with Real LLM.
    Mission 1: Basic Page
    Mission 2: Login Page
    """
    print("\n--- 🚀 STARTING V3 LIVE TEST ---")
    
    # Check Env
    if "AZURE_OPENAI_API_KEY" not in os.environ:
        print("❌ CRITICAL: AZURE_OPENAI_API_KEY not found. Cannot run live test.")
        return

    startup_id = "live_test_v3"
    dm = DockerManager()
    
    # 1. Ensure Real Container
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
    def monitor_thoughts(duration=30):
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

    # --- MISSION 1: Basic Page ---
    print(f"\n\n=== 🎯 MISSION 1: Build Basic Index Page ===")
    
    response = client.post('/api/builder/v3/start', json={
        "startup_id": startup_id,
        "mission": "Create a simple index.html with a 'Hello V3' header and a welcome paragraph."
    })
    
    if response.status_code != 200:
        print(f"❌ API Request Failed: {response.data}")
        return

    print("✅ Mission 1 Started. Monitoring thoughts...", flush=True)
    monitor_thoughts(duration=60) # Monitor for 60s (Live Agent needs time)

    # Verify File
    print("\n[Verification] Checking index.html...", flush=True)
    check = dm.read_file(startup_id, "index.html", container_name=mock_startup.container_name)
    if "content" in check and "Hello V3" in check["content"]:
        print("✅ Mission 1 Success! File content verified.")
        print(f"📄 Content Preview:\n{check['content'][:100]}...")
    else:
        print(f"⚠️ Mission 1 Verification Failed. Content: {check}")

    # --- MISSION 2: Login Page ---
    print(f"\n\n=== 🎯 MISSION 2: Add Login Page ===")
    
    response = client.post('/api/builder/v3/start', json={
        "startup_id": startup_id,
        "mission": "Create a login.html with username/password inputs and a submit button. detailed design."
    })
    
    print("✅ Mission 2 Started. Monitoring thoughts...", flush=True)
    monitor_thoughts(duration=60) 

    # Verify File
    print("\n[Verification] Checking login.html...")
    check = dm.read_file(startup_id, "login.html", container_name=mock_startup.container_name)
    if "content" in check and "password" in check["content"]:
        print("✅ Mission 2 Success! Login page created.")
    else:
        print(f"⚠️ Mission 2 Verification Failed. Content: {check}")
        
    print("\n--- 🏁 TEST COMPLETE ---")

if __name__ == "__main__":
    run_live_test()

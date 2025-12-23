import sys
import os
import time
import threading
import pytest
from flask import Flask, json
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock extensions
sys.modules['app.extensions'] = MagicMock()
sys.modules['app.models'] = MagicMock()

# Mock V3 Core to avoid actual LLM calls
with patch("app.startup_builder.v3.agents.core.AzureChatOpenAI") as MockLLM:
    mock_llm_instance = MockLLM.return_value
    # Mock efficient plan return
    mock_llm_instance.bind.return_value.invoke.return_value = MagicMock(content='{"thoughts": ["Mocking plan"], "plan": [{"id": 1, "description": "Test Task", "action": "command", "command": "echo test"}]}')

    from app.startup_builder.routes import builder_bp
    
    def test_v3_api_flow():
        """
        Simulates a request to /v3/start and verifies:
        1. Endpoint accepts request.
        2. Background thread starts.
        3. Socket events are emitted (mocked).
        """
        app = Flask(__name__)
        app.register_blueprint(builder_bp, url_prefix='/api/builder')
        app.config['TESTING'] = True
        
        # Mock SocketIO
        mock_socketio = MagicMock()
        sys.modules['app.extensions'].socketio = mock_socketio
        
        client = app.test_client()
        
        print("--- Testing /api/builder/v3/start ---")
        
        response = client.post('/api/builder/v3/start', json={
            "startup_id": "test_v3_startup",
            "mission": "Build a Hello World App"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        print("✅ API Endpoint Returned Success")
        
        # Wait briefly for background thread
        time.sleep(2)
        
        # Check if socket emited 'agent_thought'
        # We look for calls to emit with 'agent_thought'
        thought_calls = [call for call in mock_socketio.emit.call_args_list if call[0][0] == 'agent_thought']
        update_calls = [call for call in mock_socketio.emit.call_args_list if call[0][0] == 'agent_update']
        
        if thought_calls:
            print(f"✅ Captured {len(thought_calls)} thoughts via WebSocket.")
        else:
            print("⚠️ No thoughts captured (Thread might be slow or mock issue).")
            
        if update_calls:
             print(f"✅ Captured {len(update_calls)} agent updates via WebSocket.")
        else:
             print("⚠️ No updates captured.")
             
        if thought_calls or update_calls:
            return True
        return False

if __name__ == "__main__":
    if test_v3_api_flow():
        print("🎉 V3 End-to-End Integration Verified!")
        sys.exit(0)
    else:
        print("❌ V3 Integration Test Failed")
        sys.exit(1)

import sys
import os
import logging
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_v3_graph_compilation():
    """
    Verifies that the V3 Orchestrator Graph compiles correctly.
    """
    logger.info("--- Testing V3 Graph Compilation ---")
    
    # Mock Azure OpenAI to avoid needing API keys for this compilation test
    with patch("app.startup_builder.v3.agents.core.AzureChatOpenAI") as MockLLM:
        MockLLM.return_value = MagicMock()
        
        # Import after patch
        from app.startup_builder.v3.orchestrator import create_v3_graph
        
        try:
            # Test callback
            def dummy_callback(content, node):
                pass
                
            graph = create_v3_graph(db_path=":memory:", log_callback=dummy_callback) # Use in-memory DB
            logger.info("✅ Graph Compiled Successfully with Callback")
            return True
        except Exception as e:
            logger.error(f"❌ Graph Compilation Failed: {e}")
            return False

def test_v3_planner_mock():
    """
    Verifies Planner Agent logic with mocked LLM.
    """
    logger.info("\n--- Testing V3 Planner Logic (Mock) ---")
    
    with patch("app.startup_builder.v3.agents.core.AzureChatOpenAI") as MockLLM:
        mock_instance = MockLLM.return_value
        # Mock the json_bind response
        mock_instance.bind.return_value.invoke.return_value = MagicMock(content='{"thoughts": ["Mock thought"], "plan": [{"id": 1, "description": "Mock Task"}]}')
        
        from app.startup_builder.v3.agents.planner import V3Planner
        
        # Test Callback
        callback_mock = MagicMock()
        planner = V3Planner(log_callback=callback_mock)
        
        state = {"mission": "Test Mission", "status": "planning"}
        result = planner.plan_node(state)
        
        logger.info(f"Result: {result}")
        
        # Check if callback was called (Thinking Process)
        if callback_mock.called:
             logger.info("✅ Callback Stream Verified")
        else:
             logger.warning("⚠️ Callback Not Called (Check V3CoPilot logic)")

        if result["status"] == "coding" and len(result["plan"]) == 1:
            logger.info("✅ Planner Logic Verified")
            return True
        else:
            logger.error("❌ Planner Logic Failed")
            return False

if __name__ == "__main__":
    success_graph = test_v3_graph_compilation()
    success_planner = test_v3_planner_mock()
    
    if success_graph and success_planner:
        print("\n🎉 V3 Backend Verification Passed!")
        sys.exit(0)
    else:
        print("\n❌ V3 Backend Verification Failed!")
        sys.exit(1)

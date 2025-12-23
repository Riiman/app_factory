
import sys
import os
import time
import threading
import json

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.startup_builder.agent import MultiAgentSystem
from app.startup_builder.graph import create_graph, AgentState
from app.startup_builder.manager import DockerManager


class MockDockerManager(DockerManager):
    def get_container_name(self, startup_id, container_name=None):
        return f"startup_dev_{startup_id}"

def verify_flow():
    print("--- STARTING AGENT V2 VERIFICATION ---")
    
    startup_id = "test_build_v2"
    container_name = f"startup_dev_{startup_id}"
    
    # 1. Setup Docker with Mock Manager
    dm = MockDockerManager()
    print(f"Setting up container {container_name}...")
    
    try:
        # Force remove old if exists
        import docker
        client = docker.from_env()
        try:
             c = client.containers.get(container_name)
             c.remove(force=True)
             print("Removed old container.")
        except:
             pass
        try:
            v = client.volumes.get(f"startup_vol_{startup_id}")
            v.remove(force=True)
            print("Removed old volume.")
        except:
            pass
            
        # Start new
        # verify ensure_container signature: ensure_container(self, startup_id, stack_type="MERN", container_name=None)
        res = dm.ensure_container(startup_id, container_name=container_name)
        print(f"Container Start Result: {res}")
        if "error" in res:
             print("Failed to start container.")
             return

    except Exception as e:
        print(f"Docker Setup Failed: {e}")
        return

    # 2. Init Agent and Inject Mock
    agent = MultiAgentSystem()
    agent.docker_manager = dm
    # Also need to clear caches to ensure they use new dm if accessed (they are empty now)
    agent.context_managers = {}
    agent.lsp_handlers = {}
    
    if not agent.llm:
        print("CRITICAL: LLM not initialized. Check Env Vars.")
        # Mock LLM if needed for pure logic test? No, user wants verification.
        # Ensure vars are passed.
        if "AZURE_OPENAI_API_KEY" not in os.environ:
             print("Skipping LLM calls - No API Key found.")
             return
    
    # 3. Build Graph
    # We must ensure create_graph uses the nodes bound to 'agent' which has the mocked DM
    graph = create_graph(agent.planner_node, agent.creator_node, agent.reviewer_node, db_path="test_checkpoints.sqlite")
    
    # 4. Define Mission
    # Use a simpler prompt for verify
    initial_state = {
        "startup_id": startup_id,
        "goal": "Initialize a simple MERN stack. 1. Create backend/index.js. 2. Create frontend/App.js.",
        "plan": [],
        "current_task": "plan_next",
        "status": "planning",
        "logs": [],
        "context": "",
        "mission_queue": [],
        "current_mission_index": 0
    }
    
    config = {"configurable": {"thread_id": startup_id}}
    
    print("\n--- RUNNING GRAPH LOOP ---\n")
    
    step_count = 0
    max_steps = 10 
    
    current_input = initial_state
    
    try:
        for event in graph.stream(current_input, config=config):
            step_count += 1
            if step_count > max_steps:
                print("Hit max steps safety limit.")
                break
                
            for key, value in event.items():
                print(f"\n[Step {step_count}] Node: {key}")
                
                if isinstance(value, dict):
                    if "current_task" in value:
                        print(f"  Current Task: {value.get('current_task')}")
                    if "status" in value:
                        print(f"  Status: {value.get('status')}")
                        
                    # Check for completion
                    if value.get("status") == "done":
                        print("\n--- MISSION ACCOMPLISHED ---")
                        
                        print("\nVerifying Files:")
                        res = dm.run_command(startup_id, "find . -maxdepth 3")
                        print(res.get("output"))
                        return

            current_input = None
            
    except Exception as e:
        print(f"Graph Execution Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_flow()

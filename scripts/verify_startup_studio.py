import os
import sys
import json
import time
from unittest.mock import MagicMock

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

# Import the real DockerManager to wrap it
try:
    from app.startup_builder.manager import DockerManager as RealDockerManager
except ImportError:
    # Fallback if run from scripts dir
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from app.startup_builder.manager import DockerManager as RealDockerManager

class TestDockerManager:
    def __init__(self):
        self.real_manager = RealDockerManager()
        self.container_name = "startup_dev_1"

    def run_command(self, startup_id, command, detach=False):
        print(f"[MockDM] run_command: {command}")
        return self.real_manager.run_command(startup_id, command, container_name=self.container_name, detach=detach)

    def read_file(self, startup_id, path):
        # print(f"[MockDM] read_file: {path}")
        return self.real_manager.read_file(startup_id, path, container_name=self.container_name)

    def write_file(self, startup_id, path, content):
        print(f"[MockDM] write_file: {path} ({len(content)} bytes)")
        return self.real_manager.write_file(startup_id, path, content, container_name=self.container_name)
    
    def list_files(self, startup_id, path="."):
        return self.real_manager.list_files(startup_id, path, container_name=self.container_name)

    def ensure_container(self, startup_id, stack_type="MERN"):
        return self.real_manager.ensure_container(startup_id, stack_type, container_name=self.container_name)

    def start_server(self, startup_id):
        return self.real_manager.start_server(startup_id, container_name=self.container_name)

    def stop_server(self, startup_id):
        return self.real_manager.stop_server(startup_id, container_name=self.container_name)
        
    def copy_from_container(self, startup_id, src, dest):
        return self.real_manager.copy_from_container(startup_id, src, dest, container_name=self.container_name)

# Monkeypatch agent.py
import app.startup_builder.agent as agent_module
agent_module.DockerManager = TestDockerManager

from app.startup_builder.agent import MultiAgentSystem
from app.startup_builder.graph import create_graph

def run_scenario(scenario_name, goal, startup_id="1"):
    print(f"\n{'='*50}")
    print(f"Running Scenario: {scenario_name}")
    print(f"Goal: {goal}")
    print(f"{'='*50}\n")

    agent = MultiAgentSystem()
    
    # Create graph with nodes
    graph = create_graph(
        agent.architect_node,
        agent.spec_approval_node,
        agent.task_manager_node,
        agent.reasoning_node,
        agent.planner_node,
        agent.developer_node,
        agent.executor_node,
        agent.reviewer_node,
        agent.debugger_node,
        agent.strategist_node,
        agent.overseer_node,
        agent.tester_node,
        agent.test_gen_node,
        db_path=":memory:" # Use in-memory DB for checkpointing to avoid polluting real DB
    )

    initial_state = {
        "startup_id": startup_id,
        "goal": goal,
        "context": "",
        "plan": [],
        "current_step_index": 0,
        "current_step": {},
        "code_changes": {},
        "error_history": [],
        "logs": [],
        "status": "start",
        "total_tasks": 0,
        "completed_tasks": 0
    }

    config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 50}
    
    current_input = initial_state
    
    try:
        # We need to loop manually to handle interrupts (like spec approval)
        # But graph.stream handles execution until interrupt.
        
        # Step 1: Run until interrupt or finish
        print("--- Starting Execution ---")
        
        # We'll use a simple loop to handle potential interrupts
        while True:
            events = graph.stream(current_input, config=config)
            
            for event in events:
                for key, value in event.items():
                    if key == "__interrupt__":
                         print(f"--- Interrupted ---")
                         continue
                    
                    # Print logs if any
                    if isinstance(value, dict) and "logs" in value:
                        new_logs = value["logs"]
                        if new_logs:
                            print(f"[{key.upper()}] {new_logs[-1]}")
                    
                    # Check for final status
                    if isinstance(value, dict) and value.get("status") == "qa_passed":
                        print("\n*** SCENARIO PASSED ***")
                        return True
                    
                    if isinstance(value, dict) and value.get("status") == "failed":
                         print("\n*** SCENARIO FAILED ***")
                         return False

            # Check state after stream ends (it might have paused)
            snapshot = graph.get_state(config)
            if not snapshot.next:
                print("--- Graph Finished (No next step) ---")
                break
            
            # If we are here, it means we were interrupted (e.g. waiting for approval)
            # Check what we are waiting for
            print("--- Waiting for Approval/Interaction ---")
            
            # Simulate Approval
            print(">>> Simulating User Approval...")
            current_input = None # Resume with no new input, or state update
            
            # We need to update state to signal approval if it was spec approval
            # The spec_approval_node just returns {"status": "planning"} but it is an interrupt_before node.
            # So we just resume.
            # But wait, routes.py does `initial_state = {"interaction_completed": True}` for approval.
            # Let's try that.
            
            # For spec approval, we just need to continue.
            # For interactive commands, we might need interaction_completed.
            
            # Let's just resume.
            current_input = None
            
            # If we are stuck in a loop of interrupts without progress, break
            # (Simple safeguard)
            # time.sleep(1) 

    except Exception as e:
        print(f"Scenario Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    # Ensure we are in the right directory or can find modules
    # Already handled by sys.path
    
    # Scenario 1: Hello World
    success1 = run_scenario(
        "Simple Feature Addition", 
        "Add a GET endpoint '/api/hello' to the backend that returns {'message': 'Hello World'}. The backend is likely in 'backend/server.js' or 'app.py'."
    )
    
    if not success1:
        print("Scenario 1 Failed. Proceeding to next scenario...")
        # sys.exit(1)

    # Scenario 2: Error Recovery
    # We will manually introduce an error first? 
    # Or ask the agent to do something that might fail?
    # Let's ask it to modify the file with a syntax error, then ask it to fix it?
    # No, the agent tries to write correct code.
    # We can use the 'Debugger' node test.
    # Let's try to ask it to "Add a function that divides by zero" or something?
    # Or better: "Refactor the hello endpoint to use a non-existent library 'xyz_lib'."
    
    success2 = run_scenario(
        "Error Recovery",
        "Modify the '/api/hello' endpoint to use 'import non_existent_lib' and print 'non_existent_lib.version'. This should fail. Then fix it by removing the library usage."
    )
    
    # Scenario 3: Complex Project
    success3 = run_scenario(
        "Complex Project Generation",
        "Create a simple In-Memory Todo List feature. 1. Create a Todo model/class. 2. Add GET /api/todos and POST /api/todos endpoints. 3. Ensure it works."
    )

    print("\n\nAll Scenarios Completed.")

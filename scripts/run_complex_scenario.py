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

    config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 100} # Increased recursion limit for complex tasks
    
    current_input = initial_state
    
    try:
        print("--- Starting Execution ---")
        
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
            print("--- Waiting for Approval/Interaction ---")
            
            # Simulate Approval
            print(">>> Simulating User Approval...")
            current_input = None # Resume with no new input, or state update
            
            # Simulate interaction completed if needed (though spec approval usually just needs resume)
            # But let's check if we are in a state that needs it.
            # For now, just resume.
            
    except Exception as e:
        print(f"Scenario Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    # Scenario: Complex Project
    success = run_scenario(
        "Complex Project Generation",
        "Create a simple In-Memory Todo List feature. 1. Create a Todo model/class. 2. Add GET /api/todos and POST /api/todos endpoints. 3. Ensure it works."
    )

    if success:
        print("\nComplex Scenario Verification Successful!")
        sys.exit(0)
    else:
        print("\nComplex Scenario Verification Failed!")
        sys.exit(1)

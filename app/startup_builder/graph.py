from typing import TypedDict, List, Annotated, Union
import operator
import sqlite3
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from enum import Enum

class AgentStateEnum(str, Enum):
    BOOTSTRAP = "bootstrap"
    DIAGNOSE = "diagnose"
    TEST_GEN = "test_gen"
    DEVELOP = "develop"
    VERIFY = "verify"
    PLANNING = "planning"
    CODING = "coding"
    REVIEWING = "reviewing"
    DONE = "done"
    FAILED = "failed"
    WAITING_APPROVAL = "waiting_approval"

class AgentState(TypedDict):
    startup_id: str
    goal: str
    context: str
    plan: List[dict]
    current_step_index: int
    current_step: dict
    code_changes: dict
    error_history: List[str]
    logs: List[str]
    task_queue: List[str] # High-level tasks from Task Manager
    current_task: str # The task currently being executed
    total_tasks: int # Total number of tasks
    completed_tasks: int # Number of completed tasks
    mission_queue: List[dict] # Queue of missions: [{"id": 1, "goal": "..."}]
    current_mission_index: int # Current mission index in the queue
    status: str # "planning", "coding", "reviewing", "done", "failed", "waiting_approval"
    running_processes: List[dict] # Tracks background processes: [{"pid": "123", "command": "npm start"}]
    last_result: dict # Output from the last execution step


    
# --- Routing Logic ---

def overseer_route(state):
    status = state.get("status", "start")
    error_category = state.get("error_category", "UNKNOWN")
    
    if status == "verify_mission":
        return "mission_verifier"
    elif status == "mission_complete":
        # Overseer will assume control next to switch mission
        # Wait, if mission_complete, overseer needs to run again to switch?
        # Graph edges: mission_verifier -> overseer.
        # So overseer_route doesn't need to handle mission_complete, 
        # because mission_verifier routes to overseer directly.
        pass
        
    elif status == "qa_passed":
        # If task passed, check if all tasks done?
        # Overseer logic handles this. If tasks remain, it continues.
        # If no tasks, it should Verify Mission.
        # This decision happens inside Overseer Node.
        # Overseer Node will set status="verify_mission".
        # So here we just need to route verify_mission.
        pass

    elif status == "start" or status == "planning_needed":
        return "architect"
    elif status == "qa_failed":
        # Check for Loop
        if len(state.get("error_history", [])) > 5:
            return "strategist"

        if error_category == "INFRASTRUCTURE":
            return "architect" # Re-plan environment
        elif error_category == "LOGIC_SYNTAX":
            return "developer" # Fix code
        elif error_category == "MISSING_IMPLEMENTATION":
            return "developer" # Implement missing feature
        return "architect" # Default fallback
        
    elif status == "plan_ready" or status == "waiting_approval":
        return "test_gen"
    elif status == "execution_done":
        return "tester"
    elif status == "qa_passed":
        return END # Wait, this is existing logic? 
        # If QA passed, Overseer node runs.
        # If Overseer sets status=verify_mission, it re-routes.
        # But if the graph stops at END, how does it loop?
        # Ah, 'tester' -> 'overseer'. 
        # So Overseer runs. It sets status.
        # Then overseer_route runs.
        # So if Overseer sets "verify_mission", we return "mission_verifier".
        pass
        
    elif status == AgentStateEnum.TEST_GEN:
        return "test_gen"
    elif status == AgentStateEnum.VERIFY:
        return "tester"
    return END

def architect_route(state):
    if state.get("status") == "waiting_approval":
        return "spec_approval"
    return "task_manager"

def developer_route(state):
    if state["status"] == "planning_needed":
        return "reasoning" # Go to planning
    elif state["status"] == "coding":
        return "executor"
    elif state["status"] == "execution_done":
        return "overseer" # Go to QA
    return "overseer"

def reviewer_route(state):
    if state["status"] == "failed":
        error_category = state.get("error_category", "UNKNOWN")
        
        # Recursive Debugging: Go to Debugger
        if len(state.get("error_history", [])) > 5: # Limit recursion depth
            return "strategist" # Loop detected -> Strategist
        
        if error_category == "INFRASTRUCTURE":
            return "architect" # Escalate to Architect for infra issues
        
        return "debugger" # Default to debugger for logic/syntax
        
    elif state["status"] == "done":
        if state["current_step_index"] < len(state["plan"]):
            return "next_step"
        return "complete"
    return "complete"

def debugger_route(state):
    status = state.get("status")
    if status == "coding":
        return "executor" # Apply Fix
    elif status == "planning_needed":
        return "developer" # Schedule Diagnosis
    return "executor"

def strategist_route(state):
    action = state.get("strategy_action", "ABORT")
    if action == "REPLAN":
        return "planner"
    elif action == "PIVOT" or action == "SEARCH":
        return "reasoning"
    elif action == "SKIP":
        return "developer" # Skip step, go back to dev
    return "failed"

def create_graph(architect_node, spec_approval_node, task_manager_node, reasoning_node, planner_node, developer_node, executor_node, reviewer_node, debugger_node, strategist_node, mission_verifier, overseer_node, tester_node, test_gen_node, db_path="checkpoints.sqlite"):
    # Initialize Checkpointer
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    workflow = StateGraph(AgentState)

    # --- Nodes ---
    workflow.add_node("overseer", overseer_node)
    
    # Team A: Planning
    workflow.add_node("architect", architect_node)
    workflow.add_node("spec_approval", spec_approval_node)
    workflow.add_node("task_manager", task_manager_node)
    workflow.add_node("reasoning", reasoning_node)
    workflow.add_node("planner", planner_node)
    
    # Team B: Execution
    workflow.add_node("developer", developer_node)
    workflow.add_node("executor", executor_node)
    workflow.add_node("reviewer", reviewer_node)
    workflow.add_node("debugger", debugger_node)
    workflow.add_node("strategist", strategist_node) # New Node

    # Team C: QA
    workflow.add_node("tester", tester_node)
    workflow.add_node("test_gen", test_gen_node)
    workflow.add_node("mission_verifier", mission_verifier) # New Node (Team QA)

    # --- Edges ---
    
    # Entry Point
    workflow.set_entry_point("overseer")
    
    workflow.add_conditional_edges(
        "overseer",
        overseer_route,
        {
            "architect": "architect",
            "developer": "developer",
            "strategist": "strategist",
            "tester": "tester",
            "test_gen": "test_gen",
            "mission_verifier": "mission_verifier",
            END: END
        }
    )

    workflow.add_conditional_edges(
        "architect",
        architect_route,
        {
            "spec_approval": "spec_approval",
            "task_manager": "task_manager"
        }
    )
    
    workflow.add_edge("spec_approval", "task_manager")
    workflow.add_edge("task_manager", "developer") # Direct to Developer to pick first task
    
    workflow.add_edge("reasoning", "planner")
    workflow.add_edge("planner", "overseer") 

    # Execution Loop
    workflow.add_conditional_edges(
        "developer",
        developer_route,
        {
            "reasoning": "reasoning",
            "executor": "executor",
            "overseer": "overseer"
        }
    )

    workflow.add_edge("executor", "reviewer")
    
    workflow.add_conditional_edges(
        "reviewer",
        reviewer_route,
        {
            "debugger": "debugger", 
            "strategist": "strategist", # New Route
            "architect": "architect", # Escalate Infra
            "next_step": "developer", # Next step
            "complete": "developer", # Task done, go back to Developer to pick next task
            "failed": END 
        }
    )
    
    # Debugger Routing
    workflow.add_conditional_edges(
        "debugger",
        debugger_route,
        {
            "executor": "executor",
            "developer": "developer"
        }
    )
    
    # Strategist Routing
    workflow.add_conditional_edges(
        "strategist",
        strategist_route,
        {
            "planner": "planner",
            "reasoning": "reasoning",
            "developer": "developer",
            "failed": END
        }
    )

    # QA Loop
    workflow.add_edge("tester", "overseer")
    workflow.add_edge("test_gen", "developer")
    
    # Mission Verification Loop
    workflow.add_edge("mission_verifier", "overseer")

    # Compile
    return workflow.compile(checkpointer=checkpointer, interrupt_before=["executor", "spec_approval"])

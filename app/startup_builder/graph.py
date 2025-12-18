from typing import TypedDict, List, Annotated, Union
import operator
import sqlite3
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from enum import Enum

# --- State Definitions ---

class AgentState(TypedDict):
    startup_id: str
    goal: str # The high-level Mission
    
    # Plan & Execution
    plan: List[dict] # The master plan from plan.json
    current_task: str # The specific task being worked on
    status: str # "planning", "coding", "approved", "failed"
    
    # Context & Logs
    logs: List[str] # Append-only log of actions
    
    # Legacy/Optional (Keep for safety or future use)
    context: str
    current_step_index: int
    current_step: dict
    code_changes: dict
    error_history: List[str]
    task_queue: List[str]
    total_tasks: int
    completed_tasks: int
    mission_queue: List[dict]
    current_mission_index: int
    running_processes: List[dict]
    last_result: dict


# --- Routing Logic (V2) ---

def plan_route(state):
    """
    Planner decides where to go next.
    - coding: Go to Creator
    - done: End
    """
    status = state.get("status")
    if status == "coding":
        return "creator"
    elif status == "done":
        return END
    return END

def review_route(state):
    """
    Reviewer decides loop.
    - approved: Back to Planner (for next task)
    - failed: Back to Creator (to fix)
    """
    status = state.get("status")
    if status == "approved":
        return "planner"
    return "creator" # Loop back for fix

# --- Graph Construction ---

def create_graph(planner_node, creator_node, reviewer_node, db_path="checkpoints.sqlite"):
    """
    Builds the V2 Agent Graph.
    Topology: Planner <-> Creator <-> Reviewer
    """
    # Initialize Checkpointer
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    workflow = StateGraph(AgentState)

    # --- Nodes ---
    workflow.add_node("planner", planner_node)
    workflow.add_node("creator", creator_node)
    workflow.add_node("reviewer", reviewer_node)

    # --- Edges ---
    # Start at Planner
    workflow.set_entry_point("planner")

    # Planner -> (decision)
    workflow.add_conditional_edges(
        "planner",
        plan_route,
        {
            "creator": "creator",
            END: END
        }
    )

    # Creator -> Reviewer (Always review after coding attempt)
    workflow.add_edge("creator", "reviewer")

    # Reviewer -> (decision)
    workflow.add_conditional_edges(
        "reviewer",
        review_route,
        {
            "planner": "planner", # Success, get next task
            "creator": "creator"  # Reject, fix it
        }
    )

    # Compile with checkpointer and interrupt support
    # We interrupt before 'creator' to let user see the Plan? 
    # Or before 'reviewer' to let user review code?
    # Given V2 is autonomous "Sidecar", maybe interrupt before execution if sensitive?
    # For now, let's interrupt before 'creator' (Plan Approval) and 'reviewer' (Code Approval) if desired.
    # The user manual approval flow usually implies interrupting before 'creator' to approve the plan step.
    return workflow.compile(checkpointer=checkpointer, interrupt_before=["creator"])

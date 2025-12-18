import logging
from typing import TypedDict, List, Annotated, Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
import operator

# Internal imports (to be implemented)
# from .agents.planner import planner_node
# from .agents.developer import developer_node
# from .agents.qa import qa_node

logger = logging.getLogger(__name__)

# --- State Definition (V3) ---
# We keep it simple but structured.
class V3AgentState(TypedDict):
    startup_id: str
    mission: str         # High-level goal
    
    # The Brain
    plan: List[Dict]     # The Master Plan (Steps)
    current_task: Dict   # The active step
    
    # The Context
    status: str          # planning, coding, verification, done, failed
    logs: List[str]      # User-facing logs
    thoughts: List[str]  # Internal thoughts (for Glass Box UI)
    
    # QA
    qa_feedback: str     # Errors from testing

# --- Routing Logic ---
def orchestrator_router(state: V3AgentState):
    status = state.get("status", "planning")
    
    if status == "planning":
        return "planner"
    elif status == "coding":
        return "developer"
    elif status == "verification":
        return "qa"
    elif status == "done":
        return END
    elif status == "failed":
        # Maybe go back to planner to fix?
        return "planner"
    
    return "planner" # Default

# --- Agents ---
from .agents.planner import V3Planner
from .agents.developer import V3Developer
from .agents.qa import V3QA

# --- Graph Contruction ---
def create_v3_graph(db_path="checkpoints.sqlite", log_callback=None):
    """
    Builds the V3 Orchestrator Graph.
    Topology: Orchestrator (Router) -> Planner | Developer | QA
    """
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    # Initialize Agents with Callback
    planner_agent = V3Planner(log_callback=log_callback)
    developer_agent = V3Developer(log_callback=log_callback)
    qa_agent = V3QA() # QA doesn't use copilot yet

    workflow = StateGraph(V3AgentState)

    # Nodes
    workflow.add_node("planner", planner_agent.plan_node)
    workflow.add_node("developer", developer_agent.developer_node)
    workflow.add_node("qa", qa_agent.qa_node)

    # Entry Point via Router
    workflow.set_conditional_entry_point(
        orchestrator_router,
        {
            "planner": "planner",
            "developer": "developer",
            "qa": "qa",
            END: END
        }
    )

    # Edges - Return to Router after each step to re-evaluate state
    workflow.add_conditional_edges("planner", orchestrator_router)
    workflow.add_conditional_edges("developer", orchestrator_router)
    workflow.add_conditional_edges("qa", orchestrator_router)

    return workflow.compile(checkpointer=checkpointer)

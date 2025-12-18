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
    startup_id: str
    missions: List[Dict] # [{id, title, status, description}]
    tech_stack: str      # Global tech stack decision
    
    # Internal routing
    current_mission_id: int # pointer to active mission
    
    # The Brain
    plan: List[Dict]     # The Master Plan (Steps)
    current_task: Dict   # The active step
    
    # The Context
    status: str          # planning, coding, verification, done, failed
    logs: List[str]      # User-facing logs
    thoughts: List[str]  # Internal thoughts (for Glass Box UI)
    
    # Context
    local_context: str   # RAG-retrieved context for current task
    global_context: str  # Summarized history of the run
    codebase_analysis: str # Analyzer result (file tree, key configs)
    
    # QA
    qa_feedback: str     # Errors from testing
    product_context: Dict # passed from route for initialization

# --- Routing Logic ---
def orchestrator_router(state: V3AgentState):
    status = state.get("status", "init") # Default start is init now
    
    if status == "init":
        return "initializer"
        
    # Router Logic: Pick Next Mission if in "routed" or "done" state from previous mission
    if status in ["routed", "done_mission"]:
        missions = state.get("missions", [])
        next_mission = None
        for m in missions:
            if m["status"] == "pending":
                next_mission = m
                break
        
        if next_mission:
            # We found work!
            # We need to implicitly update state to set current_mission_id? 
            # Router shouldn't modify state, just decide.
            # But we can't modify state here.
            # So, we return a "mission_selector" node? Or we just assume Planner handles it?
            # Better: Have a dedicated "mission_selector" node or logic.
            # For simplicity, let's route to "analyzer" and let Analyzer or Planner pick it up via active_mission logic?
            # Actually, Analyzer just analyzes code.
            # Planner needs to know WHICH mission.
            # Let's add a small 'mission_selector' node to explicit update state.
            return "mission_selector"
        else:
            return END

    if status == "planning":
        return "planner"
    elif status == "analyzing":
        return "analyzer"
    elif status == "coding":
        return "developer"
    elif status == "verification":
        return "qa"
    elif status == "done":
        return END
    elif status == "failed":
    elif status == "failed":
        return END
    
    return "mission_selector" # Default fallback

# --- Agents ---
from .agents.planner import V3Planner
from .agents.developer import V3Developer
from .agents.qa import V3QA
from .agents.analyzer import V3Analyzer
from .agents.initializer import V3Initializer

# --- Graph Contruction ---
def create_v3_graph(db_path="checkpoints.sqlite", log_callback=None):
    """
    Builds the V3 Orchestrator Graph.
    Topology: Initializer -> Selector -> Analyzer -> Planner -> Developer -> Loop
    """
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    # Initialize Agents with Callback
    planner_agent = V3Planner(log_callback=log_callback)
    developer_agent = V3Developer(log_callback=log_callback)
    qa_agent = V3QA() # QA doesn't use copilot yet
    analyzer_agent = V3Analyzer()
    initializer_agent = V3Initializer(log_callback=log_callback)

    workflow = StateGraph(V3AgentState)

    # Nodes
    workflow.add_node("planner", planner_agent.plan_node)
    workflow.add_node("developer", developer_agent.developer_node)
    workflow.add_node("qa", qa_agent.qa_node)
    workflow.add_node("analyzer", analyzer_agent.analyze_node)
    workflow.add_node("initializer", initializer_agent.initialize_node)
    
    def mission_selector_node(state):
        # Logic to pick next mission
        missions = state.get("missions", [])
        for m in missions:
            if m["status"] == "pending":
                return {"current_mission_id": m["id"], "status": "analyzing"} # Start analysis for this mission
        return {"status": "done"}
        
    workflow.add_node("mission_selector", mission_selector_node)

    # Entry Point via Router
    workflow.set_conditional_entry_point(
        orchestrator_router,
        {
            "initializer": "initializer",
            "mission_selector": "mission_selector",
            "planner": "planner",
            "analyzer": "analyzer",
            "developer": "developer",
            "qa": "qa",
            END: END
        }
    )

    # Edges - Return to Router after each step to re-evaluate state
    workflow.add_conditional_edges("planner", orchestrator_router)
    workflow.add_conditional_edges("analyzer", orchestrator_router)
    workflow.add_conditional_edges("developer", orchestrator_router)
    workflow.add_conditional_edges("qa", orchestrator_router)
    workflow.add_conditional_edges("initializer", orchestrator_router)
    workflow.add_conditional_edges("mission_selector", orchestrator_router)


    return workflow.compile(checkpointer=checkpointer)

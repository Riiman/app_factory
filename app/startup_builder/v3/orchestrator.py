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
# --- State Definition (V3) ---
# We keep it simple but structured.
class V3AgentState(TypedDict):
    startup_id: str
    current_mission: Dict # The ACTIVE mission object (title, desc, status)
    tech_stack: str      # Global tech stack decision
    
    # Internal routing
    # removed: current_mission_id (implied by current_mission['id'])
    
    # The Brain
    plan: List[Dict]     # The Master Plan (Steps)
    current_task: Dict   # The active step
    failed_task: Dict    # Context for repair loops
    
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
    
    logger.info(f"--- ROUTER: Status={status} ---")
    
    if status == "init":
        return "initializer"
        
    # Router Logic: Pick Next Mission if in "routed" or "done_mission" state from previous mission
    if status in ["routed", "done_mission"]:
        # Logic moved to mission_selector node to keep router pure
        return "mission_selector"
    
    if status == "architecting":
        return "architect"
    elif status == "coding":
        return "developer"
    elif status == "fix_required":
        return "architect"
    elif status == "verification":
        return "qa"

    elif status == "done":
        return END
    elif status == "failed":
        return END
    
    return "mission_selector" # Default fallback

# --- Agents ---
from .agents.developer import V3Developer
from .agents.qa import V3QA
from .agents.initializer import V3Initializer
from .agents.architect import V3Architect

# --- Graph Contruction ---
def create_v3_graph(db_path="checkpoints.sqlite", log_callback=None):
    """
    Builds the V3 Orchestrator Graph.
    Topology: Initializer -> Selector -> Architect -> Developer -> Loop
    """
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    # Initialize Agents with Callback
    architect_agent = V3Architect(log_callback=log_callback)
    developer_agent = V3Developer(log_callback=log_callback)
    qa_agent = V3QA() # QA doesn't use copilot yet
    initializer_agent = V3Initializer(log_callback=log_callback)

    workflow = StateGraph(V3AgentState)

    # Nodes
    workflow.add_node("architect", architect_agent.architect_node)
    workflow.add_node("developer", developer_agent.developer_node)
    workflow.add_node("qa", qa_agent.qa_node)
    workflow.add_node("initializer", initializer_agent.initialize_node)

    
    def mission_selector_node(state):
        try:
            from ..manager import DockerManager
            import json
            import datetime
            
            def log_debug(msg):
                with open("/home/ubuntu/app_factory/agent_debug.log", "a") as f:
                     f.write(f"[{datetime.datetime.now().isoformat()}] {msg}\\n")
            
            startup_id = state.get("startup_id")
            manager = DockerManager()
            
            # Read missions from FILE
            res = manager.read_file(startup_id, "artifacts/missions.json")
            if res.get("error"):
                log_debug("SELECTOR: No missions file found.")
                return {"status": "done", "logs": ["Mission Selector: No missions file found."]}
                
            data = json.loads(res["content"])
            missions = data.get("missions", [])
            
            for m in missions:
                if m["status"] == "pending":
                    # Found one!
                    log_debug(f"SELECTOR: Selected Mission {m['id']} '{m['title']}'")
                    return {
                        "current_mission": m, 
                        "status": "architecting", # Start architect (Merged Analyze+Plan)
                        "logs": [f"Mission Selector: Selected '{m['title']}'"]
                    }
                    
            # If no pending missions
            log_debug("SELECTOR: All missions completed.")
            return {"status": "done", "logs": ["Mission Selector: All missions completed."]}
            
        except Exception as e:
            logger.error(f"Mission Selector Error: {e}")
            return {"status": "failed", "logs": [f"Mission Selector Error: {e}"]}

    workflow.add_node("mission_selector", mission_selector_node)

    # Entry Point via Router
    workflow.set_conditional_entry_point(
        orchestrator_router,
        {
            "initializer": "initializer",
            "mission_selector": "mission_selector",
            "architect": "architect",
            "developer": "developer",
            "qa": "qa",
            END: END
        }
    )

    # Edges - Return to Router after each step to re-evaluate state
    # Edges - Return to Router after each step to re-evaluate state
    workflow.add_conditional_edges("architect", orchestrator_router)
    workflow.add_conditional_edges("developer", orchestrator_router)
    workflow.add_conditional_edges("qa", orchestrator_router)
    workflow.add_conditional_edges("initializer", orchestrator_router)
    workflow.add_conditional_edges("mission_selector", orchestrator_router)




    return workflow.compile(checkpointer=checkpointer)

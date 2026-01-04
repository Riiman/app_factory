import logging
from typing import TypedDict, List, Annotated, Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
import operator

logger = logging.getLogger(__name__)

# --- State Definition (V3) ---
# We keep it simple but structured.
class V3AgentState(TypedDict):
    startup_id: str
    current_mission: Dict # The ACTIVE mission object (title, desc, status)
    tech_stack: str      # Global tech stack decision
    
    # Internal routing
    
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
    qa_feedback: str     # Errors from testing
    product_context: Dict # passed from route for initialization
    waiting_on: str      # Job ID of async process we are waiting for
    missions: List[Dict] # FULL MISSION QUEUE (Required for UI)
    
    # --- V3.1 PERSISTENT MEMORY ---
    mission_scratchpad: List[str] # Critical Constraints & Facts (Persistent across tasks)

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


    elif status == "done":
        return END
    elif status == "failed":
        return END
    
    return "mission_selector" # Default fallback

# --- Agents ---
from .agents.developer import V3Developer

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

    initializer_agent = V3Initializer(log_callback=log_callback)

    workflow = StateGraph(V3AgentState)

    # Nodes
    workflow.add_node("architect", architect_agent.architect_node)
    workflow.add_node("developer", developer_agent.developer_node)

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
            
            # 1. SYNC: Update SQL Feature Statuses based on JSON
            try:
                from app.models import Feature
                from app.extensions import db
                
                # Logic: Aggregate statuses per Feature ID first (Fix for "Always Pending" bug)
                feature_map = {} # fid -> list of mission_statuses
                
                for m in missions:
                    fid = m.get("feature_id")
                    status = m.get("status")
                    if fid and status:
                        if fid not in feature_map:
                            feature_map[fid] = []
                        feature_map[fid].append(status)
                
                dirty = False
                for fid, statuses in feature_map.items():
                    target_db_status = "pending"
                    
                    # Rule 1: If ALL completed -> Completed
                    if all(s == "completed" for s in statuses):
                        target_db_status = "completed"
                    # Rule 2: If ANY in progress/active -> In Progress
                    elif any(s in ["in_progress", "coding", "verification", "architecting", "fix_required"] for s in statuses):
                        target_db_status = "in_progress"
                    # Rule 3: Else (some completed, some pending, but none active) -> In Progress 
                    # (Because if you finished one mission, you technically started the feature)
                    elif any(s == "completed" for s in statuses):
                        target_db_status = "in_progress"
                        
                    f = Feature.query.get(fid)
                    if f and f.status != target_db_status:
                        f.status = target_db_status
                        dirty = True
                        log_debug(f"SYNC: Updated Feature {f.name} ({fid}) to {target_db_status}")
                
                if dirty:
                    db.session.commit()
            except Exception as e:
                log_debug(f"SYNC Error: {e}")

            # 2. RESUME Priority: Check for any mission that is already started but not done
            resumable_statuses = ["in_progress", "architecting", "coding", "verification", "fix_required"]
            
            for m in missions:
                if m.get("status") in resumable_statuses:
                    log_debug(f"SELECTOR: Resuming Mission {m['id']} '{m['title']}' (Status: {m['status']})")
                    
                    # Map internal mission status to graph node
                    target_status = "architecting" # Default
                    if m['status'] == 'in_progress' or m['status'] == 'coding':
                        target_status = "coding"
                    elif m['status'] == 'fix_required':
                        target_status = "fix_required"
                    elif m['status'] == 'verification':
                        target_status = "coding"
                        
                    return {
                        "current_mission": m,
                        "status": target_status, 
                        "plan": m.get("tasks", []), # HYDRATE PLAN
                        "waiting_on": m.get("waiting_on"), # HYDRATE ASYNC STATE
                        "logs": [f"Mission Selector: Resuming '{m['title']}' (Phase: {target_status})"]
                    }

            # 2. NEXT Priority: Pick the first pending mission
            for m in missions:
                if m["status"] == "completed":
                    continue
                    
                if m["status"] == "pending":
                    # Found one!
                    log_debug(f"SELECTOR: Selected Mission {m['id']} '{m['title']}'")
                    return {
                        "missions": missions,
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

            END: END
        }
    )

    # Edges - Return to Router after each step to re-evaluate state
    # Edges - Return to Router after each step to re-evaluate state
    workflow.add_conditional_edges("architect", orchestrator_router)
    workflow.add_conditional_edges("developer", orchestrator_router)

    workflow.add_conditional_edges("initializer", orchestrator_router)
    workflow.add_conditional_edges("mission_selector", orchestrator_router)




    return workflow.compile(checkpointer=checkpointer)

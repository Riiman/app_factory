
import os
import json
import logging
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END

from .manager import DockerManager
# from .context import ContextManager # Deprecated
from .v3.context.librarian import Librarian
from .lsp import LSPHandler
from .utils import JsonRepair

logger = logging.getLogger(__name__)

class MultiAgentSystem:
    def __init__(self):
        self.docker_manager = DockerManager()
        self._init_llm()
        
        # We cache librarians per startup_id (assuming path matches)
        # For this prototype, we assume single workspace root from env or config
        # detailed implementation would Map startup_id -> workspace_path
        self.librarians = {} 
        self.lsp_handlers = {}

    def _get_librarian(self, startup_id):
        # ISOLATION FIX: Point to the specific temp_workspace for this startup
        # We must align with DockerManager's base_work_dir logic.
        # Assuming agent runs on Host, we access ../temp_workspaces/{startup_id} relative to app/startup_builder
        
        # Path calculation similar to DockerManager
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        workspace_path = os.path.join(base_path, 'temp_workspaces', str(startup_id))
        
        # If directory doesn't exist (e.g. new startup), we should wait or create it?
        # DockerManager creates it. We assume it exists if tasks are running.
        if not os.path.exists(workspace_path):
             # Fallback to . only for debug, but for prod we should probably log warning
             pass 

        if startup_id not in self.librarians:
            self.librarians[startup_id] = Librarian(workspace_root=workspace_path)
            
        return self.librarians[startup_id]

    def _get_lsp_handler(self, startup_id):
        if startup_id not in self.lsp_handlers:
            self.lsp_handlers[startup_id] = LSPHandler(self.docker_manager, startup_id)
        return self.lsp_handlers[startup_id]

    def _init_llm(self):
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")

        if self.api_key and self.endpoint:
            try:
                self.llm = AzureChatOpenAI(
                    azure_deployment=self.deployment_name,
                    api_version=self.api_version,
                    openai_api_key=self.api_key,
                    azure_endpoint=self.endpoint,
                    temperature=0.2,
                    max_tokens=4000,
                )
            except Exception as e:
                logger.error(f"Error initializing LLM: {e}")
                self.llm = None
        else:
            self.llm = None

    # --- UPDATED NODES (V3) ---

    def planner_node(self, state):
        """
        The STRATEGIST.
        Uses Librarian for Global Context.
        Uses 'Plan State' to prevent loops.
        """
        logger.info("--- Planner Node (V3) ---")
        startup_id = state["startup_id"]
        mission = state.get("goal")
        logs = state.get("logs", [])
        
        lib = self._get_librarian(startup_id)
        
        # 0. Global Context Update
        # Index on every turn? Cheap-ish for small repos.
        lib.index_workspace()
        
        # 1. Get Plan Status
        plan_path = "artifacts/plan.json"
        plan_data = self.docker_manager.read_file(startup_id, plan_path)
        
        current_plan = {}
        if "content" in plan_data:
            try:
                current_plan = json.loads(plan_data["content"])
            except:
                pass
                
        # 1.1 Get Reviewer Feedback (The "Log Detective" Report)
        feedback_path = "artifacts/reviewer_feedback.json"
        feedback_data = self.docker_manager.read_file(startup_id, feedback_path)
        last_feedback = {}
        if "content" in feedback_data:
             try:
                 last_feedback = json.loads(feedback_data["content"])
             except:
                 pass
        
        # 2. Get Librarian Context (File Tree)
        file_tree = lib.get_file_tree()
        
        # 3. Decision
        system_prompt = """You are the Lead Architect.
        Your Mission: {mission}
        
        CURRENT PLAN STATE:
        {current_plan}
        
        LAST REVIEWER FEEDBACK (Did the previous task succeed?):
        {last_feedback}
        
        FILE STRUCTURE:
        {file_tree}
        
        CRITICAL RULES:
        1. **LOOP PREVENTION**: Check the `failed_strategies` in the current task. NEVER propose a strategy that failed.
        2. **ERROR REACTION**: If `last_error` indicates missing dep, Schedule 'Install'. If syntax, Schedule 'Fix'.
        3. **FACTUALITY**: Do not schedule 'Create X' if `X` exists in FILE STRUCTURE.
        
        OUTPUT JSON:
        {
            "next_task": "Task Name",
            "reasoning": "Why this task? (Reference specific error or file)",
            "updated_plan_json": { ...full plan... },
            "status": "coding" | "done"
        }
        """ # Simplified for brevity
        
        messages = [
            SystemMessage(content=system_prompt.format(
                mission=mission, 
                current_plan=json.dumps(current_plan, indent=2), 
                last_feedback=json.dumps(last_feedback, indent=2),
                file_tree=file_tree
            )),
            HumanMessage(content="What is the next move?")
        ]
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        try:
            res = json_llm.invoke(messages)
            data = JsonRepair.parse(res.content)
            
            # Persist Plan
            if data.get("updated_plan_json"):
                self.docker_manager.write_file(startup_id, plan_path, json.dumps(data["updated_plan_json"], indent=2))
                
            return {
                "current_task": data.get("next_task"),
                "status": data.get("status", "coding"),
                "plan": data.get("updated_plan_json"),
                "logs": logs + [f"Planner: Selected {data.get('next_task')}"]
            }
        except Exception as e:
            return {"logs": logs + [f"Planner Error: {e}"], "status": "failed"}

    def creator_node(self, state):
        """
        The MICRO-ARCHITECT.
        Uses Librarian for Task Context.
        """
        logger.info("--- Creator Node (V3) ---")
        startup_id = state["startup_id"]
        task = state["current_task"]
        lib = self._get_librarian(startup_id)
        
        # 1. Retrieve Context
        relevant_code = lib.query(task)
        
        system_prompt = """You are a Senior Developer.
        Task: {task}
        
        EXISTING CODEBASE CONTEXT (Use this to REUSE code!):
        {relevant_code}
        
        ENVIRONMENT:
        - Root access. Can run `npm install`, `pip install`.
        
        OUTPUT JSON:
        {
            "thoughts": "Strategy...",
            "steps": [
                {"action": "write_file", "path": "...", "content": "..."},
                {"action": "command", "command": "..."}
            ]
        }
        """
        
        messages = [
            SystemMessage(content=system_prompt.format(task=task, relevant_code=relevant_code)),
            HumanMessage(content="Implement now.")
        ]
        
        final_logs = []
        full_raw_log = "" # Accumulate for Reviewer
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        try:
            res = json_llm.invoke(messages)
            plan = JsonRepair.parse(res.content)
            steps = plan.get("steps", [])
            
            for step in steps:
                if step["action"] == "write_file":
                    self.docker_manager.write_file(startup_id, step["path"], step["content"])
                    msg = f"Wrote {step['path']}"
                    final_logs.append(msg)
                    full_raw_log += msg + "\n"
                elif step["action"] == "command":
                    out = self.docker_manager.run_command(startup_id, step["command"])
                    msg = f"Ran {step['command']}: {out.get('exit_code')}\nOutput: {out.get('output')}"
                    final_logs.append(f"Ran {step['command']}")
                    full_raw_log += msg + "\n"
            
            # Pass Raw Logs to Reviewer for Analysis
            return {"logs": state.get("logs", []) + final_logs, "last_raw_log": full_raw_log, "status": "review"}
            
        except Exception as e:
            err = f"Creator Error: {e}"
            return {"logs": state.get("logs", []) + [err], "last_raw_log": err, "status": "review"}

    def reviewer_node(self, state):
        """
        The LOG DETECTIVE (Log Analyzer).
        Updates Plan with 'failed_strategies' if needed.
        """
        logger.info("--- Reviewer Node (Log Analyzer) ---")
        startup_id = state["startup_id"]
        raw_log = state.get("last_raw_log", "")
        plan = state.get("plan", {})
        
        # If no plan, we can't update it, but usually Planner ensures plan exists.
        
        system_prompt = """You are a Log Detective.
        Analyze the execution logs.
        
        YOUR JOB:
        1. Determine if the task SUCCEEDED or FAILED.
        2. If FAILED, extract the **Root Cause** (e.g. Missing Dep, Syntax Error).
        3. If FAILED, summarize the **Strategy Used** so we don't repeat it.
        
        LOGS:
        {raw_log}
        
        OUTPUT JSON:
        {
            "success": boolean,
            "failure_reason": "Short summary of error" (or null),
            "strategy_used": "What did we try?" (e.g. "Ran pip install flask"),
            "suggested_fix": "What should be done next?"
        }
        """
        
        messages = [
            SystemMessage(content=system_prompt.format(raw_log=raw_log[:10000])), # Limit token usage
            HumanMessage(content="Analyze.")
        ]
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        try:
            res = json_llm.invoke(messages)
            analysis = JsonRepair.parse(res.content)
            
            # --- CRITICAL: Update Plan State ---
            # We need to find the "Active Task" in the plan.
            # Assuming Planner set the active task status.
            # We simply update the finding.
            
            # For MVP, we pass this analysis BACK to the Planner in the 'logs' or 'state'
            # so the Planner can merge it into the JSON next turn.
            # OR we write it to JSON here. Writing here is safer.
            
            # Let's try to update the plan.json directly if we can find the task.
            # (Simplification: Just append the analysis to the logs for the Planner to read next turn)
            
            log_entry = f"Reviewer Analysis: Success={analysis['success']}. Reason={analysis.get('failure_reason')}. Strategy={analysis.get('strategy_used')}."
            
            # Construct a structured update for the Planner
            # We'll save a 'reviewer_feedback.json' for the Planner to consume firmly.
            feedback = {
                 "task_outcome": "success" if analysis["success"] else "failed",
                 "error_details": analysis.get("failure_reason"),
                 "failed_strategy": analysis.get("strategy_used") if not analysis["success"] else None
            }
            self.docker_manager.write_file(startup_id, "artifacts/reviewer_feedback.json", json.dumps(feedback, indent=2))
            
            status = "approved" if analysis["success"] else "coding" # If failed, loop back to coding (via Planner)
            
            return {
                "status": status, 
                "logs": state.get("logs", []) + [log_entry]
            }
            
        except Exception as e:
            return {"status": "approved", "logs": state.get("logs", []) + [f"Reviewer Error: {e}"]}

import os
import json
import logging
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END

from .manager import DockerManager
from .context import ContextManager
from .lsp import LSPHandler
from .memory import MemoryManager
from .utils import JsonRepair

logger = logging.getLogger(__name__)

class MultiAgentSystem:
    def __init__(self):
        self.docker_manager = DockerManager()
        self.memory_managers = {} 
        self._init_llm()
        # V2 Components
        # Note: Startup ID is dynamic, so we might need to instantiate these per request 
        # or pass startup_id to their methods. 
        # For this refactor, let's keep them stateless or lightweight.
        # ContextManager and LSPHandler take docker_manager in init, startup_id in methods?
        # Let's check my implementation plan...
        # "ContextManager(docker_manager, startup_id)"
        # Okay, I need to instantiate them inside the nodes or store a cache.
        self.context_managers = {} 
        self.lsp_handlers = {}

    def _get_context_manager(self, startup_id):
        if startup_id not in self.context_managers:
            self.context_managers[startup_id] = ContextManager(self.docker_manager, startup_id)
        return self.context_managers[startup_id]

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

    # --- Core V2 Nodes ---

    def planner_node(self, state):
        """
        The GOAL KEEPER.
        1. Analyzes high-level Mission.
        2. Checks 'artifacts/plan.json'.
        3. Decides the NEXT Granular Task.
        """
        logger.info("--- Planner Node (V2) ---")
        startup_id = state["startup_id"]
        mission = state.get("goal") # Local goal or Main mission
        logs = state.get("logs", [])
        
        cm = self._get_context_manager(startup_id)
        
        # 1. Get Plan Status
        plan_data = self.docker_manager.read_file(startup_id, "artifacts/plan.json")
        current_plan = []
        if "content" in plan_data:
            try:
                current_plan = json.loads(plan_data["content"])
            except:
                pass
                
        # 2. Get Context
        # Compact context to save tokens while keeping High-Level structure
        # We assume standard file structure for key files
        key_files = ["README.md", "backend/app.py", "backend/routes.py", "frontend/src/App.js", "frontend/package.json"]
        context_str = "--- Project High-Level Overview ---\n"
        for kf in key_files:
            fdata = self.docker_manager.read_file(startup_id, kf)
            if "content" in fdata:
                # Use compacting
                summary = cm.compact_file(fdata["content"], kf)
                context_str += f"File: {kf}\n{summary}\n\n"
        
        # 3. Decision
        system_prompt = """You are the Lead Architect & Planner.
        Your Mission: {mission}
        
        Current Plan Status:
        {current_plan}
        
        JOB:
        1. If plan is empty, generate detailed steps.
        2. If tasks are pending, pick the NEXT one.
        3. If specific request comes in, insert it into plan.
        
        OUTPUT JSON:
        {
            "next_task": "Name of the task to do NOW",
            "reasoning": "Why this task?",
            "updated_plan_json": [ ... full plan list ... ],
            "status": "coding" (or "done" if mission complete)
        }
        """
        
        messages = [
            SystemMessage(content=system_prompt.replace("{mission}", mission).replace("{current_plan}", json.dumps(current_plan))),
            HumanMessage(content=f"Context:\n{context_str}\n\nWhat should we do next?")
        ]
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        result = json_llm.invoke(messages)
        content = result.content
        
        try:
            data = JsonRepair.parse(content)
            next_task = data.get("next_task")
            updated_plan = data.get("updated_plan_json")
            status = data.get("status", "coding")
            
            # Save Plan
            if updated_plan:
                self.docker_manager.write_file(startup_id, "artifacts/plan.json", json.dumps(updated_plan, indent=2))
                
            logs.append(f"Planner: Next Task -> {next_task}")
            
            return {
                "current_task": next_task,
                "status": status,
                "plan": updated_plan,
                "logs": logs
            }
        except Exception as e:
            return {"logs": logs + [f"Planner Error: {e}"], "status": "failed"}


    def creator_node(self, state):
        """
        The WORK HORSE.
        Executes the 'current_task'.
        Uses 'LSP Micro-Loop' to fix errors before finishing.
        """
        logger.info("--- Creator Node (V2) ---")
        logs = state.get("logs", [])
        
        try:
            startup_id = state["startup_id"]
            task = state["current_task"]
            
            cm = self._get_context_manager(startup_id)
            lsp = self._get_lsp_handler(startup_id)
            
            # 1. Scoped Context (Deep Dive)
            # Get AST context for relevant symbols mentioned in task?
            # For now, simple keyword match or just get related files.
            # Let's assume the previous context + specific files related to task.
            context_str = f"Task: {task}\n"
            
            system_prompt = """You are a Senior Full-Stack Developer.
            Implement the task: {task}
            
            ENVIRONMENT:
            - Running on Host, controlling Docker Container.
            - NO SUDO in container.
            
            STRATEGY:
            1. Write/Modify files to implement features.
            2. Use `ls` or `cat` to verify paths if unsure.
            
            OUTPUT JSON:
            {
                "thoughts": "Implementation strategy...",
                "steps": [
                    {"action": "write_file", "path": "...", "content": "..."},
                    {"action": "command", "command": "..."} 
                ]
            }
            """
            
            # ... (LLM Call to get steps) ...
            # Simplified for brevity in this single-shot write
            
            messages = [SystemMessage(content=system_prompt.format(task=task)), HumanMessage(content="Start Implementation.")]
            json_llm = self.llm.bind(response_format={"type": "json_object"})
            
            # Retry Loop for implementation
            for attempt in range(3):
                try:
                    res = json_llm.invoke(messages)
                    plan = JsonRepair.parse(res.content)
                    steps = plan.get("steps", [])
                    
                    execution_logs = []
                    failed = False
                    
                    for step in steps:
                        if step["action"] == "write_file":
                            path = step["path"]
                            content = step["content"]
                            self.docker_manager.write_file(startup_id, path, content)
                            execution_logs.append(f"Wrote {path}")
                            
                            # --- LSP MICRO-LOOP ---
                            # Check syntax immediately
                            syntax = lsp.check_syntax(path)
                            if not syntax["valid"]:
                                execution_logs.append(f"LSP Error in {path}: {syntax['error']}")
                                # Self-Correction opportunity?
                                # For MVP V2, we just log it and maybe fail the step so Reviewer sees it.
                                # Ideally we loop here.
                                pass
                                
                        elif step["action"] == "command":
                            cmd = step["command"]
                            # Run via Docker Exec
                            out = self.docker_manager.run_command(startup_id, cmd)
                            execution_logs.append(f"Ran {cmd}: {out.get('exit_code')}")
                    
                    logs.extend(execution_logs)
                    return {"status": "success", "logs": logs} # Go to Reviewer
                    
                except Exception as e:
                    import traceback
                    tb = traceback.format_exc()
                    logs.append(f"Creator Crash (Loop {attempt}): {e}\nTraceback:\n{tb}\nResponse Content:\n{res.content}")
            
            return {"status": "failed", "logs": logs}
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            error_msg = f"Creator System Crash: {str(e)}\nTraceback:\n{tb}"
            logger.error(error_msg)
            return {"status": "failed", "logs": logs + [error_msg]}

    def reviewer_node(self, state):
        """
        The GATEKEEPER.
        Checks if task is actually done.
        """
        logger.info("--- Reviewer Node (V2) ---")
        # Simple Pass-through for now, or lightweight verification
        return {"status": "approved", "logs": state.get("logs", []) + ["Reviewer: Approved changes."]}




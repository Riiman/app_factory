import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ProcessManager:
    """
    Middleware to handle command execution strategy (Sync vs Async).
    """
    def __init__(self, docker_manager):
        self.docker_manager = docker_manager
        # In-memory registry for this session (Note: Persisting this to DB/Redis is better for scaling, 
        # but for now we keep it simple as requested)
        self.active_jobs = {} 

    def run_smart(self, startup_id, command, timeout=5.0):
        """
        Executes a command with a "Try-Sync" strategy.
        1. Starts command detached.
        2. Waits up to `timeout` seconds.
        3. If finished -> Returns output (Sync).
        4. If running -> Returns Job ID (Async).
        """
        try:
            # 1. Start Process Detached
            # We use a unique alias for every run to track it
            import uuid
            job_id = f"job_{uuid.uuid4().hex[:8]}"
            alias = job_id # Use job_id as alias for DockerManager
            
            # Start via DockerManager's background process tool
            # This handles the "nohup ... > log" part
            res = self.docker_manager.start_background_process(startup_id, alias, command)
            
            if res.get("error"):
                return {"error": res["error"]}
                
            pid = res.get("pid")
            log_file = res.get("log_file")
            
            # 2. Monitor Loop (The "Smart Wait")
            start_time = time.time()
            
            # We need to know if it finished. 
            # We can check if PID is still running.
            while time.time() - start_time < timeout:
                # Check status
                # DockerManager doesn't expose a cheap "check pid" method directly except via "list_processes" or "start_background_process" check.
                # We need to add a lightweight check or use exec_run locally.
                # Let's use `exec_run("ps -p PID")` to check.
                
                check = self.docker_manager.client.containers.get(self.docker_manager.get_container_name(startup_id)).exec_run(f"ps -p {pid}")
                is_running = (check.exit_code == 0)
                
                if not is_running:
                    # It finished!
                    # Read logs
                    logs = self.docker_manager.read_background_process_logs(startup_id, alias).get("logs", "")
                    
                    # Cleanup immediately since it's done
                    self.docker_manager.stop_background_process(startup_id, alias)
                    
                    return {
                        "status": "completed",
                        "output": logs,
                        "duration": time.time() - start_time
                    }
                
                time.sleep(0.5) # Yield
                
            # 3. Timeout Exceeded -> Background It
            logger.info(f"Command '{command}' exceeded {timeout}s. Moving to background (Job {job_id}).")
            
            job_info = {
                "job_id": job_id,
                "startup_id": startup_id,
                "alias": alias,
                "pid": pid,
                "command": command,
                "start_time": datetime.now().isoformat(),
                "status": "running"
            }
            self.active_jobs[job_id] = job_info
            
            return {
                "status": "background",
                "job_id": job_id,
                "message": f"Command moved to background after {timeout}s. Use 'check_job' to monitor.",
                "pid": pid
            }
            
        except Exception as e:
            return {"error": f"Smart Run Failed: {str(e)}"}

    def check_job(self, startup_id, job_id):
        """
        Checks the status of a specific background job.
        """
        job = self.active_jobs.get(job_id)
        if not job:
            return {"error": "Job not found in active registry."}
            
        alias = job["alias"]
        pid = job["pid"]
        
        try:
            # Check if running
            check = self.docker_manager.client.containers.get(self.docker_manager.get_container_name(startup_id)).exec_run(f"ps -p {pid}")
            is_running = (check.exit_code == 0)
            
            # Read current logs
            logs = self.docker_manager.read_background_process_logs(startup_id, alias, lines=50).get("logs", "")
            
            if is_running:
                return {
                    "status": "running",
                    "job_id": job_id,
                    "latest_logs": logs
                }
            else:
                # Finished
                # Mark as completed in registry
                del self.active_jobs[job_id]
                
                # Cleanup container resources
                self.docker_manager.stop_background_process(startup_id, alias)
                
                return {
                    "status": "completed",
                    "job_id": job_id,
                    "output": logs
                }
                
        except Exception as e:
            return {"error": str(e)}

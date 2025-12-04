import docker
import os
import time

class DockerManager:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            print(f"Error initializing Docker client: {e}")
            self.client = None

    def get_container_name(self, startup_id, container_name=None):
        """
        Returns the container name for a startup.
        If container_name is provided, returns it.
        Otherwise generates a default name (for backward compatibility).
        """
        if container_name:
            return container_name
        return f"startup_dev_{startup_id}"
    
    def generate_container_name(self):
        """Generates a unique random container name."""
        import uuid
        random_suffix = uuid.uuid4().hex[:12]
        return f"startup_dev_{random_suffix}"

    def ensure_container(self, startup_id, stack_type="MERN", container_name=None):
        """
        Ensures a dev container is running for the startup.
        stack_type: MERN, Python-Data, NextJS
        container_name: Optional existing container name from database
        Returns: dict with status, container_id, ports, and container_name
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Use provided container_name or generate a new one
        if not container_name:
            container_name = self.generate_container_name()
        
        # Check if running
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                container.start()
            
            # Get ports
            container.reload()
            ports = container.attrs['NetworkSettings']['Ports']
            return {
                "status": "running", 
                "container_id": container.id, 
                "ports": ports,
                "container_name": container_name
            }
        except docker.errors.NotFound:
            # Create new container
            try:
                # Build Image based on stack
                stack_dir = os.path.join(os.path.dirname(__file__), 'stacks', stack_type)
                if not os.path.exists(stack_dir):
                    # Fallback to MERN if stack not found
                    stack_dir = os.path.join(os.path.dirname(__file__), 'stacks', 'MERN')
                
                image_tag = f"startup_builder_{stack_type.lower()}"
                
                # Build the image
                print(f"Building image for {stack_type}...")
                self.client.images.build(path=stack_dir, tag=image_tag)

                # Create a volume for persistence
                volume_name = f"startup_vol_{startup_id}"
                try:
                    self.client.volumes.get(volume_name)
                except docker.errors.NotFound:
                    self.client.volumes.create(name=volume_name)

                container = self.client.containers.run(
                    image_tag,
                    command="tail -f /dev/null", # Keep alive
                    detach=True,
                    name=container_name,
                    volumes={volume_name: {'bind': '/app', 'mode': 'rw'}},
                    working_dir="/app",
                    ports={'3000/tcp': None, '8000/tcp': None, '8888/tcp': None}, # Allow mapping for various ports
                    environment={'HOST': '0.0.0.0'}
                )
                # Reload to get ports
                container.reload()
                ports = container.attrs['NetworkSettings']['Ports']
                
                # We no longer do auto-init or auto-start here.
                # The Agent is now responsible for checking project state and running commands.
                
                return {
                    "status": "created", 
                    "container_id": container.id, 
                    "ports": ports,
                    "container_name": container_name
                }
            except Exception as e:
                return {"error": f"Failed to create container: {str(e)}"}
        except Exception as e:
            return {"error": f"Error checking container: {str(e)}"}

    def stop_container(self, startup_id, container_name=None):
        """
        Stops a container.
        container_name: Optional container name from database
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Use provided container_name or fall back to old naming
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            return {"status": "stopped"}
        except docker.errors.NotFound:
            return {"status": "not_found"}
        except Exception as e:
            return {"error": str(e)}
    
    def cleanup_container(self, container_name):
        """
        Stops and removes a container by name.
        Returns: dict with status
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        try:
            container = self.client.containers.get(container_name)
            if container.status == 'running':
                container.stop()
            container.remove()
            return {"status": "removed"}
        except docker.errors.NotFound:
            return {"status": "not_found"}
        except Exception as e:
            return {"error": str(e)}

    def run_command(self, startup_id, command, container_name=None, detach=False):
        """
        Runs a command inside the container.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Execute command
            if detach:
                # exec_run with detach=True returns output generator? No, it returns exit_code (None) and output (None) usually?
                # Actually python docker client exec_run(detach=True) returns output as bytes?
                # Let's check docs or assume standard behavior: it returns immediately.
                # We use nohup to ensure it keeps running? exec_run is not a shell, so we need sh -c.
                exit_code, output = container.exec_run(
                    f"bash -c 'nohup {command} > /dev/null 2>&1 &'",
                    workdir="/app"
                )
                return {
                    "exit_code": 0,
                    "output": "Command started in background."
                }
            else:
                exit_code, output = container.exec_run(
                    f"bash -c '{command}'",
                    workdir="/app"
                )
                return {
                    "exit_code": exit_code,
                    "output": output.decode('utf-8')
                }
        except docker.errors.NotFound:
            return {"error": "Container not found"}
        except Exception as e:
            return {"error": str(e)}

    def list_files(self, startup_id, path=".", container_name=None):
        """
        Lists files in the container directory.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Use ls -F to distinguish directories
            # -1 forces one entry per line, -A includes hidden files (except . and ..)
            exit_code, output = container.exec_run(
                f"ls -1FA '{path}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                print(f"Error listing files at {path}: {output.decode('utf-8')}")
                # If directory doesn't exist or is empty, return empty list instead of error if possible
                # But ls returns error if dir doesn't exist.
                return {"error": f"Error listing files: {output.decode('utf-8')}"}
            
            raw_output = output.decode('utf-8')
            files = []
            for line in raw_output.splitlines():
                line = line.strip()
                if not line: continue
                
                is_dir = line.endswith('/')
                name = line[:-1] if is_dir else line
                
                files.append({
                    "name": name,
                    "type": "directory" if is_dir else "file",
                    "path": os.path.join(path, name) if path != "." else name
                })
                
            return {"files": files}
            
        except Exception as e:
            return {"error": str(e)}

    def read_file(self, startup_id, path, container_name=None):
        """
        Reads file content from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
                
            exit_code, output = container.exec_run(
                f"cat '{path}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Error reading file: {output.decode('utf-8')}"}
                
            return {"content": output.decode('utf-8')}
            
        except Exception as e:
            return {"error": str(e)}

    def write_file(self, startup_id, path, content, container_name=None):
        """
        Writes content to a file in the container using base64 encoding.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            import base64
            encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            
            # Ensure parent directory exists
            cmd = f"mkdir -p $(dirname {path}) && echo '{encoded_content}' | base64 -d > {path}"
            
            exit_code, output = container.exec_run(
                f"bash -c \"{cmd}\"",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Error writing file: {output.decode('utf-8')}"}
                
            return {"status": "success"}
            
        except Exception as e:
            return {"error": str(e)}

    def get_container_logs(self, startup_id, container_name=None):
        """
        Fetches logs from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            # Fetch logs (stdout and stderr)
            logs = container.logs(stdout=True, stderr=True, tail=200)
            return {"logs": logs.decode('utf-8')}
        except docker.errors.NotFound:
            return {"error": "Container not found"}
        except Exception as e:
            return {"error": str(e)}
    def copy_from_container(self, startup_id, src_path, dest_path, container_name=None):
        """Copies files from container to host, excluding heavy directories."""
        if not self.client:
            return False
        
        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            
            # Use tar inside container to stream files with excludes
            # This avoids transferring node_modules over the socket
            excludes = [
                "--exclude='node_modules'",
                "--exclude='.git'",
                "--exclude='dist'",
                "--exclude='build'",
                "--exclude='__pycache__'",
                "--exclude='.DS_Store'",
                "--exclude='coverage'",
                "--exclude='.next'"
            ]
            exclude_str = " ".join(excludes)
            
            # Create tar stream command
            # We tar to stdout (-)
            # -C changes directory
            # . is the target (relative to -C)
            # We assume src_path is a directory. If it's a file, this might need adjustment, 
            # but for indexing we usually copy the whole app dir.
            
            # Ensure src_path ends with / if it's a dir, or handle it. 
            # Safest is to assume src_path is the root dir to copy.
            
            cmd = f"tar -cf - {exclude_str} -C {src_path} ."
            
            # exec_run with stream=True returns a generator
            exit_code, output_stream = container.exec_run(cmd, stream=True)
            
            # We can't easily check exit_code immediately with stream=True in all docker SDK versions/configs,
            # but we can read the stream.
            
            import tarfile
            import io
            
            # Read the stream into a BytesIO object (in-memory)
            # CAUTION: If the project is huge (sans node_modules), this might consume memory.
            # But without node_modules it should be small (MBs).
            tar_data = io.BytesIO()
            for chunk in output_stream:
                tar_data.write(chunk)
            tar_data.seek(0)
            
            # Extract
            with tarfile.open(fileobj=tar_data) as tar:
                tar.extractall(path=dest_path)
                
            return True
        except Exception as e:
            print(f"Error copying from container: {e}")
            return False

    def start_server(self, startup_id, container_name=None):
        """
        Starts the application server in the background.
        Detects package.json or requirements.txt to determine start command.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}

            # 1. Determine Start Command
            start_cmd = "npm start" # Default
            
            # Check for package.json
            exit_code, output = container.exec_run("cat package.json", workdir="/app")
            if exit_code == 0:
                import json
                try:
                    pkg = json.loads(output.decode('utf-8'))
                    if "scripts" in pkg and "dev" in pkg["scripts"]:
                        start_cmd = "npm run dev"
                    elif "scripts" in pkg and "start" in pkg["scripts"]:
                        start_cmd = "npm start"
                except:
                    pass
            else:
                # Check for python
                exit_code, _ = container.exec_run("ls app.py", workdir="/app")
                if exit_code == 0:
                    start_cmd = "python app.py"
                else:
                    exit_code, _ = container.exec_run("ls main.py", workdir="/app")
                    if exit_code == 0:
                        start_cmd = "python main.py"

            print(f"Starting server with command: {start_cmd}")

            # 2. Run in background using nohup
            # We redirect output to app.log and save PID
            full_cmd = f"nohup {start_cmd} > app.log 2>&1 & echo $! > server.pid"
            
            exit_code, output = container.exec_run(
                f"bash -c '{full_cmd}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Failed to start server: {output.decode('utf-8')}"}
                
            return {"status": "started", "command": start_cmd, "pid": output.decode('utf-8').strip()}

        except Exception as e:
            return {"error": str(e)}

    def stop_server(self, startup_id, container_name=None):
        """
        Stops the application server using the saved PID.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                container_name = startup.container_name
            else:
                container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}

            # Read PID
            exit_code, output = container.exec_run("cat server.pid", workdir="/app")
            if exit_code != 0:
                return {"status": "not_running", "message": "No server.pid found"}
            
            pid = output.decode('utf-8').strip()
            if not pid.isdigit():
                 return {"status": "error", "message": "Invalid PID file"}

            # Kill process
            exit_code, output = container.exec_run(f"kill {pid}", workdir="/app")
            
            # Remove PID file
            container.exec_run("rm server.pid", workdir="/app")
            
            return {"status": "stopped", "pid": pid}

        except Exception as e:
            return {"error": str(e)}

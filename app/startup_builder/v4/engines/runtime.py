import docker
import threading
import time
import os
import socket
import logging
from typing import Dict, Optional, Callable, Generator
from docker.errors import NotFound, APIError

logger = logging.getLogger(__name__)

class DockerRuntime:
    """
    V5 Interactive Docker Runtime.
    Manages persistent shell sessions with PTY support, enabling interactive commands.
    """
    
    def __init__(self, startup_id: str, workspace_path: str, log_callback: Optional[Callable[[str, str], None]] = None):
        self.startup_id = startup_id
        self.workspace_path = workspace_path
        self.log_callback = log_callback # func(terminal_id, content)
        self.client = docker.from_env()
        self.container_name = f"v5_dev_{startup_id}"
        self.terminals: Dict[str, dict] = {} # {id: {socket, buffer, running}}
        
        self._ensure_container()

    def _ensure_container(self):
        """Ensures the dev container is running."""
        try:
            self.container = self.client.containers.get(self.container_name)
            if self.container.status != 'running':
                self.container.start()
        except NotFound:
            # Create a robust dev container (Ubuntu/Debian based)
            # Mounting workspace to /app
            self.container = self.client.containers.run(
                "python:3.11-slim-bookworm", # Using specific tag for stability
                command="tail -f /dev/null", # Keep alive
                name=self.container_name,
                detach=True,
                volumes={
                    self.workspace_path: {'bind': '/app', 'mode': 'rw'}
                },
                working_dir="/app",
                tty=True, # Allocate TTY
                stdin_open=True # Keep stdin open
            )
            # Install basic tools
            self._install_basics()

    def _install_basics(self):
        """Installs git, curl, nodejs if needed."""
        # This acts as a 'bootstrap' script
        setup_cmds = [
            "apt-get update && apt-get install -y git curl unzip",
            "pip install -U pip"
        ]
        for cmd in setup_cmds:
            self.container.exec_run(cmd)

    def get_or_create_terminal(self, terminal_id: str) -> dict:
        """Creates a persistent shell session (PTY) if not exists."""
        if terminal_id in self.terminals and self.terminals[terminal_id]['running']:
            return self.terminals[terminal_id]

        logger.info(f"Creating terminal: {terminal_id}")
        
        # Low-level Docker API to create a socket attachment
        # We start 'bash' in interactive mode
        exec_id = self.client.api.exec_create(
            self.container.id, 
            "/bin/bash", 
            stdin=True, 
            tty=True 
        )['Id']

        # Attach to the socket
        sock = self.client.api.exec_start(
            exec_id, 
            detach=False, 
            tty=True, 
            socket=True
        )
        
        # If sock is a wrapper (e.g. typical in unix sockets), we might need to handle it.
        # Docker-py returns a generator or a socket depending on stream.
        # With socket=True, it returns a raw socket object (file descriptor wrapped).
        
        terminal_data = {
            'socket': sock,
            'id': exec_id,
            'running': True,
            'output_thread': None
        }
        
        # Start background reader thread
        t = threading.Thread(target=self._terminal_reader, args=(terminal_id, sock))
        t.daemon = True
        t.start()
        terminal_data['output_thread'] = t
        
        self.terminals[terminal_id] = terminal_data
        return terminal_data

    def _terminal_reader(self, terminal_id: str, sock):
        """Reads from the socket and pushes to log callback."""
        try:
            # Docker socket reader
            # Note: TTY sockets might have raw formatting.
            while True:
                # Use a small buffer to stream output
                data = sock.read(4096)
                if not data:
                    break
                
                text = data.decode('utf-8', errors='replace')
                
                # Push to callback (Brain Stream)
                if self.log_callback:
                    self.log_callback(terminal_id, text)
                    
        except Exception as e:
            logger.error(f"Terminal {terminal_id} reader crashed: {e}")
        finally:
            if terminal_id in self.terminals:
                self.terminals[terminal_id]['running'] = False
            logger.info(f"Terminal {terminal_id} closed.")

    def write_to_terminal(self, terminal_id: str, text: str):
        """Sends input to the terminal (stdin)."""
        term = self.get_or_create_terminal(terminal_id)
        sock = term['socket']
        
        # socket.sendall() expects bytes
        if isinstance(text, str):
            text = text.encode('utf-8')
            
        sock.sendall(text)
    
    def run_command_block(self, cmd: str, terminal_id: str = "main", timeout: int = 30) -> str:
        """
        Runs a command and waits for a prompt (simplified blocking version).
        NOTE: For true interactivity, the Agent should use 'write_to_terminal'
        and observe the stream. This is a helper for 'run_shell'.
        """
        # This implementation is tricky with raw sockets.
        # For V5, we might prefer the Agent to just "Send and Wait".
        # But for this specific helper, we'll implement a simple wait loop 
        # using a temporary exec (legacy style) for reliability if it's a simple command.
        
        # HYBRID APPROACH:
        # If it's a simple command, use exec_run (reliable blocking).
        # If it needs state (cd /app), we MUST use the persistent terminal.
        
        # For now, let's implement the 'write and wait' on the socket.
        self.write_to_terminal(terminal_id, cmd + "\n")
        # Returning "Sent" because the output comes via callback stream.
        return f"(Command sent to terminal '{terminal_id}'. Watch output stream.)"

    def cleanup(self):
        """Stops the container."""
        try:
            self.container.stop()
            self.container.remove()
        except:
            pass

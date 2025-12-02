from flask import request
from flask_socketio import emit, disconnect
from app.extensions import socketio
from app.startup_builder.manager import DockerManager
import docker
import threading
import time

# Store active streams: sid -> {'sock': socket, 'thread': thread}
active_streams = {}

def read_stream(sid, sock):
    """
    Reads output from the container's PTY socket and emits it to the client.
    """
    try:
        while True:
            # Read raw bytes from the socket
            data = sock.read(4096)
            if not data:
                break
            
            # Emit to the specific client
            socketio.emit('output', {'data': data.decode('utf-8', errors='ignore')}, room=sid, namespace='/terminal')
    except Exception as e:
        print(f"Stream error for {sid}: {e}")
    finally:
        # Cleanup
        if sid in active_streams:
            del active_streams[sid]
        try:
            sock.close()
        except:
            pass

@socketio.on('connect', namespace='/terminal')
def connect():
    print(f'Client connected to terminal: {request.sid}')
    # No initial message needed, the shell will provide the prompt

@socketio.on('disconnect', namespace='/terminal')
def disconnect_client():
    print(f'Client disconnected: {request.sid}')
    sid = request.sid
    if sid in active_streams:
        stream = active_streams[sid]
        try:
            stream['sock'].close()
        except:
            pass
        del active_streams[sid]

@socketio.on('start_terminal', namespace='/terminal')
def start_terminal(data):
    startup_id = data.get('startup_id')
    if not startup_id:
        return
    
    sid = request.sid
    manager = DockerManager()
    container_name = manager.get_container_name(startup_id)
    
    try:
        container = manager.client.containers.get(container_name)
        if container.status != 'running':
            container.start()
            
        # Use low-level API to create an exec instance with PTY
        # This allows for a persistent, interactive shell session
        exec_id = manager.client.api.exec_create(
            container.id,
            cmd="/bin/bash",
            stdin=True,
            tty=True,
            environment={"TERM": "xterm"}
        )['Id']
        
        # Start the exec instance and get the raw socket
        sock = manager.client.api.exec_start(
            exec_id,
            detach=False,
            tty=True,
            socket=True
        )
        
        # Start a background thread to read from the socket
        thread = threading.Thread(target=read_stream, args=(sid, sock))
        thread.daemon = True
        thread.start()
        
        active_streams[sid] = {'sock': sock, 'thread': thread, 'exec_id': exec_id}
        
    except docker.errors.NotFound:
        emit('output', {'data': f'Container {container_name} not found. Please start the environment.\r\n'})
    except Exception as e:
        emit('output', {'data': f'Error starting terminal: {str(e)}\r\n'})

import os

# ... (imports)

@socketio.on('input', namespace='/terminal')
def handle_input(data):
    sid = request.sid
    input_data = data.get('data', '')
    
    if sid in active_streams:
        try:
            sock = active_streams[sid]['sock']
            data_bytes = input_data.encode('utf-8')
            
            # Try different methods to write to the socket/file
            if hasattr(sock, 'sendall'):
                sock.sendall(data_bytes)
            elif hasattr(sock, 'write'):
                try:
                    sock.write(data_bytes)
                    if hasattr(sock, 'flush'):
                        sock.flush()
                except Exception as e:
                    # If write fails (e.g. read-only file object), try os.write on fileno
                    if 'not writable' in str(e) and hasattr(sock, 'fileno'):
                        os.write(sock.fileno(), data_bytes)
                    else:
                        raise e
            elif hasattr(sock, 'fileno'):
                os.write(sock.fileno(), data_bytes)
            else:
                print(f"Error: Socket {sid} has no write method")
                
        except Exception as e:
            print(f"Error writing to terminal {sid}: {e}")
            emit('output', {'data': f'\r\nError: Connection lost ({str(e)}).\r\n'})

@socketio.on('resize', namespace='/terminal')
def handle_resize(data):
    sid = request.sid
    if sid not in active_streams:
        return
        
    rows = data.get('rows', 24)
    cols = data.get('cols', 80)
    exec_id = active_streams[sid].get('exec_id')
    
    if exec_id:
        try:
            manager = DockerManager()
            manager.client.api.exec_resize(exec_id, height=rows, width=cols)
        except Exception as e:
            print(f"Error resizing terminal {sid}: {e}")

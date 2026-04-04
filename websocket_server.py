import os
from dotenv import load_dotenv

load_dotenv()

import trio
import asyncio
import json
import redis.asyncio as redis
import jwt # Added PyJWT
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

from app.websocket.notification_manager import NotificationManager, get_notification_manager

# --- Constants ---
REDIS_CHANNEL = "dashboard-notifications"

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- FastAPI App ---
app = FastAPI(title="Dashboard Notification WebSocket Server")

# --- Flask App Context for DB Access ---
from app import create_app
flask_app = create_app()
flask_app_context = flask_app.app_context()
flask_app_context.push()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Redis Pub/Sub Listener ---
# --- Redis Pub/Sub Listener ---
async def redis_listener(manager: NotificationManager):
    """Listens to a Redis channel and broadcasts messages to WebSocket clients."""
    # Use a simpler Redis connection
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(REDIS_CHANNEL)
    logger.info(f"Subscribed to Redis channel: {REDIS_CHANNEL}")
    
    while True:
        try:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                try:
                    data_dict = json.loads(message['data'])
                    await manager.broadcast(data_dict)
                except json.JSONDecodeError:
                    logger.error(f"Could not decode JSON from Redis: {message['data']}")
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    
            await asyncio.sleep(0.01) # Prevent tight loop
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
            await asyncio.sleep(5) # Wait before retrying connection

# --- FastAPI Startup Event ---
@app.on_event("startup")
async def startup_event():
    """On startup, create a background task for the Redis listener."""
    manager = get_notification_manager()
    asyncio.create_task(redis_listener(manager))


# --- WebSocket Endpoint ---

# --- JWT Configuration ---
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-please-change') 
JWT_ALGORITHM = "HS256"

@app.websocket("/ws/dashboard-notifications")
async def dashboard_websocket(
    websocket: WebSocket,
    token: str = None,
    manager: NotificationManager = Depends(get_notification_manager)
):
    # 1. Authenticate
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = str(payload.get("sub")) # Enforce string ID
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        await websocket.close(code=4001)
        return

    # 2. Determine Rooms (User Specific)
    rooms = [f"user_{user_id}"]
    if payload.get("role") == "admin":
        rooms.append("admin")

    await manager.connect(websocket, rooms)
    
    try:
        while True:
            # Handle incoming messages (e.g., subscriptions)
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                message_type = data.get("type")
                
                if message_type == "subscribe":
                    startup_id = data.get("startup_id")
                    if startup_id:
                        # CRITICAL: Enforce consistent string ID type
                        room_name = f"startup_{str(startup_id)}"
                        manager.subscribe(websocket, room_name)
                        logger.info(f"Client user_{user_id} subscribed to {room_name}")
                        
                        # --- Send Initial Env Status ---
                        try:
                            # Run sync docker check in threadpool
                            loop = asyncio.get_event_loop()
                            status_payload = await loop.run_in_executor(None, lambda: get_env_status_sync(startup_id))
                            
                            await websocket.send_json({
                                "type": "env_status",
                                "data": status_payload
                            })
                        except Exception as e:
                            logger.error(f"Error fetching env status: {e}")
                
                elif message_type == "unsubscribe":
                    startup_id = data.get("startup_id")
                    if startup_id:
                        manager.unsubscribe(websocket, f"startup_{str(startup_id)}")
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Helper for Sync Docker Check (to keep async loop clean)
def get_env_status_sync(startup_id):
    try:
        d_mgr = DockerManager()
        c_name = d_mgr.get_container_name(startup_id)
        container = d_mgr.client.containers.get(c_name)
        if container.status == 'running':
            return {
                'status': 'running',
                'container_id': container.id,
                'ports': container.attrs['NetworkSettings']['Ports']
            }
    except Exception:
        pass
    return {'status': 'stopped'}


# --- Terminal WebSocket ---
from app.startup_builder.manager import DockerManager
import docker
import threading

@app.websocket("/ws/terminal")
async def terminal_websocket(
    websocket: WebSocket,
    startup_id: int, # Query param
    token: str = None
):
    # 1. Authenticate (Reuse logic or simplify)
    if not token:
        await websocket.close(code=4001)
        return

    try:
        jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    logger.info(f"Terminal connection accepted for startup {startup_id}")
    
    manager = DockerManager()
    
    # FIX: Wrap DB access in App Context
    try:
        with flask_app.app_context():
            container_name = manager.get_container_name(startup_id)
            logger.info(f"Resolved container name: {container_name}")
    except Exception as e:
        logger.error(f"Error fetching container name: {e}")
        await websocket.send_text(f"Error: {str(e)}")
        await websocket.close()
        return
    
    try:
        container = manager.client.containers.get(container_name)
        if container.status != 'running':
            container.start()
            
        # Create exec instance
        exec_id = manager.client.api.exec_create(
            container.id,
            cmd="/bin/bash",
            stdin=True,
            tty=True,
            environment={"TERM": "xterm"}
        )['Id']
        
        # Start exec and get raw socket
        sock = manager.client.api.exec_start(
            exec_id,
            detach=False,
            tty=True,
            socket=True
        )
        # Note: sock is likely a raw socket or a wrapper
        
    except Exception as e:
        await websocket.send_text(f"Error starting terminal: {e}")
        await websocket.close()
        return

    # Background thread to read from Docker -> WebSocket
    loop = asyncio.get_event_loop()
    
    def read_from_docker():
        try:
            while True:
                data = sock.read(4096)
                if not data:
                    break
                # Send to WS
                asyncio.run_coroutine_threadsafe(
                    websocket.send_json({'data': data.decode('utf-8', errors='ignore')}),
                    loop
                )
        except Exception as e:
            logger.error(f"Terminal read error: {e}")
        finally:
            try:
                sock.close()
            except:
                pass

    reader_thread = threading.Thread(target=read_from_docker)
    reader_thread.daemon = True
    reader_thread.start()

    try:
        while True:
            # Read from WebSocket -> Docker
            msg_str = await websocket.receive_text()
            try:
                msg = json.loads(msg_str)
                
                # Handle resize
                if msg.get('type') == 'resize':
                    rows = msg.get('rows', 24)
                    cols = msg.get('cols', 80)
                    try:
                        manager.client.api.exec_resize(exec_id, height=rows, width=cols)
                    except Exception as resize_err:
                        logger.error(f"Resize error: {resize_err}")
                
                # Handle input
                elif msg.get('type') == 'input':
                    input_data = msg.get('data', '')
                    if input_data:
                        data_bytes = input_data.encode('utf-8')
                        # Write to socket
                        if hasattr(sock, 'sendall'):
                            sock.sendall(data_bytes)
                        else:
                            os.write(sock.fileno(), data_bytes)
                            
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Terminal WS error: {e}")
    finally:
        # Cleanup
        try:
            sock.close()
        except:
            pass
        # Reader thread will exit when sock is closed (read returns empty)

# --- Main Entry Point ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

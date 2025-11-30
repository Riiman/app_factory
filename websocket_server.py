import asyncio
import json
import redis.asyncio as redis
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

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Redis Pub/Sub Listener ---
async def redis_listener(manager: NotificationManager):
    """Listens to a Redis channel and broadcasts messages to WebSocket clients."""
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(REDIS_CHANNEL)
    logger.info(f"Subscribed to Redis channel: {REDIS_CHANNEL}")
    
    while True:
        try:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                logger.info(f"Received message from Redis: {message['data']}")
                # The data from redis-py pubsub is a string, so we need to parse it
                try:
                    data_dict = json.loads(message['data'])
                    await manager.broadcast(data_dict)
                except json.JSONDecodeError:
                    logger.error(f"Could not decode JSON from Redis message: {message['data']}")
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
    # Using asyncio.create_task to run the listener in the background
    asyncio.create_task(redis_listener(manager))


# --- WebSocket Endpoint ---
@app.websocket("/ws/dashboard-notifications")
async def dashboard_websocket(
    websocket: WebSocket,
    manager: NotificationManager = Depends(get_notification_manager)
):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive by waiting for a message.
            # This will also detect if the client disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Dashboard client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error in dashboard_websocket: {e}")
        manager.disconnect(websocket)


# --- Main Entry Point ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

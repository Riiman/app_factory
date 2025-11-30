import asyncio
import logging
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NotificationManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New dashboard connection established.")

    def disconnect(self, websocket: WebSocket):
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            logger.warning("Attempted to disconnect non-existent websocket from NotificationManager.")
        logger.info("Dashboard connection closed.")

    async def broadcast(self, message: Dict):
        send_coroutines = []
        for connection in self.active_connections:
            try:
                send_coroutines.append(connection.send_json(message))
            except RuntimeError as e:
                logger.error(f"Error preparing to send to websocket: {e}")

        if send_coroutines:
            results = await asyncio.gather(*send_coroutines, return_exceptions=True)
            logger.info(f"Broadcasted message: {message}")
            
            # Optional: Log any errors that occurred during broadcast
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error during broadcast: {result}")


# Create a singleton instance to be shared across the app
notification_manager = NotificationManager()

def get_notification_manager() -> NotificationManager:
    return notification_manager

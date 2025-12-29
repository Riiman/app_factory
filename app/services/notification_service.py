import json
import logging
import redis
from flask import current_app

logger = logging.getLogger(__name__)

def publish_update(event_type: str, data: dict, rooms: list = None, channel: str = "dashboard-notifications"):
    """
    Publishes an update message to the Redis channel.
    Ensures safe serialization and string conversion for room names.
    """
    try:
        from app.extensions import redis_client
        
        if not redis_client:
             logger.warning("Redis client not initialized in extensions.")
             return

        if rooms is None:
            rooms = []

        # Enforce String Types for Rooms to avoid "startup_10" vs "startup_'10'" mismatches
        sanitized_rooms = [str(r) for r in rooms]

        message = {
            "rooms": sanitized_rooms,
            "payload": {
                "type": event_type,
                "data": data
            }
        }
        
        message_str = json.dumps(message)
        redis_client.publish(channel, message_str)
        # logger.debug(f"Published {event_type} to {sanitized_rooms}")
        
    except Exception as e:
        logger.error(f"Failed to publish update to Redis: {e}")

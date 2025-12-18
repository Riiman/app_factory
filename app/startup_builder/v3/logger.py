import logging
import os
from datetime import datetime

# Setup Logger
LOG_FILE_PATH = os.path.join(os.getcwd(), "v3_debug.log")

# Configure File Handler
handler = logging.FileHandler(LOG_FILE_PATH, mode='a')
formatter = logging.Formatter('%(asctime)s - [%(levelname)s] - %(message)s')
handler.setFormatter(formatter)

# Create Logger
v3_logger = logging.getLogger("v3_debug")
v3_logger.setLevel(logging.INFO)
v3_logger.addHandler(handler)

def log_event(event_type: str, content: str, source: str = "system"):
    """
    Logs an event to the persistent debug file.
    """
    try:
        msg = f"[{source.upper()}] {event_type}: {content}"
        v3_logger.info(msg)
        # Also print to stdout for docker logs visibility
        print(msg, flush=True)
    except Exception as e:
        print(f"Failed to log: {e}")

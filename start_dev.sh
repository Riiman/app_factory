#!/bin/bash

# Activate the virtual environment
source venv/bin/activate

# Check if Redis is running, start if not
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Redis is not running. Starting Redis server..."
    redis-server &
    sleep 1 # Give Redis a moment to start
fi

# Start the Flask server in the background
echo "Starting Flask server..."
python3 run.py &
FLASK_PID=$!

# Start the Celery worker in the background, logging to celery.log
echo "Starting Celery worker in the background..."
celery -A celery_app.celery worker --loglevel=info --logfile=celery.log -D

# When the script is stopped (e.g., with Ctrl+C), stop the Flask server and Celery worker
trap 'kill $FLASK_PID; celery -A celery_app.celery control shutdown' EXIT

# Wait for the Flask server to exit
wait $FLASK_PID

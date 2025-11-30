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
export FLASK_ENV=development
python3 run.py &
FLASK_PID=$!

# Start the WebSocket server in the background
echo "Starting WebSocket server..."
python3 websocket_server.py &
WEBSOCKET_PID=$!

# Start the Celery worker in the background, logging to celery.log
echo "Starting Celery worker in the background..."
celery -A celery_app.celery worker --loglevel=info --logfile=celery.log -D

# When the script is stopped (e.g., with Ctrl+C), stop all background services
trap 'echo "Stopping servers..."; kill $FLASK_PID; kill $WEBSOCKET_PID; celery -A celery_app.celery control shutdown; exit' INT TERM EXIT

# Wait for all background processes to exit
wait $FLASK_PID $WEBSOCKET_PID

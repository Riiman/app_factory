#!/bin/bash

# --- Configuration ---
FLASK_APP_DIR="/home/rimanshu/Desktop/Turning Idea"
FRONTEND_DIR="/home/rimanshu/Desktop/Turning Idea/frontend"

# --- Check for Redis ---
echo "Checking for Redis server..."
if ! pgrep -x "redis-server" > /dev/null
then
    echo "Redis server not found running. Please start Redis first."
    echo "If you have Docker, run: docker run -d -p 6379:6379 redis"
    echo "Or install and start Redis locally: sudo apt-get install redis-server && sudo systemctl start redis-server"
    exit 1
else
    echo "Redis server is running."
fi

# --- Start Flask Backend ---
echo "Starting Flask Backend..."
cd "$FLASK_APP_DIR"
export FLASK_APP=run.py # Assuming your Flask app entry point is run.py
export FLASK_DEBUG=1 # Enable debug mode
flask run --host=0.0.0.0 --port=5000 > backend.log 2>&1 &
FLASK_PID=$!
echo "Flask Backend started with PID: $FLASK_PID (logs in backend.log)"

# --- Start Celery Worker ---
echo "Starting Celery Worker..."
celery -A celery_worker.celery worker --loglevel=info > celery.log 2>&1 &
CELERY_PID=$!
echo "Celery Worker started with PID: $CELERY_PID (logs in celery.log)"

# --- Start React Frontend ---
echo "Starting React Frontend..."
cd "$FRONTEND_DIR"
npm install # Ensure dependencies are installed
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "React Frontend started with PID: $FRONTEND_PID (logs in frontend.log)"

echo ""
echo "All services started in the background."
echo "Frontend available at http://localhost:3000"
echo "Backend API available at http://localhost:5000"
echo ""
echo "To view logs: tail -f backend.log, tail -f celery.log, tail -f frontend.log"
echo "To stop all services: kill $FLASK_PID $CELERY_PID $FRONTEND_PID"
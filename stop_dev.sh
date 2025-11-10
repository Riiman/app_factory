#!/bin/bash

echo "Stopping Flask and Celery processes..."

# Find and kill the Flask server process
pkill -f "python run.py"

# Find and kill the Celery worker process
pkill -f "celery -A celery_app.celery worker"

echo "Processes stopped."

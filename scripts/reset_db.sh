#!/bin/bash
source venv/bin/activate

echo "Stopping services..."
./stop_dev.sh

echo "Deleting databases..."
rm -f instance/turningidea.db
rm -f checkpoints.sqlite
rm -f checkpoints.sqlite-shm
rm -f checkpoints.sqlite-wal

echo "Recreating database..."
flask db upgrade

echo "Reset complete. Please restart the server."

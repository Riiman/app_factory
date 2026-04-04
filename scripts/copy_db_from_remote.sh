#!/bin/bash

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="ec2-13-62-213-147.eu-north-1.compute.amazonaws.com"
KEY_FILE="startupos_key.pem"
REMOTE_DIR="/home/ubuntu/app_factory/instance"
LOCAL_DIR="instance"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "Error: Key file '$KEY_FILE' not found in current directory."
    exit 1
fi

# Ensure permission for key file
chmod 400 "$KEY_FILE"

# Backup local databases
echo "Backing up local databases..."
mkdir -p "$LOCAL_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -f "$LOCAL_DIR/turning_ideas.db" ]; then
    cp "$LOCAL_DIR/turning_ideas.db" "$LOCAL_DIR/backups/turning_ideas.db.bak_$TIMESTAMP"
    echo "Backed up turning_ideas.db"
fi

if [ -f "$LOCAL_DIR/turningidea.db" ]; then
    cp "$LOCAL_DIR/turningidea.db" "$LOCAL_DIR/backups/turningidea.db.bak_$TIMESTAMP"
    echo "Backed up turningidea.db"
fi

# Copy from remote
echo "Attempting to copy databases from remote server ($REMOTE_HOST)..."

scp -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/turning_ideas.db" "$LOCAL_DIR/turning_ideas.db" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Successfully copied turning_ideas.db"
else
    echo "turning_ideas.db not found on remote or connection failed."
fi

scp -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/turningidea.db" "$LOCAL_DIR/turningidea.db" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Successfully copied turningidea.db"
else
    echo "turningidea.db not found on remote or connection failed."
fi

echo "Done."

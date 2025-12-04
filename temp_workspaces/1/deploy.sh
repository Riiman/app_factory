#!/bin/bash
set -e

# Install server dependencies
npm install

# Run database migrations or setup if needed
if [ -f db/schema.sql ]; then
  echo "Setting up database schema..."
  # Example: sqlite3 db/database.sqlite < db/schema.sql
  # Uncomment and modify the above line as needed for your DB
fi

# Build client app
if [ -d client ]; then
  cd client
  npm install
  npm run build
  cd ..
fi

# Start server (production mode)
NODE_ENV=production node api.js

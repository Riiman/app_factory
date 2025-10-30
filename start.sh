
#!/bin/bash

# Start backend in background
source venv/bin/activate
python run.py &
BACKEND_PID=$!

# Start frontend
npm start &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

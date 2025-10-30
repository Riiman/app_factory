
#!/bin/bash

echo "=========================================="
echo "Turning Ideas App Factory - Setup Script"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your configuration values"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    echo ""
else
    echo "✓ Virtual environment already exists"
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Python dependencies installed"
echo ""

# Create uploads directory
if [ ! -d "uploads" ]; then
    echo "Creating uploads directory..."
    mkdir uploads
    echo "✓ Uploads directory created"
    echo ""
fi

# Initialize database
echo "Initializing database..."
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
echo "✓ Database initialized"
echo ""

# Validate environment variables
echo "Validating environment variables..."
python validate_env.py
echo ""

# Install frontend dependencies
if [ -d "node_modules" ]; then
    echo "✓ Frontend dependencies already installed"
else
    echo "Installing frontend dependencies..."
    npm install
    echo "✓ Frontend dependencies installed"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start backend: python run.py"
echo "3. Start frontend: npm start"
echo ""

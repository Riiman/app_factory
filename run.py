from gevent import monkey
monkey.patch_all()

from app import create_app
from app.extensions import db
from app.models import User, Submission, Startup, Evaluation
from config import get_config  # Import get_config function instead
import os

# Get the appropriate config class based on environment
config_class = get_config()
app = create_app(config_class)

# Debug: Print S3 bucket configuration
print(f"DEBUG: AWS_S3_BUCKET from os.getenv = {os.getenv('AWS_S3_BUCKET')}")
print(f"DEBUG: AWS_S3_BUCKET from app.config = {app.config.get('AWS_S3_BUCKET')}")

@app.shell_context_processor
def make_shell_context():
    """Make database models available in Flask shell"""
    return {
        'db': db,
        'User': User, 
        'Submission':Submission, 
        'Startup':Startup, 
        'Evaluation':Evaluation
    }

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    from app.extensions import socketio
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=(os.getenv('FLASK_ENV') == 'development'),
        allow_unsafe_werkzeug=True # Needed for dev
    )

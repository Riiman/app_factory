
from app import create_app
from app.extensions import db
from app.models import User, Submission, Startup, Evaluation
from app.config import Config # Import the Config class
import os

app = create_app(Config) # Pass the Config class directly

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
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )

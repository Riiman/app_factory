
from app import create_app, db
from app.models import Startup, Document, User, Submission, StageInstance, StageTemplate, Task, Metric, Artifact, Experiment, Integration
import os

app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Make database models available in Flask shell"""
    return {
        'db': db,
        'Startup': Startup,
        'Document': Document,
        'User': User, 
        'Submission':Submission, 
        'Startup':Startup, 
        'StageTemplate':StageTemplate,      # NEW
        'StageInstance':StageInstance,      # NEW
        'Task':Task,               # NEW
        'Metric':Metric,             # NEW
        'Artifact':Artifact,           # NEW
        'Experiment':Experiment,         # NEW
        'Integration':Integration,        # NEW
        'Document':Document            # Keep if still used
    }

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

from app import create_app, db
from app.models import Startup, SubmissionStage, Progress, Document
import os

app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Make database models available in Flask shell"""
    return {
        'db': db,
        'Startup': Startup,
        'SubmissionStage': SubmissionStage,
        'Progress': Progress,
        'Document': Document
    }

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)

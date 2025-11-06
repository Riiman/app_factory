import os
from app import create_app, db
from celery import Celery
from app.models import Submission, Evaluation
from app.services.evaluation_service import EvaluationService

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

# This will be initialized when the Celery worker starts, not at module import
celery = Celery(__name__)

@celery.task(name='app.tasks.run_evaluation')
def run_evaluation_task(submission_id):
    """
    Background task to run the evaluation service on a submission.
    """
    # Create app context within the task to avoid conflicts during migrations
    app = create_app()
    with app.app_context():
        submission = Submission.query.get(submission_id)
        if not submission:
            # Handle case where submission might have been deleted
            return

        try:
            evaluation_service = EvaluationService()
            analysis_results = evaluation_service.analyze_submission(submission)
            
            # Check if an evaluation already exists
            evaluation = Evaluation.query.filter_by(submission_id=submission.id).first()
            if not evaluation:
                evaluation = Evaluation(submission_id=submission.id)
            
            # Update the evaluation object with the new results
            for key, value in analysis_results.items():
                setattr(evaluation, key, value)
                
            db.session.add(evaluation)
            db.session.commit()
        except Exception as e:
            # Log the error
            # In a real app, you'd have more robust error handling/retry logic
            print(f"Error during evaluation for submission {submission_id}: {e}")
            db.session.rollback()
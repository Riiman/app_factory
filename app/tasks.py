from app.extensions import celery, db
from app.models import Submission, Evaluation
from app.services.analyzer_service import run_analysis

@celery.task(name='app.tasks.analyze_submission')
def analyze_submission_task(submission_id):
    """
    Background task to run the analysis service on a submission.
    """
    run_analysis(submission_id)

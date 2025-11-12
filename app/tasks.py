from app.extensions import celery
from app.services.analyzer_service import run_analysis
from app.services.document_generator_service import generate_scope_document
from app.services.contract_generator_service import generate_contract_document

@celery.task(name='app.tasks.analyze_submission_task')
def analyze_submission_task(submission_id):
    """Celery task to trigger the submission analysis."""
    run_analysis(submission_id)

@celery.task(name='app.tasks.generate_scope_document_task')
def generate_scope_document_task(submission_id):
    """Celery task to trigger the scope document generation."""
    generate_scope_document(submission_id)

@celery.task(name='app.tasks.generate_contract_task')
def generate_contract_task(startup_id):
    """Celery task to trigger the contract document generation."""
    generate_contract_document(startup_id)

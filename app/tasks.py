from app.extensions import celery, db
from app.services.analyzer_service import run_analysis
from app.services.document_generator_service import generate_scope_document
from app.services.contract_generator_service import generate_contract_document
from app.services.product_generator_service import generate_product_from_scope
from app.services.generation_service import generate_startup_assets
from app.models import Product, Feature

@celery.task(name='app.tasks.generate_startup_assets_task')
def generate_startup_assets_task(startup_id):
    """Celery task to trigger the generation of all startup assets."""
    print(f"--- [Celery Task] Starting asset generation for startup ID: {startup_id} ---")
    generate_startup_assets(startup_id)


@celery.task(name='app.tasks.analyze_submission_task')
def analyze_submission_task(submission_id):
    """Celery task to trigger the submission analysis."""
    print(f"--- [Celery Task] Starting analysis for submission ID: {submission_id} ---")
    run_analysis(submission_id)

@celery.task(name='app.tasks.generate_scope_document_task')
def generate_scope_document_task(submission_id):
    """Celery task to trigger the scope document generation."""
    print(f"--- [Celery Task] Starting scope document generation for submission ID: {submission_id} ---")
    generate_scope_document(submission_id)

@celery.task(name='app.tasks.generate_contract_task')
def generate_contract_task(startup_id):
    """Celery task to trigger the contract document generation."""
    generate_contract_document(startup_id)

@celery.task(name='app.tasks.generate_product_task')
def generate_product_task(startup_id):
    """
    Celery task to trigger product generation from a scope document and save
    the results to the database.
    """
    print(f"--- [Celery Task] Starting product generation for startup ID: {startup_id} ---")
    product_data = generate_product_from_scope(startup_id)

    if not product_data:
        print(f"--- [Celery Task] Error: Failed to generate product data for startup ID: {startup_id}. Aborting. ---")
        return

    try:
        # Create the main Product record
        new_product = Product(
            startup_id=startup_id,
            name=product_data.get('name', 'Unnamed Product'),
            description=product_data.get('description', '')
        )
        db.session.add(new_product)
        db.session.flush()  # Flush to get the new_product.id for the features

        # Create the associated Feature records
        features_data = product_data.get('features', [])
        for feature_item in features_data:
            new_feature = Feature(
                product_id=new_product.id,
                name=feature_item.get('name', 'Unnamed Feature'),
                description=feature_item.get('description', '')
            )
            db.session.add(new_feature)

        db.session.commit()
        print(f"--- [Celery Task] Successfully created product '{new_product.name}' for startup ID: {startup_id} ---")

    except Exception as e:
        db.session.rollback()
        print(f"--- [Celery Task] Error creating product in database for startup ID: {startup_id}. Error: {e} ---")

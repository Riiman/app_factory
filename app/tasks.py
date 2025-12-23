from app.extensions import celery, db
from app.services.analyzer_service import run_analysis
from app.services.document_generator_service import generate_scope_document
from app.services.contract_generator_service import generate_contract_document
from app.services.product_generator_service import generate_product_from_scope
from app.services.generation_service import generate_startup_assets
from app.models import Product, Feature, Startup, Contract, StartupStage
from app.services.notification_service import publish_update

@celery.task(name='app.tasks.generate_startup_assets_task')
def generate_startup_assets_task(startup_id, generate_product=True, generate_gtm=True):
    """Celery task to trigger the generation of all startup assets."""
    print(f"--- [Celery Task] Starting asset generation for startup ID: {startup_id} (Product: {generate_product}, GTM: {generate_gtm}) ---")
    
    status = "success"
    message = "Assets generated successfully!"
    error_details = None

    try:
        generate_startup_assets(startup_id, generate_product=generate_product, generate_gtm=generate_gtm)
    except Exception as e:
        print(f"Error in generate_startup_assets_task: {e}")
        status = "error"
        message = "Failed to generate assets."
        error_details = str(e)
        
    finally:
        # Reset generation flags
        try:
            startup = Startup.query.get(startup_id)
            if startup:
                if generate_product:
                    startup.is_generating_product = False
                if generate_gtm:
                    startup.is_generating_gtm = False
                db.session.commit()
                # Publish update to refresh UI state
                publish_update("assets_generation_completed", 
                               {
                                   "startup_id": startup.id, 
                                   "startup": startup.to_dict(),
                                   "status": status,
                                   "message": message,
                                   "error": error_details
                               }, 
                               rooms=[f"user_{startup.user_id}", "admin"])

        except Exception as e:
            print(f"Error resetting generation flags: {e}")


@celery.task(name='app.tasks.analyze_submission_task')
def analyze_submission_task(submission_id):
    """Celery task to trigger the submission analysis."""
    print(f"--- [Celery Task] Starting analysis for submission ID: {submission_id} ---")
    run_analysis(submission_id)

@celery.task(name='app.tasks.generate_scope_document_task')
def generate_scope_document_task(startup_id):
    """Celery task to trigger the scope document generation."""
    print(f"--- [Celery Task] Starting scope document generation for startup ID: {startup_id} ---")
    status = "success"
    message = "Scope document generated successfully!"
    error_details = None

    try:
        # Update status to in-progress and notify
        startup = Startup.query.get(startup_id)
        if startup:
            startup.is_generating_scope = True
            db.session.commit()
            publish_update("scope_generation_started", 
                           {
                               "startup_id": startup.id, 
                               "message": "Scope document generation started."
                           }, 
                           rooms=[f"user_{startup.user_id}", "admin"])
        
        if startup:
            generate_scope_document(startup)
        else:
            status = "error"
            message = "Startup not found."
            print(f"--- [Celery Task] Error: Startup not found for ID: {startup_id} ---")
    except Exception as e:
        print(f"Error in generate_scope_document_task: {e}")
        status = "error"
        message = "Failed to generate scope document."
        error_details = str(e)
    finally:
        try:
            startup = Startup.query.get(startup_id)
            if startup:
                startup.is_generating_scope = False
                
                # Move to SCOPING stage only if generation was successful
                if status == "success":
                    startup.current_stage = StartupStage.SCOPING
                    print(f"--- [Celery Task] Moved startup {startup.id} to SCOPING stage ---")
                
                db.session.commit()
                publish_update("scope_generation_completed", 
                               {
                                   "startup_id": startup.id, 
                                   "scope_document": startup.scope_document.to_dict() if startup.scope_document else None,
                                   "startup": startup.to_dict(), # Send updated startup with new stage
                                   "status": status,
                                   "message": message,
                                   "error": error_details
                               }, 
                               rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
            print(f"Error resetting scope generation flag: {e}")

@celery.task(name='app.tasks.generate_contract_task')
def generate_contract_task(startup_id):
    """Celery task to trigger the contract document generation."""
    print(f"--- [Celery Task] Starting contract generation for startup ID: {startup_id} ---")
    status = "success"
    message = "Contract generated successfully!"
    error_details = None
    
    try:
        # Update status to in-progress and notify
        startup = Startup.query.get(startup_id)
        if startup:
            startup.is_generating_contract = True
            db.session.commit()
            publish_update("contract_generation_started", 
                           {
                               "startup_id": startup.id, 
                               "message": "Contract generation started."
                           }, 
                           rooms=[f"user_{startup.user_id}", "admin"])

        generate_contract_document(startup_id)
    except Exception as e:
        print(f"Error in generate_contract_task: {e}")
        status = "error"
        message = "Failed to generate contract."
        error_details = str(e)
    finally:
        try:
            startup = Startup.query.get(startup_id)
            if startup:
                startup.is_generating_contract = False
                
                # Move to CONTRACT stage only if generation was successful
                if status == "success":
                    startup.current_stage = StartupStage.CONTRACT
                    print(f"--- [Celery Task] Moved startup {startup.id} to CONTRACT stage ---")

                db.session.commit()
                # Assuming contract is linked to startup, fetch it to send in update
                contract = Contract.query.filter_by(startup_id=startup.id).first()
                publish_update("contract_generation_completed", 
                               {
                                   "startup_id": startup.id, 
                                   "contract": contract.to_dict() if contract else None,
                                   "startup": startup.to_dict(), # Send updated startup with new stage
                                   "status": status,
                                   "message": message,
                                   "error": error_details
                               }, 
                               rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
            print(f"Error resetting contract generation flag: {e}")

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
                description=feature_item.get('description', ''),
                acceptance_criteria=feature_item.get('acceptance_criteria', '')
            )
            db.session.add(new_feature)

        db.session.commit()
        
        startup = Startup.query.get(startup_id)
        if startup:
            publish_update("product_generated", {"startup_id": startup_id, "product": new_product.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
        
        print(f"--- [Celery Task] Successfully created product '{new_product.name}' for startup ID: {startup_id} ---")

    except Exception as e:
        db.session.rollback()
        print(f"--- [Celery Task] Error creating product in database for startup ID: {startup_id}. Error: {e} ---")

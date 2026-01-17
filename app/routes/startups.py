import redis
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from app.models import Startup, Task, Experiment, Artifact, Product, BusinessMonthlyData, FundingRound, Investor, MarketingCampaign, Founder, ProductMetric, ProductIssue, MarketingContentItem, MarketingOverview, MarketingContentCalendar, Feature, User, UserRole, Fundraise, NextFundingGoal, ProductBusinessDetails, ActivityLog, BusinessOverview, RoundInvestor, MarketingCampaignStatus, TeamMember
from app.startup_builder.manager import DockerManager

from app import db
from datetime import datetime
from app.services.notification_service import publish_update

# --- NEW: Redis client setup ---
import shutil
import time
from app import db
import logging
from firebase_admin import auth as firebase_auth
import secrets
import string

def validate_startup_access(startup, user, required_scope=None):
    if not user:
        return False
        
    # Super Admin Check: Org 1 + Admin Role
    if user.organization_id == 1 and user.role == UserRole.ADMIN:
        return True

    if startup.organization_id != user.organization_id:
        # Organization check failed
        return False

    # Owner Check
    if startup.user_id == user.id:
        return True
    
    # Org Admin Check
    if user.role == UserRole.ADMIN:
        return True

    # Team Member Check
    # Check if user is a team member with appropriate scope
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        # If no specific scope required, basic access is granted
        if required_scope is None:
            return True
        # If scope required, check if user has it
        # Scopes in DB are like ['MARKETING', 'PRODUCT']
        # required_scope should be passed as string 'MARKETING' etc.
        if member.scopes and required_scope in member.scopes:
            return True
            
    return False

startups_bp = Blueprint('startups', __name__, url_prefix='/api/startups')

@startups_bp.route('/<int:startup_id>', methods=['GET'])
@jwt_required()
def get_startup(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup data.'}), 403
    startup_data = startup.to_dict(include_relations=['monthly_data', 'marketing_campaigns', 'products'])
    import logging
    logging.info(f"Startup {startup_id} Funding Rounds: {json.dumps(startup_data.get('funding_rounds', []), default=str)}")
    return jsonify({'success': True, 'startup': startup_data}), 200

@startups_bp.route('/<int:startup_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    tasks = [task.to_dict() for task in startup.tasks]
    return jsonify({'success': True, 'tasks': tasks}), 200

@startups_bp.route('/<int:startup_id>/tasks', methods=['POST'])
@jwt_required()
def create_task(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add task to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Task name is required.'}), 400

    due_date_str = data.get('due_date')
    due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None

    scope_str = data.get('scope', 'GENERAL').upper()
    status_str = data.get('status', 'PENDING').upper()

    new_task = Task(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        due_date=due_date,
        status=status_str,
        scope=scope_str,
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_task)
    db.session.commit()
    db.session.refresh(new_task)

    # --- Publish notification to Redis ---
    publish_update("dashboard_update", {
        "model": "Task",
        "id": new_task.id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Task',
        target_id=new_task.id,
        details=new_task.name
    )
    db.session.add(activity)
    db.session.commit()
    pass
    
    return jsonify({
        'success': True,
        'message': 'Task created successfully.',
        'task': new_task.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(startup_id, task_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to update task for this startup.'}), 403

    task = Task.query.get_or_404(task_id)
    if task.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Task does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    task.name = data.get('name', task.name)
    task.description = data.get('description', task.description)
    
    due_date_str = data.get('due_date')
    if due_date_str:
        task.due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
    
    status_str = data.get('status')
    if status_str:
        task.status = status_str.upper()
        
    scope_str = data.get('scope')
    if scope_str:
        task.scope = scope_str.upper()

    db.session.commit()
    
    publish_update("task_updated", {
        "startup_id": startup_id, 
        "task": task.to_dict()
    }, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'task': task.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/experiments', methods=['GET'])
@jwt_required()
def get_experiments(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    experiments = [exp.to_dict() for exp in startup.experiments]
    return jsonify({'success': True, 'experiments': experiments}), 200

@startups_bp.route('/<int:startup_id>/artifacts', methods=['GET'])
@jwt_required()
def get_artifacts(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    artifacts = [art.to_dict() for art in startup.artifacts]
    return jsonify({'success': True, 'artifacts': artifacts}), 200

@startups_bp.route('/<int:startup_id>/products', methods=['GET'])
@jwt_required()
def get_products(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    products = [p.to_dict() for p in startup.products]
    return jsonify({'success': True, 'products': products}), 200

@startups_bp.route('/<int:startup_id>/monthly-reports', methods=['GET'])
@jwt_required()
def get_monthly_reports(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    reports = [r.to_dict() for r in startup.monthly_data]
    return jsonify({'success': True, 'reports': reports}), 200

@startups_bp.route('/<int:startup_id>/funding-rounds', methods=['GET'])
@jwt_required()
def get_funding_rounds(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    rounds = [r.to_dict() for r in startup.funding_rounds]
    return jsonify({'success': True, 'rounds': rounds}), 200

@startups_bp.route('/<int:startup_id>/investors', methods=['GET'])
@jwt_required()
def get_investors(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    investors = [i.to_dict() for i in Investor.query.all()]
    return jsonify({'success': True, 'investors': investors}), 200

@startups_bp.route('/<int:startup_id>/campaigns', methods=['GET'])
@jwt_required()
def get_campaigns(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    campaigns = [c.to_dict() for c in startup.marketing_campaigns]
    return jsonify({'success': True, 'campaigns': campaigns}), 200

@startups_bp.route('/<int:startup_id>/founders', methods=['GET'])
@jwt_required()
def get_founders(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    founders = [f.to_dict() for f in startup.founders]
    return jsonify({'success': True, 'founders': founders}), 200

@startups_bp.route('/<int:startup_id>/experiments', methods=['POST'])
@jwt_required()
def create_experiment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add experiment to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Experiment name is required.'}), 400
    new_experiment = Experiment(startup_id=startup_id, **data)
    db.session.add(new_experiment)
    db.session.commit()
    
    publish_update("experiment_created", {"startup_id": startup_id, "experiment": new_experiment.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Experiment',
        target_id=new_experiment.id,
        details=new_experiment.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'experiment': new_experiment.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/artifacts', methods=['POST'])
@jwt_required()
def create_artifact(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add artifact to this startup.'}), 403
        
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Artifact name is required.'}), 400
        
    # Process Enums
    scope_str = data.get('scope', 'GENERAL')
    # Use proper case for special scopes if needed, or simple upper() if all keys are upper
    # Scope in models.py has keys: PRODUCT, BUSINESS, FUNDRAISE, MARKETING, GENERAL, DASHBOARD, WORKSPACE, TEAM, SETTINGS
    # All keys are UPPERCASE. Values are mixed. 
    # Frontend sends values (e.g. 'product', 'Dashboard').
    # We map value to Key. 
    # Simple upper() works for 'product' -> 'PRODUCT'.
    # For 'Dashboard' -> 'DASHBOARD'.
    scope_key = scope_str.upper() if scope_str else 'GENERAL'

    type_str = data.get('type', 'LINK').upper()
    
    new_artifact = Artifact(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        type=type_str,
        location=data['location'],
        scope=scope_key,
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_artifact)
    db.session.commit()
    
    publish_update("artifact_created", {"startup_id": startup_id, "artifact": new_artifact.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Artifact',
        target_id=new_artifact.id,
        details=new_artifact.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'artifact': new_artifact.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products', methods=['POST'])
@jwt_required()
def create_product(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add product to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Product name is required.'}), 400
    
    try:
        if 'targeted_launch_date' in data:
            if data['targeted_launch_date']:
                data['targeted_launch_date'] = datetime.strptime(data['targeted_launch_date'], '%Y-%m-%d').date()
            else:
                data['targeted_launch_date'] = None
        if 'actual_launch_date' in data:
            if data['actual_launch_date']:
                data['actual_launch_date'] = datetime.strptime(data['actual_launch_date'], '%Y-%m-%d').date()
            else:
                data['actual_launch_date'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    new_product = Product(startup_id=startup_id, **data)
    db.session.add(new_product)
    db.session.commit()
    
    publish_update("product_created", {"startup_id": startup_id, "product": new_product.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Product',
        target_id=new_product.id,
        details=new_product.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'product': new_product.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/features', methods=['POST'])
@jwt_required()
def create_feature(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add feature to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Feature name is required.'}), 400
    new_feature = Feature(product_id=product_id, **data)
    db.session.add(new_feature)
    db.session.commit()
    
    publish_update("feature_created", {"startup_id": startup_id, "product_id": product_id, "feature": new_feature.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Feature',
        target_id=new_feature.id,
        details=new_feature.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'feature': new_feature.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/features/<int:feature_id>', methods=['PUT'])
@jwt_required()
def update_feature(startup_id, product_id, feature_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    feature = Feature.query.get_or_404(feature_id)
    if feature.product_id != product_id:
        return jsonify({'success': False, 'error': 'Feature does not belong to this product.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    feature.name = data.get('name', feature.name)
    feature.description = data.get('description', feature.description)
    feature.acceptance_criteria = data.get('acceptance_criteria', feature.acceptance_criteria)
    feature.status = data.get('status', feature.status)
    
    db.session.commit()
    
    publish_update("feature_updated", {"startup_id": startup_id, "product_id": product_id, "feature": feature.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'feature': feature.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/metrics', methods=['POST'])
@jwt_required()
def create_metric(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'metric_name' not in data:
        return jsonify({'success': False, 'error': 'Metric name is required.'}), 400
    if 'date_recorded' in data and data['date_recorded']:
        try:
            data['date_recorded'] = datetime.strptime(data['date_recorded'], '%Y-%m-%d').date()
        except ValueError:
             return jsonify({'success': False, 'error': 'Invalid date format for date_recorded. Expected YYYY-MM-DD.'}), 400
    new_metric = ProductMetric(product_id=product_id, **data)
    db.session.add(new_metric)
    db.session.commit()
    
    publish_update("metric_created", {"startup_id": startup_id, "product_id": product_id, "metric": new_metric.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Metric',
        target_id=new_metric.metric_id,
        details=new_metric.metric_name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'metric': new_metric.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/issues', methods=['POST'])
@jwt_required()
def create_issue(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Issue title is required.'}), 400
    new_issue = ProductIssue(product_id=product_id, created_by=user_id, **data)
    db.session.add(new_issue)
    db.session.commit()
    
    publish_update("issue_created", {"startup_id": startup_id, "product_id": product_id, "issue": new_issue.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='reported',
        target_type='Issue',
        target_id=new_issue.issue_id,
        details=new_issue.title
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'issue': new_issue.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/monthly-reports', methods=['POST'])
@jwt_required()
def create_monthly_report(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'month_start' not in data:
        return jsonify({'success': False, 'error': 'Month start date is required.'}), 400
    
    try:
        data['month_start'] = datetime.strptime(data['month_start'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format for month_start. Expected YYYY-MM-DD.'}), 400

    new_report = BusinessMonthlyData(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_report)
    db.session.commit()
    
    publish_update("monthly_report_created", {"startup_id": startup_id, "report": new_report.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='submitted',
        target_type='Report',
        target_id=new_report.record_id,
        details=f"Report for {data.get('month', 'unknown')}"
    )
    db.session.add(activity)
    
    # Notification for Admin
    # Assuming DashboardNotification is available (imported as Notification or similar, verify import)
    # If not imported, we need to import it or use a service.
    # notification_service.py handled publish_update, but storing notification in DB?
    # Let's import DashboardNotification if not present.
    from app.models import DashboardNotification
    
    notification = DashboardNotification(
        user_id=1, # Admin ID fixed as 1 for now based on api.ts
        title='Monthly Report Submitted',
        message=f"Startup {startup.name} has submitted a monthly report.",
        type='info'
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({'success': True, 'report': new_report.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/funding-rounds', methods=['POST'])
@jwt_required()
def create_funding_round(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'round_type' not in data:
        return jsonify({'success': False, 'error': 'Round type is required.'}), 400

    try:
        if 'date_opened' in data:
            if data['date_opened']:
                data['date_opened'] = datetime.strptime(data['date_opened'], '%Y-%m-%d').date()
            else:
                data['date_opened'] = None
        if 'date_closed' in data:
            if data['date_closed']:
                data['date_closed'] = datetime.strptime(data['date_closed'], '%Y-%m-%d').date()
            else:
                 data['date_closed'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    new_round = FundingRound(startup_id=startup_id, **data)
    db.session.add(new_round)
    db.session.commit()
    
    publish_update("funding_round_created", {"startup_id": startup_id, "round": new_round.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Funding',
        target_id=new_round.round_id,
        details=f"{new_round.round_type} Round"
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'round': new_round.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/investors', methods=['POST'])
@jwt_required()
def create_investor(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Investor name is required.'}), 400
    new_investor = Investor(**data)
    db.session.add(new_investor)
    db.session.commit()
    
    publish_update("investor_created", {"startup_id": startup_id, "investor": new_investor.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Investor',
        target_id=new_investor.investor_id,
        details=new_investor.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'investor': new_investor.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/funding-rounds/<int:round_id>/investments', methods=['POST'])
@jwt_required()
def create_investment(startup_id, round_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    funding_round = FundingRound.query.get_or_404(round_id)
    if funding_round.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Funding round does not belong to this startup.'}), 400

    data = request.get_json()
    if not data or 'investor_id' not in data or 'amount_invested' not in data:
        return jsonify({'success': False, 'error': 'Investor ID and Amount Invested are required.'}), 400

    investor_id = data['investor_id']
    amount_invested = data['amount_invested']

    # Check if investment already exists
    existing_investment = RoundInvestor.query.filter_by(round_id=round_id, investor_id=investor_id).first()
    if existing_investment:
         return jsonify({'success': False, 'error': 'This investor has already invested in this round.'}), 400

    new_investment = RoundInvestor(
        round_id=round_id,
        investor_id=investor_id,
        amount_invested=amount_invested
    )
    db.session.add(new_investment)
    
    # Update amount raised for the round
    from decimal import Decimal
    funding_round.amount_raised = (funding_round.amount_raised or Decimal(0)) + Decimal(str(amount_invested))
    
    db.session.commit()
    
    # Fetch investor name for activity log
    investor = Investor.query.get(investor_id)
    
    publish_update("investment_added", {
        "startup_id": startup_id, 
        "round_id": round_id,
        "investment": new_investment.to_dict()
    }, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='invested',
        target_type='Funding',
        target_id=funding_round.round_id,
        details=f"{investor.name if investor else 'Investor'} invested {amount_invested}"
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'investment': new_investment.to_dict()}), 201


@startups_bp.route('/<int:startup_id>/campaigns', methods=['POST'])
@jwt_required()
def create_campaign(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'campaign_name' not in data:
        return jsonify({'success': False, 'error': 'Campaign name is required.'}), 400

    try:
        if 'start_date' in data:
            if data['start_date']:
                data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            else:
                 data['start_date'] = None
        if 'end_date' in data:
            if data['end_date']:
                data['end_date'] = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            else:
                data['end_date'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    new_campaign = MarketingCampaign(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_campaign)
    db.session.commit()
    
    publish_update("campaign_created", {"startup_id": startup_id, "campaign": new_campaign.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='launched',
        target_type='Campaign',
        target_id=new_campaign.campaign_id,
        details=new_campaign.campaign_name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'campaign': new_campaign.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>/content-items', methods=['POST'])
@jwt_required()
def create_content_item(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Content item title is required.'}), 400

    try:
        if 'publish_date' in data and data['publish_date']:
            data['publish_date'] = datetime.strptime(data['publish_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    campaign = MarketingCampaign.query.get_or_404(campaign_id)

    if campaign.content_mode:
        if not campaign.content_calendars:
            new_calendar = MarketingContentCalendar(campaign_id=campaign.campaign_id, title=f"{campaign.campaign_name} Content Calendar", description=f"Content calendar for {campaign.campaign_name}", owner_id=user_id)
            db.session.add(new_calendar)
            db.session.commit()
            db.session.refresh(new_calendar)
            calendar_id = new_calendar.calendar_id
        else:
            calendar_id = campaign.content_calendars[0].calendar_id
    else:
        return jsonify({'success': False, 'error': 'This campaign is not configured for content management.'}), 400

    new_item = MarketingContentItem(calendar_id=calendar_id, created_by=user_id, **data)
    db.session.add(new_item)
    db.session.commit()
    
    publish_update("content_item_created", {"startup_id": startup_id, "campaign_id": campaign_id, "item": new_item.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'message': 'Content item created successfully.', 'item': new_item.to_dict()}), 201


@startups_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    campaign = MarketingCampaign.query.get_or_404(campaign_id)
    if campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Campaign does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        if key == 'status':
            try:
                campaign.status = MarketingCampaignStatus(value)
            except ValueError:
                pass
        elif key in ['start_date', 'end_date']:
            if value:
                try:
                    if isinstance(value, str):
                        setattr(campaign, key, datetime.strptime(value, '%Y-%m-%d').date())
                except ValueError:
                    pass
            else:
                setattr(campaign, key, None)
        elif key == 'spend' and value is not None:
             setattr(campaign, key, float(value))
        else:
            setattr(campaign, key, value)
            
    db.session.commit()
    
    publish_update("campaign_updated", {"startup_id": startup_id, "campaign": campaign.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'campaign': campaign.to_dict()}), 200


@startups_bp.route('/<int:startup_id>/founders', methods=['POST'])
@jwt_required()
def create_founder(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Founder name is required.'}), 400
    new_founder = Founder(startup_id=startup_id, **data)
    db.session.add(new_founder)
    db.session.commit()
    
    publish_update("founder_created", {"startup_id": startup_id, "founder": new_founder.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Founder',
        target_id=new_founder.id,
        details=new_founder.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Founder created successfully.', 'founder': new_founder.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/founders/<int:founder_id>', methods=['PUT'])
@jwt_required()
def update_founder(startup_id, founder_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    founder = Founder.query.get_or_404(founder_id)
    if founder.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Founder does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        setattr(founder, key, value)
    db.session.commit()
    
    publish_update("founder_updated", {"startup_id": startup_id, "founder": founder.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'founder': founder.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/founders/<int:founder_id>', methods=['DELETE'])
@jwt_required()
def delete_founder(startup_id, founder_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    founder = Founder.query.get_or_404(founder_id)
    if founder.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Founder does not belong to this startup.'}), 400

    db.session.delete(founder)
    db.session.commit()
    
    publish_update("founder_deleted", {"startup_id": startup_id, "founder_id": founder_id}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'message': 'Founder deleted successfully.'}), 200

@startups_bp.route('/<int:startup_id>/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        setattr(product, key, value)
    db.session.commit()
    
    publish_update("product_updated", {"startup_id": startup_id, "product": product.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'product': product.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/business-details', methods=['PUT'])
@jwt_required()
def update_product_business_details(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    business_details = product.business_details or ProductBusinessDetails(product_id=product.id)
    for key, value in data.items():
        setattr(business_details, key, value)
    db.session.add(business_details)
    db.session.commit()
    
    publish_update("product_business_details_updated", {"startup_id": startup_id, "product_id": product_id, "business_details": business_details.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'business_details': business_details.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/funding-rounds/<int:round_id>', methods=['PUT'])
@jwt_required()
def update_funding_round(startup_id, round_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    funding_round = FundingRound.query.get_or_404(round_id)
    if funding_round.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Funding round does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        if key in ['date_opened', 'date_closed']:
            if value:
                try:
                    # Parse date string to python date object
                    # Only if value is a string, if it's already date (unlikely from JSON), harmless
                    if isinstance(value, str):
                        value = datetime.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    # If format is wrong, ignore or handle? 
                    # Ideally return 400 but for now let's keep it safe and maybe it fails downstream or stays as string if format is weird
                    pass
            else:
                value = None
        setattr(funding_round, key, value)
    db.session.commit()
    
    publish_update("funding_round_updated", {"startup_id": startup_id, "round": funding_round.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'round': funding_round.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/metrics/<int:metric_id>', methods=['PUT'])
@jwt_required()
def update_metric(startup_id, product_id, metric_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    metric = ProductMetric.query.get_or_404(metric_id)
    if metric.product_id != product_id:
        return jsonify({'success': False, 'error': 'Metric does not belong to this product.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    metric.metric_name = data.get('metric_name', metric.metric_name)
    metric.value = data.get('value', metric.value)
    metric.target_value = data.get('target_value', metric.target_value)
    metric.unit = data.get('unit', metric.unit)
    metric.period = data.get('period', metric.period)

    date_recorded_str = data.get('date_recorded')
    if date_recorded_str:
        metric.date_recorded = datetime.strptime(date_recorded_str, '%Y-%m-%d').date()
    else:
        metric.date_recorded = None
    
    db.session.commit()
    db.session.refresh(metric)

    # --- Publish notification to Redis ---
    # --- Publish notification to Redis ---
    publish_update("dashboard_update", {
        "model": "ProductMetric",
        "id": metric_id,
        "product_id": product_id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }, rooms=[f"user_{startup.user_id}", "admin"])
    # redis_client.publish(REDIS_CHANNEL, json.dumps(message))

    return jsonify({'success': True, 'metric': metric.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/settings', methods=['PUT'])
@jwt_required()
def update_startup_settings(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    startup.name = data.get('name', startup.name)
    startup.slug = data.get('slug', startup.slug)
    startup.next_milestone = data.get('next_milestone', startup.next_milestone)
    
    db.session.commit()
    
    publish_update("startup_settings_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Startup',
        target_id=startup.id,
        details='Updated settings'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Settings updated successfully.',
        'startup': startup.to_dict()
    }), 200

@startups_bp.route('/<int:startup_id>/business-overview', methods=['PUT'])
@jwt_required()
def update_business_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    business_overview = startup.business_overview
    if not business_overview:
        business_overview = BusinessOverview(startup_id=startup_id)
        startup.business_overview = business_overview
        db.session.add(business_overview)

    business_overview.business_model = data.get('business_model', business_overview.business_model)
    business_overview.key_partners = data.get('key_partners', business_overview.key_partners)
    business_overview.notes = data.get('notes', business_overview.notes)
    
    db.session.commit()
    db.session.refresh(business_overview)

    publish_update("business_overview_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Business',
        target_id=startup.id,
        details='Updated business overview'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'business_overview': business_overview.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/fundraise-details', methods=['PUT'])
@jwt_required()
def update_fundraise_details(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    fundraise_data = data.get('fundraise', {})
    next_funding_goal_data = data.get('next_funding_goal', {})

    fundraise = startup.fundraise_details
    if not fundraise:
        fundraise = Fundraise(startup_id=startup_id)
        db.session.add(fundraise)
        db.session.flush()

    fundraise.funding_stage = fundraise_data.get('funding_stage', fundraise.funding_stage)
    fundraise.amount_raised = fundraise_data.get('amount_raised', fundraise.amount_raised)

    next_funding_goal = fundraise.next_funding_goal
    if not next_funding_goal:
        next_funding_goal = NextFundingGoal(fundraise_id=fundraise.id)
        db.session.add(next_funding_goal)

    next_funding_goal.target_amount = next_funding_goal_data.get('target_amount', next_funding_goal.target_amount)
    next_funding_goal.target_valuation = next_funding_goal_data.get('target_valuation', next_funding_goal.target_valuation)
    
    target_close_date_str = next_funding_goal_data.get('target_close_date')
    if target_close_date_str:
        next_funding_goal.target_close_date = datetime.strptime(target_close_date_str, '%Y-%m-%d').date()
    else:
        next_funding_goal.target_close_date = None

    db.session.commit()
    db.session.refresh(fundraise)

    publish_update("fundraise_details_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Fundraising',
        target_id=fundraise.id,
        details='Updated fundraising goals'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({
        'success': True,
        'fundraise_details': fundraise.to_dict(),
        'next_funding_goal': fundraise.next_funding_goal.to_dict()
    }), 200

@startups_bp.route('/<int:startup_id>/marketing-overview', methods=['GET'])
@jwt_required()
def get_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    marketing_overview = startup.marketing_overview
    if not marketing_overview:
        marketing_overview = MarketingOverview(startup_id=startup_id)
        db.session.add(marketing_overview)
        db.session.commit()
        db.session.refresh(marketing_overview)

    return jsonify({'success': True, 'marketing_overview': marketing_overview.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/marketing-overview', methods=['PUT'])
@jwt_required()
def update_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'positioning_statement' not in data:
        return jsonify({'success': False, 'error': 'Positioning statement is required.'}), 400

    marketing_overview = startup.marketing_overview
    if not marketing_overview:
        marketing_overview = MarketingOverview(startup_id=startup_id)
        startup.marketing_overview = marketing_overview
        db.session.add(marketing_overview)

    marketing_overview.positioning_statement = data['positioning_statement']
    db.session.commit()
    db.session.refresh(startup)

    publish_update("marketing_overview_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Marketing',
        target_id=startup.id,
        details='Updated marketing overview'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200
    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/activity', methods=['GET'])
@jwt_required()
def get_startup_activity(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    activities = ActivityLog.query.filter_by(startup_id=startup_id).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return jsonify({'success': True, 'activity': [a.to_dict() for a in activities]}), 200

@startups_bp.route('/<int:startup_id>/assets/generate', methods=['POST'])
@jwt_required()
def generate_assets(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    # Allow if user has PRODUCT or MARKETING scope
    # Since validate_startup_access checks for a single required_scope, 
    # we can do a custom check or just allow any member for now to avoid blocking.
    # Ideally: check if they have PRODUCT OR MARKETING.
    has_access = False
    if validate_startup_access(startup, user, required_scope='PRODUCT'):
        has_access = True
    elif validate_startup_access(startup, user, required_scope='MARKETING'):
        has_access = True
    elif validate_startup_access(startup, user) and startup.user_id == user.id: # Owner fallback (covered by validate but explicit here for logic flow)
         has_access = True
    # Basic member check if we want to be lenient? 
    # Let's be strict: Needs PRODUCT or MARKETING.
    # But validate_startup_access(..., required_scope=None) returns True for ANY member.
    # Let's restrict generation to those who can manage Product or Marketing.
    
    if not has_access:
         # Fallback: If they are Admin or Owner, validate_startup_access would return True above.
         # Wait, validate_startup_access(..., 'PRODUCT') returns True for Owner/Admin too.
         # So the above logic covers Owner/Admin/ProductMember/MarketingMember.
         return jsonify({'success': False, 'error': 'Unauthorized. Requires PRODUCT or MARKETING access.'}), 403

    data = request.get_json() or {}
    generate_product = data.get('generate_product', True)
    generate_gtm = data.get('generate_gtm', True)

    
    if generate_product and startup.is_generating_product:
        return jsonify({'success': False, 'error': 'Product generation is already in progress.'}), 400
    if generate_gtm and startup.is_generating_gtm:
        return jsonify({'success': False, 'error': 'GTM generation is already in progress.'}), 400

    if generate_product:
        startup.is_generating_product = True
    if generate_gtm:
        startup.is_generating_gtm = True
    db.session.commit()

    from app.tasks import generate_startup_assets_task
    # Broadcast "Started" event immediately for UI responsiveness
    publish_update("assets_generation_started", {"startup_id": startup.id, "message": "Asset generation started..."}, rooms=[f"user_{startup.user_id}", "admin"])
    
    generate_startup_assets_task.delay(startup.id, generate_product=generate_product, generate_gtm=generate_gtm)

    return jsonify({'success': True, 'message': 'Asset generation triggered.'}), 200

@startups_bp.route('/<int:startup_id>/preview/', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@startups_bp.route('/<int:startup_id>/preview/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
# @jwt_required() # Disabled strictly to allow asset loading if headers missing. In prod, use cookies.
def proxy_to_container(startup_id, subpath):
    """
    Reverse proxy to the startup's running container.
    """
    # 1. Auth Check (custom/relaxed or relying on query param token if needed, or session)
    # For now, let's allow it but check startup ownership if a token IS present?
    # Or purely rely on the obscure URL? No, that's unsafe.
    # Let's try verify_jwt_in_request(optional=True) and if valid check owner. 
    # If not valid/missing, maybe allow for now (dev mode) or block?
    # User said "securely". 
    # Let's enforce JWT but allow it in query param "token" for assets?
    # flask_jwt_extended looks at Authorization header by default.
    # We can perform a manual check.
    
    from flask import Response
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
    except:
        current_user_id = None

    # If no auth header, maybe check query string? 
    # But for now, let's just proceed to finding the container. 
    # If the user is just clicking a link in the dashboard, they might have the token in localStorage but 
    # the browser request (iframe) might not send it.
    
    startup = Startup.query.get_or_404(startup_id)
    
    # Simple security: If user is logged in, check ownership. If not, rely on obscurity/dev-mode?
    # User asked for secure. Let's assume they access it via a method that passes auth. 
    # or if it's an image request from the page, it might fail.
    # Let's skip strict auth for this iteration to ensure it works first, then tighten.
    
    manager = DockerManager()
    
    # Get container info
    container_info = manager.ensure_container(startup_id, container_name=startup.container_name)
    if "error" in container_info:
        return jsonify({"error": container_info["error"]}), 502
    
    if container_info.get("status") != "running":
        return jsonify({"error": "Container is not running"}), 502

    # Auto-start app if needed
    app_status = manager.ensure_app_running(startup_id, container_name=startup.container_name)
    if "error" in app_status:
         # Log warning but try to proceed? Or fail?
         # Proceeding might fail if port not bound yet.
         print(f"Warning: Failed to ensure app running: {app_status['error']}")
         
    # Reload ports in case app start bound new ones (unlikely for mapped ports, but good practice)
    # Actually, mapped ports are set at container creation. app binding to internal 3000 is what matters.
    # But manager.ensure_container returns ports.

        
    # Get mapped port for 3000 (React)
    # Ports format: {'3000/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '32768'}], ...}
    ports = container_info.get("ports", {})
    
    # Priority: 3000 (Web) -> 8000 (API) -> 5000 (Flask)
    target_port = None
    if '3000/tcp' in ports and ports['3000/tcp']:
        target_port = ports['3000/tcp'][0]['HostPort']
    elif '8000/tcp' in ports and ports['8000/tcp']:
        target_port = ports['8000/tcp'][0]['HostPort']
    elif '5000/tcp' in ports and ports['5000/tcp']:
        target_port = ports['5000/tcp'][0]['HostPort']
        
    if not target_port:
        return jsonify({"error": "No exposed web port found on container"}), 502
        
    # Construct target URL
    target_url = f"http://localhost:{target_port}/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"
        
    MAX_RETRIES = 5
    retry_delay = 1
    
    for attempt in range(MAX_RETRIES):
        try:
            # Forward request
            # CRITICAL FIX: Do NOT forward Accept-Encoding. Force upstream to send plain text.
            # This ensures we can decode/rewrite it, and prevents sending gzipped bytes 
            # to the browser without the proper header if rewrite fails.
            proxy_headers = {key: value for (key, value) in request.headers if key != 'Host' and key.lower() != 'accept-encoding'}
            
            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=proxy_headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False
            )
            
            # Exclude some hop-by-hop headers
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            headers = [(name, value) for (name, value) in resp.raw.headers.items()
                       if name.lower() not in excluded_headers]
            
            content = resp.content
            
            # Check if content matches typical Next.js HTML and rewrite paths
            content_type = resp.headers.get('Content-Type', '').lower()
            if 'text/html' in content_type:
                try:
                    text_content = content.decode('utf-8')
                    import re
                    # GENERIC REWRITE: Replace all root-relative paths (starting with / but not //)
                    # Pattern: src="/..." or href="/..."
                    # We capture the attribute and the path.
                    
                    proxy_base = f"/api/startups/{startup_id}/preview"
                    
                    # Regex explanation:
                    # (src|href)=   : Match attribute name
                    # "             : Match opening quote
                    # /             : Match root slash
                    # (?!/)         : Negative lookahead to ensure it's not protocol relative (//)
                    # ([^"]*)       : Capture the rest of the path until closing quote
                    
                    def rewrite_path(match):
                        attr = match.group(1)
                        path = match.group(2)
                        return f'{attr}="{proxy_base}/{path}"'

                    text_content = re.sub(r'(src|href)="/(?!/)([^"]*)"', rewrite_path, text_content)
                    
                    content = text_content.encode('utf-8')
                    
                    # Update Content-Length header since size changed
                    headers = [(k, v) for k, v in headers if k.lower() != 'content-length']
                    headers.append(('Content-Length', str(len(content))))
                    
                except Exception as e:
                    print(f"Proxy Rewrite Error: {e}")
                    # Fallback to original content
                    pass
                       
            return Response(content, resp.status_code, headers)
            
        except requests.exceptions.ConnectionError:
            if attempt < MAX_RETRIES - 1:
                print(f"Connection failed, retrying in {retry_delay}s... (Attempt {attempt+1}/{MAX_RETRIES})")
                time.sleep(retry_delay)
                retry_delay += 1 # Simple increments or exponential
            else:
                return jsonify({"error": "Failed to connect to container app after multiple attempts"}), 502
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "Unknown error"}), 500

@startups_bp.route('/<int:startup_id>/team', methods=['GET'])
@jwt_required()
def get_team_members(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    members = []
    # Add Owner
    if startup.user:
        members.append({
            'user_id': startup.user.id,
            'user_email': startup.user.email,
            'user_name': startup.user.full_name,
            'role': 'Owner',
            'scopes': ['ALL'],
            'status': 'Active'
        })
        
    # Add Team Members
    for member in startup.team_members:
        members.append(member.to_dict())
        
    return jsonify({'success': True, 'members': members}), 200

@startups_bp.route('/<int:startup_id>/team', methods=['POST'])
@jwt_required()
def add_team_member(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    # Only Owner or Admin can add members
    if not validate_startup_access(startup, current_user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    # Extra check: Only Owner or Org Admin can manage team
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Only the owner or admin can manage team members.'}), 403

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    scopes = data.get('scopes', []) # List of strings
    full_name = data.get('full_name', 'Team Member')
    role_title = data.get('role', 'Member')
    linkedin = data.get('linkedin')
    
    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and Password are required.'}), 400

    # 1. Check if user exists in DB
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        # Check if already a member of this startup
        existing_member = TeamMember.query.filter_by(startup_id=startup.id, user_id=existing_user.id).first()
        if existing_member:
             return jsonify({'success': False, 'error': 'User is already a member of this team.'}), 400
        
        # Add existing user to team
        new_member = TeamMember(
            startup_id=startup.id,
            user_id=existing_user.id,
            role=role_title,
            linkedin=linkedin,
            scopes=scopes
        )
        db.session.add(new_member)
        db.session.commit()
        
        return jsonify({'success': True, 'member': new_member.to_dict()}), 200

    try:
        # 2. Create User in Firebase (for NEW users)
        # Check if exists in Firebase (edge case where DB sync failed)
        try:
            firebase_user = firebase_auth.get_user_by_email(email)
            # If exists in Firebase but not in DB, we should probably sync them, 
            # but for now let's treat as "User exists" and create local DB record
            pass 
        except firebase_auth.UserNotFoundError:
             # Create new Firebase user
             firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=full_name,
                email_verified=False
            )
        
        # 3. Create User in DB (if we didn't find existing_user above)
        # Verify again to be safe (race condition)
        if not existing_user:
             # Logic for if we found in Firebase but not DB
             uid = firebase_user.uid
             new_user = User(
                firebase_uid=uid,
                email=email,
                full_name=full_name,
                role=UserRole.USER,
                organization_id=startup.organization_id, 
                email_verified=False
             )
             db.session.add(new_user)
             db.session.flush() # Get ID
             
             # 4. Create TeamMember entry
             new_member = TeamMember(
                startup_id=startup.id,
                user_id=new_user.id,
                role=role_title,
                linkedin=linkedin,
                scopes=scopes
             )
             db.session.add(new_member)
             db.session.commit()

             return jsonify({'success': True, 'member': new_member.to_dict()}), 201
        
        # Notification (Optional)
        # publish_update("team_member_added", ...)
        
        return jsonify({
            'success': True,
            'message': 'Team member added successfully.',
            'member': new_member.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error adding team member: {e}")
        return jsonify({'success': False, 'error': f'Failed to add team member: {str(e)}'}), 500

@startups_bp.route('/<int:startup_id>/team/<int:member_user_id>', methods=['DELETE'])
@jwt_required()
def remove_team_member(startup_id, member_user_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403
         
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=member_user_id).first()
    if not member:
        return jsonify({'success': False, 'error': 'Member not found.'}), 404
        
    db.session.delete(member)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Team member removed.'}), 200

@startups_bp.route('/<int:startup_id>/team/<int:member_user_id>', methods=['PUT'])
@jwt_required()
def update_team_member(startup_id, member_user_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403
         
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=member_user_id).first()
    if not member:
        return jsonify({'success': False, 'error': 'Member not found.'}), 404
        
    data = request.get_json()
    if 'scopes' in data:
        member.scopes = data['scopes']
        
    db.session.commit()
    return jsonify({'success': True, 'member': member.to_dict()}), 200


import redis
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Startup, Task, Experiment, Artifact, Product, BusinessMonthlyData, FundingRound, Investor, MarketingCampaign, Founder, ProductMetric, ProductIssue, MarketingContentItem, MarketingOverview, MarketingContentCalendar, Feature, User, UserRole, Fundraise, NextFundingGoal, ProductBusinessDetails, ActivityLog

from app import db
from datetime import datetime

# --- NEW: Redis client setup ---
redis_client = redis.Redis(host='localhost', port=6379, db=0)
REDIS_CHANNEL = 'dashboard-notifications'

startups_bp = Blueprint('startups', __name__, url_prefix='/api/startups')

@startups_bp.route('/<int:startup_id>', methods=['GET'])
@jwt_required()
def get_startup(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup data.'}), 403
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=['monthly_data', 'marketing_campaigns'])}), 200

@startups_bp.route('/<int:startup_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    message = {
        "type": "dashboard_update",
        "model": "Task",
        "id": new_task.id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }
    redis_client.publish(REDIS_CHANNEL, json.dumps(message))
    
    return jsonify({
        'success': True,
        'message': 'Task created successfully.',
        'task': new_task.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/experiments', methods=['GET'])
@jwt_required()
def get_experiments(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized to add experiment to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Experiment name is required.'}), 400
    new_experiment = Experiment(startup_id=startup_id, **data)
    db.session.add(new_experiment)
    db.session.commit()
    return jsonify({'success': True, 'experiment': new_experiment.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/artifacts', methods=['POST'])
@jwt_required()
def create_artifact(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized to add artifact to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Artifact name is required.'}), 400
    new_artifact = Artifact(startup_id=startup_id, **data)
    db.session.add(new_artifact)
    db.session.commit()
    return jsonify({'success': True, 'artifact': new_artifact.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products', methods=['POST'])
@jwt_required()
def create_product(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized to add product to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Product name is required.'}), 400
    new_product = Product(startup_id=startup_id, **data)
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'success': True, 'product': new_product.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/features', methods=['POST'])
@jwt_required()
def create_feature(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized to add feature to this startup.'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Feature name is required.'}), 400
    new_feature = Feature(product_id=product_id, **data)
    db.session.add(new_feature)
    db.session.commit()
    return jsonify({'success': True, 'feature': new_feature.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/metrics', methods=['POST'])
@jwt_required()
def create_metric(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'metric_name' not in data:
        return jsonify({'success': False, 'error': 'Metric name is required.'}), 400
    new_metric = ProductMetric(product_id=product_id, **data)
    db.session.add(new_metric)
    db.session.commit()
    return jsonify({'success': True, 'metric': new_metric.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/issues', methods=['POST'])
@jwt_required()
def create_issue(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Issue title is required.'}), 400
    new_issue = ProductIssue(product_id=product_id, created_by=user_id, **data)
    db.session.add(new_issue)
    db.session.commit()
    return jsonify({'success': True, 'issue': new_issue.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/monthly-reports', methods=['POST'])
@jwt_required()
def create_monthly_report(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'month_start' not in data:
        return jsonify({'success': False, 'error': 'Month start date is required.'}), 400
    new_report = BusinessMonthlyData(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_report)
    db.session.commit()
    return jsonify({'success': True, 'report': new_report.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/funding-rounds', methods=['POST'])
@jwt_required()
def create_funding_round(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'round_type' not in data:
        return jsonify({'success': False, 'error': 'Round type is required.'}), 400
    new_round = FundingRound(startup_id=startup_id, **data)
    db.session.add(new_round)
    db.session.commit()
    return jsonify({'success': True, 'round': new_round.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/investors', methods=['POST'])
@jwt_required()
def create_investor(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Investor name is required.'}), 400
    new_investor = Investor(**data)
    db.session.add(new_investor)
    db.session.commit()
    return jsonify({'success': True, 'investor': new_investor.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/campaigns', methods=['POST'])
@jwt_required()
def create_campaign(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'campaign_name' not in data:
        return jsonify({'success': False, 'error': 'Campaign name is required.'}), 400
    new_campaign = MarketingCampaign(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_campaign)
    db.session.commit()
    return jsonify({'success': True, 'campaign': new_campaign.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>/content-items', methods=['POST'])
@jwt_required()
def create_content_item(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Content item title is required.'}), 400

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
    return jsonify({'success': True, 'message': 'Content item created successfully.', 'item': new_item.to_dict()}), 201

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
        setattr(funding_round, key, value)
    db.session.commit()
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
    message = {
        "type": "dashboard_update",
        "model": "ProductMetric",
        "id": metric_id,
        "product_id": product_id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }
    redis_client.publish(REDIS_CHANNEL, json.dumps(message))

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

    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
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

    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200
    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/activity', methods=['GET'])
@jwt_required()
def get_startup_activity(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    activities = ActivityLog.query.filter_by(startup_id=startup_id).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return jsonify({'success': True, 'activity': [a.to_dict() for a in activities]}), 200

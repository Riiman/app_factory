from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Startup, Task, Experiment, Artifact, Product, BusinessMonthlyData, FundingRound, Investor, MarketingCampaign, Founder, ProductMetric, ProductIssue, MarketingContentItem, MarketingOverview, MarketingContentCalendar, Feature, User, UserRole
from app import db
from datetime import datetime

startups_bp = Blueprint('startups', __name__, url_prefix='/api/startups')

@startups_bp.route('/<int:startup_id>', methods=['GET'])
@jwt_required()
def get_startup(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)  # Cast to integer
    user = User.query.get(user_id)

    print(f"--- DEBUG: get_startup ---")
    print(f"--- DEBUG: startup.user_id = {startup.user_id} ---")
    print(f"--- DEBUG: user_id (from JWT) = {user_id} ---")
    if user:
        print(f"--- DEBUG: user.role = {user.role} ---")
        print(f"--- DEBUG: user.role == UserRole.ADMIN = {user.role == UserRole.ADMIN} ---")
    else:
        print(f"--- DEBUG: user is None ---")

    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup data.'}), 403
    # Return lean startup data - relations will be fetched by specific endpoints
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=['monthly_data', 'marketing_campaigns'])}), 200

# --- New Endpoints for Lazy Loading ---

@startups_bp.route('/<int:startup_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    tasks = [task.to_dict() for task in startup.tasks]
    return jsonify({'success': True, 'tasks': tasks}), 200

@startups_bp.route('/<int:startup_id>/tasks', methods=['POST'])
@jwt_required()
def create_task(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    
    # Simple authorization check, can be expanded
    if startup.user_id != session.get('user_id') and session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Unauthorized to add task to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Task name is required.'}), 400

    due_date_str = data.get('due_date')
    due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None

    # Ensure the scope is uppercase to match the Enum
    scope_str = data.get('scope', 'GENERAL').upper()

    # Ensure the status is uppercase to match the Enum
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
    
    return jsonify({
        'success': True,
        'message': 'Task created successfully.',
        'task': new_task.to_dict()
    }), 201


@startups_bp.route('/<int:startup_id>/experiments', methods=['GET'])
@jwt_required()
def get_experiments(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    experiments = [exp.to_dict() for exp in startup.experiments]
    return jsonify({'success': True, 'experiments': experiments}), 200

@startups_bp.route('/<int:startup_id>/artifacts', methods=['GET'])
@jwt_required()
def get_artifacts(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    artifacts = [art.to_dict() for art in startup.artifacts]
    return jsonify({'success': True, 'artifacts': artifacts}), 200

@startups_bp.route('/<int:startup_id>/products', methods=['GET'])
@jwt_required()
def get_products(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    products = [p.to_dict() for p in startup.products]
    return jsonify({'success': True, 'products': products}), 200

@startups_bp.route('/<int:startup_id>/monthly-reports', methods=['GET'])
@jwt_required()
def get_monthly_reports(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    reports = [r.to_dict() for r in startup.monthly_data]
    return jsonify({'success': True, 'reports': reports}), 200

@startups_bp.route('/<int:startup_id>/funding-rounds', methods=['GET'])
@jwt_required()
def get_funding_rounds(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    rounds = [r.to_dict() for r in startup.funding_rounds]
    return jsonify({'success': True, 'rounds': rounds}), 200

@startups_bp.route('/<int:startup_id>/investors', methods=['GET'])
@jwt_required()
def get_investors(startup_id):
    # Note: Investors are not directly tied to a startup in the current model,
    # so we return all investors for the CRM.
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    investors = [i.to_dict() for i in Investor.query.all()]
    return jsonify({'success': True, 'investors': investors}), 200

@startups_bp.route('/<int:startup_id>/campaigns', methods=['GET'])
@jwt_required()
def get_campaigns(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    campaigns = [c.to_dict() for c in startup.marketing_campaigns]
    return jsonify({'success': True, 'campaigns': campaigns}), 200

@startups_bp.route('/<int:startup_id>/founders', methods=['GET'])
@jwt_required()
def get_founders(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    founders = [f.to_dict() for f in startup.founders]
    return jsonify({'success': True, 'founders': founders}), 200

# ... (rest of the file with POST/PUT routes) ...
    startup = Startup.query.get_or_404(startup_id)
    
    # Ensure the logged-in user owns this startup
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized to add task to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Task name is required.'}), 400

    new_task = Task(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        due_date=data.get('due_date'),
        status=data.get('status', 'pending'),
        scope=data.get('scope', 'general'),
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Task created successfully.',
        'task': new_task.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/experiments', methods=['POST'])
@jwt_required()
def create_experiment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized to add experiment to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Experiment name is required.'}), 400

    new_experiment = Experiment(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        assumption=data.get('assumption'),
        validation_method=data.get('validation_method'),
        status=data.get('status', 'planned'),
        scope=data.get('scope', 'general'),
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_experiment)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Experiment created successfully.',
        'experiment': new_experiment.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/artifacts', methods=['POST'])
@jwt_required()
def create_artifact(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized to add artifact to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data or 'type' not in data or 'location' not in data:
        return jsonify({'success': False, 'error': 'Missing required fields for artifact.'}), 400

    new_artifact = Artifact(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        type=data['type'],
        location=data['location'],
        scope=data.get('scope', 'general'),
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_artifact)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Artifact created successfully.',
        'artifact': new_artifact.to_dict()
    }), 201

# Add all other creation routes below...
@startups_bp.route('/<int:startup_id>/products', methods=['POST'])
@jwt_required()
def create_product(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized to add product to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Product name is required.'}), 400

    # Ensure the stage is uppercase to match the Enum
    stage_str = data.get('stage', 'CONCEPT').upper()

    new_product = Product(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        stage=stage_str,
        version=data.get('version', '1.0')
    )
    
    db.session.add(new_product)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Product created successfully.',
        'product': new_product.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/features', methods=['POST'])
@jwt_required()
def create_feature(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized to add feature to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Feature name is required.'}), 400

    new_feature = Feature(
        product_id=product_id,
        name=data['name'],
        description=data.get('description')
    )
    
    db.session.add(new_feature)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Feature created successfully.',
        'feature': new_feature.to_dict()
    }), 201

# ... (previous routes) ...

@startups_bp.route('/<int:startup_id>/products/<int:product_id>/metrics', methods=['POST'])
@jwt_required()
def create_metric(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'metric_name' not in data:
        return jsonify({'success': False, 'error': 'Metric name is required.'}), 400

    date_recorded_str = data.get('date_recorded')
    date_recorded = datetime.strptime(date_recorded_str, '%Y-%m-%d').date() if date_recorded_str else None

    new_metric = ProductMetric(
        product_id=product_id,
        metric_name=data['metric_name'],
        value=data.get('value'),
        target_value=data.get('target_value'),
        unit=data.get('unit'),
        period=data.get('period'),
        date_recorded=date_recorded
    )
    db.session.add(new_metric)
    db.session.commit()
    return jsonify({'success': True, 'metric': new_metric.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/products/<int:product_id>/issues', methods=['POST'])
@jwt_required()
def create_issue(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Issue title is required.'}), 400

    new_issue = ProductIssue(
        product_id=product_id,
        title=data['title'],
        description=data.get('description'),
        severity=data.get('severity'),
        status=data.get('status', 'Open'),
        created_by=session.get('user_id')
    )
    db.session.add(new_issue)
    db.session.commit()
    return jsonify({'success': True, 'issue': new_issue.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/monthly-reports', methods=['POST'])
@jwt_required()
def create_monthly_report(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'month_start' not in data:
        return jsonify({'success': False, 'error': 'Month start date is required.'}), 400

    month_start_str = data.get('month_start')
    month_start = datetime.strptime(month_start_str, '%Y-%m-%d').date() if month_start_str else None

    new_report = BusinessMonthlyData(
        startup_id=startup_id,
        month_start=month_start,
        total_revenue=data.get('total_revenue'),
        total_expenses=data.get('total_expenses'),
        net_burn=data.get('net_burn'),
        cash_in_bank=data.get('cash_in_bank'),
        mrr=data.get('mrr'),
        churn_rate=data.get('churn_rate'),
        new_customers=data.get('new_customers'),
        total_customers=data.get('total_customers'),
        key_highlights=data.get('key_highlights'),
        key_challenges=data.get('key_challenges'),
        next_focus=data.get('next_focus'),
        created_by=session.get('user_id')
    )
    db.session.add(new_report)
    db.session.commit()
    return jsonify({'success': True, 'report': new_report.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/funding-rounds', methods=['POST'])
@jwt_required()
def create_funding_round(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'round_type' not in data:
        return jsonify({'success': False, 'error': 'Round type is required.'}), 400

    date_opened_str = data.get('date_opened')
    date_closed_str = data.get('date_closed')

    date_opened = datetime.strptime(date_opened_str, '%Y-%m-%d').date() if date_opened_str else None
    date_closed = datetime.strptime(date_closed_str, '%Y-%m-%d').date() if date_closed_str else None

    new_round = FundingRound(
        startup_id=startup_id,
        round_type=data['round_type'],
        status=data.get('status', 'Planned'),
        target_amount=data.get('target_amount'),
        valuation_pre=data.get('valuation_pre'),
        date_opened=date_opened,
        date_closed=date_closed,
        lead_investor=data.get('lead_investor'),
        notes=data.get('notes'),
        pitch_deck_url=data.get('pitch_deck_url')
    )
    db.session.add(new_round)
    db.session.commit()
    return jsonify({'success': True, 'round': new_round.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/investors', methods=['POST'])
@jwt_required()
def create_investor(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Investor name is required.'}), 400

    new_investor = Investor(
        name=data['name'],
        firm_name=data.get('firm_name'),
        type=data.get('type'),
        email=data.get('email'),
        website=data.get('website'),
        notes=data.get('notes')
    )
    db.session.add(new_investor)
    db.session.commit()
    return jsonify({'success': True, 'investor': new_investor.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/campaigns', methods=['POST'])
@jwt_required()
def create_campaign(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'campaign_name' not in data:
        return jsonify({'success': False, 'error': 'Campaign name is required.'}), 400

    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

    status_str = data.get('status', 'PLANNED').upper()

    new_campaign = MarketingCampaign(
        startup_id=startup_id,
        campaign_name=data['campaign_name'],
        scope=data.get('scope', 'overall'),
        product_id=data.get('product_id'),
        objective=data.get('objective'),
        channel=data.get('channel'),
        start_date=start_date,
        end_date=end_date,
        status=status_str,
        notes=data.get('notes'),
        content_mode=data.get('content_mode', False),
        created_by=session.get('user_id')
    )
    db.session.add(new_campaign)
    db.session.commit()
    return jsonify({'success': True, 'campaign': new_campaign.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>/content-items', methods=['POST'])
@jwt_required()
def create_content_item(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Content item title is required.'}), 400

    campaign = MarketingCampaign.query.get_or_404(campaign_id)

    # Check if the campaign is in content mode and has a content calendar
    if campaign.content_mode:
        if not campaign.content_calendars:
            # Create a default content calendar if none exists for a content-driven campaign
            new_calendar = MarketingContentCalendar(
                campaign_id=campaign.campaign_id,
                title=f"{campaign.campaign_name} Content Calendar",
                description=f"Content calendar for {campaign.campaign_name}",
                owner_id=session.get('user_id')
            )
            db.session.add(new_calendar)
            db.session.commit()
            db.session.refresh(new_calendar)
            calendar_id = new_calendar.calendar_id
        else:
            # Use the first content calendar if multiple exist (assuming one primary per campaign)
            calendar_id = campaign.content_calendars[0].calendar_id
    else:
        return jsonify({'success': False, 'error': 'This campaign is not configured for content management.'}), 400

    publish_date_str = data.get('publish_date')
    publish_date = datetime.strptime(publish_date_str, '%Y-%m-%d').date() if publish_date_str else None

    status_str = data.get('status', 'PLANNED').upper()

    new_item = MarketingContentItem(
        calendar_id=calendar_id,
        title=data['title'],
        content_type=data.get('content_type'),
        content_body=data.get('content_body'),
        channel=data.get('channel'),
        publish_date=publish_date,
        status=status_str,
        created_by=session.get('user_id')
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'success': True, 'item': new_item.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/founders', methods=['POST'])
@jwt_required()
def create_founder(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Founder name is required.'}), 400

    new_founder = Founder(
        startup_id=startup_id,
        name=data['name'],
        role=data.get('role'),
        email=data.get('email'),
        phone_number=data.get('phone_number'),
        linkedin_link=data.get('linkedin_link')
    )
    db.session.add(new_founder)
    db.session.commit()
    return jsonify({'success': True, 'founder': new_founder.to_dict()}), 201

# ... (previous routes) ...
@startups_bp.route('/<int:startup_id>/settings', methods=['PUT'])
@jwt_required()
def update_startup_settings(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    startup.name = data.get('name', startup.name)
    startup.slug = data.get('slug', startup.slug)
    startup.next_milestone = data.get('next_milestone', startup.next_milestone)
    
    db.session.commit()
    return jsonify({'success': True, 'startup': startup.to_dict()}), 200

# ... (placeholder for other routes) ...

@startups_bp.route('/<int:startup_id>/marketing-overview', methods=['GET'])
@jwt_required()
def get_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    marketing_overview = startup.marketing_overview
    if not marketing_overview:
        marketing_overview = MarketingOverview(startup_id=startup_id)
        db.session.add(marketing_overview)
        db.session.commit()

    return jsonify({'success': True, 'marketing_overview': marketing_overview.to_dict()}), 200


@startups_bp.route('/<int:startup_id>/marketing-overview', methods=['PUT'])
@jwt_required()
def update_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if startup.user_id != session.get('user_id'):
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
    db.session.refresh(startup) # Refresh the startup object to load the updated marketing_overview

    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200


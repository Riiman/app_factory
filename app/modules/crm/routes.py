from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from .models import CrmContact, CrmCompany, CrmDeal, CrmInteraction, CrmLifecycleStage, CrmLeadStatus, CrmDealStage, InteractionType
from .services import CrmEnrichmentService, CrmEmailSyncService
from app.models import User, Startup

crm_bp = Blueprint('crm', __name__, url_prefix='/api/crm')

def get_current_startup_id():
    # Helper to get startup_id from current user's context
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    # Assuming user is associated with one startup or using the first one for now
    # In a real multi-tenant/multi-startup scenario, this might come from a header or session
    if user.startups:
        return user.startups[0].id
    elif user.team_memberships:
        return user.team_memberships[0].startup_id
    return None

# --- Contacts & Leads ---

@crm_bp.route('/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404

    lifecycle_stage = request.args.get('lifecycle_stage')
    query = CrmContact.query.filter_by(startup_id=startup_id)
    
    if lifecycle_stage:
        query = query.filter(CrmContact.lifecycle_stage == CrmLifecycleStage(lifecycle_stage))
        
    contacts = query.order_by(CrmContact.created_at.desc()).all()
    return jsonify([c.to_dict() for c in contacts]), 200

@crm_bp.route('/contacts', methods=['POST'])
@jwt_required()
def create_contact():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404
        
    data = request.json
    try:
        contact = CrmContact(
            startup_id=startup_id,
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            job_title=data.get('job_title'),
            company_id=data.get('company_id'),
            lifecycle_stage=CrmLifecycleStage(data.get('lifecycle_stage', 'LEAD')),
            lead_status=CrmLeadStatus(data.get('lead_status', 'NEW')),
            owner_id=get_jwt_identity() # Default to creator
        )
        db.session.add(contact)
        db.session.commit()
        return jsonify(contact.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/contacts/<int:id>', methods=['GET'])
@jwt_required()
def get_contact(id):
    startup_id = get_current_startup_id()
    contact = CrmContact.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    return jsonify(contact.to_dict())

@crm_bp.route('/contacts/<int:id>', methods=['PUT'])
@jwt_required()
def update_contact(id):
    startup_id = get_current_startup_id()
    contact = CrmContact.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    data = request.json
    
    if 'first_name' in data: contact.first_name = data['first_name']
    if 'last_name' in data: contact.last_name = data['last_name']
    if 'email' in data: contact.email = data['email']
    if 'phone' in data: contact.phone = data['phone']
    if 'job_title' in data: contact.job_title = data['job_title']
    if 'lifecycle_stage' in data: contact.lifecycle_stage = CrmLifecycleStage(data['lifecycle_stage'])
    if 'lead_status' in data: contact.lead_status = CrmLeadStatus(data['lead_status'])
    if 'company_id' in data: contact.company_id = data['company_id']

    db.session.commit()
    
    # Log Activity
    from app.models import ActivityLog # Deferred import to avoid circular dependency
    activity = ActivityLog(
        user_id=get_jwt_identity(),
        startup_id=startup_id,
        action='updated',
        target_type='Contact',
        target_id=contact.id,
        details=f"Updated contact {contact.first_name} {contact.last_name}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify(contact.to_dict())

@crm_bp.route('/contacts/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_contact(id):
    startup_id = get_current_startup_id()
    contact = CrmContact.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    db.session.delete(contact)
    db.session.commit() # Delete contact first
    
    # Log Activity
    from app.models import ActivityLog
    activity = ActivityLog(
        user_id=get_jwt_identity(),
        startup_id=startup_id,
        action='deleted',
        target_type='Contact',
        target_id=id,
        details=f"Deleted contact {contact.first_name} {contact.last_name}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'message': 'Contact deleted'})

# --- Companies ---

@crm_bp.route('/companies', methods=['GET'])
@jwt_required()
def get_companies():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404

    companies = CrmCompany.query.filter_by(startup_id=startup_id).order_by(CrmCompany.name).all()
    return jsonify([c.to_dict() for c in companies]), 200

@crm_bp.route('/companies', methods=['POST'])
@jwt_required()
def create_company():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404
        
    data = request.json
    try:
        company = CrmCompany(
            startup_id=startup_id,
            name=data.get('name'),
            domain_name=data.get('domain_name'),
            industry=data.get('industry'),
            about_us=data.get('about_us'),
            city=data.get('city'),
            state=data.get('state'),
            owner_id=get_jwt_identity()
        )
        db.session.add(company)
        db.session.commit()
        return jsonify(company.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/companies/<int:id>', methods=['PUT'])
@jwt_required()
def update_company(id):
    startup_id = get_current_startup_id()
    company = CrmCompany.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    data = request.json
    
    if 'name' in data: company.name = data['name']
    if 'domain_name' in data: company.domain_name = data['domain_name']
    
    db.session.commit()
    
    # Log Activity
    from app.models import ActivityLog
    activity = ActivityLog(
        user_id=get_jwt_identity(),
        startup_id=startup_id,
        action='updated',
        target_type='Company',
        target_id=company.id,
        details=f"Updated company {company.name}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify(company.to_dict())

# --- Deals ---

@crm_bp.route('/deals', methods=['GET'])
@jwt_required()
def get_deals():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404

    deals = CrmDeal.query.filter_by(startup_id=startup_id).order_by(CrmDeal.created_at.desc()).all()
    return jsonify([d.to_dict() for d in deals]), 200

@crm_bp.route('/deals/<int:id>', methods=['GET'])
@jwt_required()
def get_deal(id):
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404
        
    deal = CrmDeal.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    return jsonify(deal.to_dict()), 200

@crm_bp.route('/deals', methods=['POST'])
@jwt_required()
def create_deal():
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404
        
    data = request.json
    try:
        deal = CrmDeal(
            startup_id=startup_id,
            name=data.get('name'),
            amount=data.get('amount'),
            stage=CrmDealStage(data.get('stage', 'APPOINTMENT_SCHEDULED')),
            contact_id=data.get('contact_id'),
            company_id=data.get('company_id'),
            owner_id=get_jwt_identity()
        )
        if data.get('close_date'):
            # Basic parsing, might need adjustment based on frontend format
             from datetime import datetime
             deal.close_date = datetime.fromisoformat(data['close_date'].replace('Z', '+00:00')).date()

        db.session.add(deal)
        db.session.commit()
        return jsonify(deal.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/deals/<int:id>', methods=['PUT'])
@jwt_required()
def update_deal(id):
    startup_id = get_current_startup_id()
    deal = CrmDeal.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    data = request.json
    
    if 'stage' in data: deal.stage = CrmDealStage(data['stage'])
    if 'amount' in data: deal.amount = data['amount']
    # Add other fields as needed

    db.session.commit()
    
    # Log Activity
    from app.models import ActivityLog
    stage_info = f" to {deal.stage.value}" if 'stage' in data else ""
    activity = ActivityLog(
        user_id=get_jwt_identity(),
        startup_id=startup_id,
        action='updated',
        target_type='Deal',
        target_id=deal.id,
        details=f"Updated deal '{deal.name}'{stage_info}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify(deal.to_dict())


# --- Interactions ---
@crm_bp.route('/contacts/<int:contact_id>/interactions', methods=['POST'])
@jwt_required()
def create_interaction(contact_id):
    startup_id = get_current_startup_id()
    if not startup_id:
        return jsonify({'error': 'No associated startup found'}), 404
    
    # Verify contact exists and belongs to startup
    CrmContact.query.filter_by(id=contact_id, startup_id=startup_id).first_or_404()
    
    data = request.json
    try:
        interaction = CrmInteraction(
            startup_id=startup_id,
            contact_id=contact_id,
            type=InteractionType(data.get('type', 'NOTE')),
            content=data.get('content'),
            created_by=get_jwt_identity()
        )
        db.session.add(interaction)
        db.session.commit()
        return jsonify(interaction.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/contacts/<int:contact_id>/interactions', methods=['GET'])
@jwt_required()
def get_interactions(contact_id):
    startup_id = get_current_startup_id()
    # Verify contact exists and belongs to startup
    CrmContact.query.filter_by(id=contact_id, startup_id=startup_id).first_or_404()
    
    interactions = CrmInteraction.query.filter_by(contact_id=contact_id, startup_id=startup_id).order_by(CrmInteraction.created_at.desc()).all()
    return jsonify([i.to_dict() for i in interactions])

# --- Automation & Enrichment ---

@crm_bp.route('/enrich/company', methods=['POST'])
@jwt_required()
def enrich_company_endpoint():
    data = request.json
    domain = data.get('domain')
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400
    
    result = CrmEnrichmentService.enrich_company(domain)
    # Even if None, let's return 200 with null data or 404? 
    # Frontend likely expects a JSON object or null.
    if not result:
         return jsonify({'error': 'Could not enrich company'}), 404
         
    return jsonify(result)

@crm_bp.route('/sync-emails', methods=['POST'])
@jwt_required()
def sync_emails_endpoint():
    current_user_id = get_jwt_identity()
    # Optional limit from query param
    limit = request.args.get('limit', default=50, type=int)
    
    result = CrmEmailSyncService.sync_recent_emails(current_user_id, limit=limit)
    return jsonify(result)

# --- Segmentation (Lists) ---

from .models import CrmList, CrmListMembership, CrmSyncRule, SyncRuleType

@crm_bp.route('/lists', methods=['GET'])
@jwt_required()
def get_lists():
    startup_id = get_current_startup_id()
    lists = CrmList.query.filter_by(startup_id=startup_id).all()
    return jsonify([l.to_dict() for l in lists])

@crm_bp.route('/lists', methods=['POST'])
@jwt_required()
def create_list():
    startup_id = get_current_startup_id()
    data = request.json
    try:
        new_list = CrmList(
            startup_id=startup_id,
            name=data.get('name'),
            description=data.get('description')
        )
        db.session.add(new_list)
        db.session.commit()
        return jsonify(new_list.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/lists/<int:list_id>/add', methods=['POST'])
@jwt_required()
def add_to_list(list_id):
    startup_id = get_current_startup_id()
    # Verify list ownership
    crm_list = CrmList.query.filter_by(id=list_id, startup_id=startup_id).first_or_404()
    
    data = request.json
    contact_ids = data.get('contact_ids', [])
    
    added_count = 0
    for cid in contact_ids:
        exists = CrmListMembership.query.filter_by(list_id=list_id, contact_id=cid).first()
        if not exists:
            membership = CrmListMembership(list_id=list_id, contact_id=cid)
            db.session.add(membership)
            added_count += 1
            
    db.session.commit()
    return jsonify({'message': 'Contacts added', 'added_count': added_count})

@crm_bp.route('/lists/<int:list_id>', methods=['DELETE'])
@jwt_required()
def delete_list(list_id):
    startup_id = get_current_startup_id()
    crm_list = CrmList.query.filter_by(id=list_id, startup_id=startup_id).first_or_404()
    
    # Manually delete memberships first if cascade not set on DB level (safest)
    CrmListMembership.query.filter_by(list_id=list_id).delete()
    
    db.session.delete(crm_list)
    db.session.commit()
    return jsonify({'message': 'List deleted'})

# --- Settings (Sync Rules) ---

@crm_bp.route('/sync-rules', methods=['GET'])
@jwt_required()
def get_sync_rules():
    startup_id = get_current_startup_id()
    rules = CrmSyncRule.query.filter_by(startup_id=startup_id).all()
    return jsonify([r.to_dict() for r in rules])

@crm_bp.route('/sync-rules', methods=['POST'])
@jwt_required()
def create_sync_rule():
    startup_id = get_current_startup_id()
    data = request.json
    try:
        rule = CrmSyncRule(
            startup_id=startup_id,
            rule_type=SyncRuleType(data.get('rule_type')),
            value=data.get('value')
        )
        db.session.add(rule)
        db.session.commit()
        return jsonify(rule.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@crm_bp.route('/sync-rules/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_sync_rule(id):
    startup_id = get_current_startup_id()
    rule = CrmSyncRule.query.filter_by(id=id, startup_id=startup_id).first_or_404()
    db.session.delete(rule)
    db.session.commit()
    return jsonify({'message': 'Rule deleted'})

# --- Analytics (Overview) ---

@crm_bp.route('/analytics/overview', methods=['GET'])
@jwt_required()
def get_crm_analytics():
    startup_id = get_current_startup_id()
    
    # 1. Pipeline Metrics
    deals = CrmDeal.query.filter_by(startup_id=startup_id).all()
    total_pipeline_value = sum(d.amount for d in deals if d.amount)
    
    # Weighted value (Simplified: 10% for Lead, 50% for Presentation, 90% for Contract)
    # Ideally use stage probability map
    
    won_deals = [d for d in deals if d.stage == CrmDealStage.CLOSED_WON]
    win_rate = (len(won_deals) / len(deals) * 100) if deals else 0
    
    # 2. Activity Volume (Last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    interaction_count = CrmInteraction.query.filter(
        CrmInteraction.startup_id == startup_id,
        CrmInteraction.created_at >= thirty_days_ago
    ).count()
    
    # 3. Recent Wins
    recent_wins = CrmDeal.query.filter_by(
        startup_id=startup_id, 
        stage=CrmDealStage.CLOSED_WON
    ).order_by(CrmDeal.updated_at.desc()).limit(5).all()

    return jsonify({
        'pipeline_value': float(total_pipeline_value),
        'deal_count': len(deals),
        'win_rate': round(win_rate, 1),
        'activity_volume_30d': interaction_count,
        'recent_wins': [d.to_dict() for d in recent_wins]
    })

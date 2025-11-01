"""
monetization.py - Endpoints for managing monetization and campaigns
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, Monetization, Campaign, db

monetization_bp = Blueprint('monetization', __name__)

# Platform endpoints
@monetization_bp.route('/platform/startups/<int:startup_id>/monetization', methods=['POST'])
@jwt_required()
def create_or_update_monetization(startup_id):
    # ... (add authorization for platform team)
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    data = request.get_json()
    monetization = Monetization.query.filter_by(startup_id=startup_id).first()

    if not monetization:
        monetization = Monetization(startup_id=startup_id)
        db.session.add(monetization)

    monetization.payment_integration_type = data.get('payment_integration_type')
    monetization.payment_integration_config = data.get('payment_integration_config')
    monetization.revenue_share_percentage = data.get('revenue_share_percentage')

    db.session.commit()
    return jsonify({'success': True, 'data': {'monetization_id': monetization.id}})

@monetization_bp.route('/platform/startups/<int:startup_id>/campaigns', methods=['POST'])
@jwt_required()
def create_campaign(startup_id):
    # ... (add authorization for platform team)
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    data = request.get_json()
    campaign = Campaign(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        channel=data.get('channel'),
        status=data.get('status', 'active'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        budget=data.get('budget'),
        roi=data.get('roi')
    )
    db.session.add(campaign)
    db.session.commit()
    return jsonify({'success': True, 'data': {'campaign_id': campaign.id}})

# Founder endpoints
@monetization_bp.route('/dashboard/monetization', methods=['GET'])
@jwt_required()
def get_dashboard_monetization():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    monetization = Monetization.query.filter_by(startup_id=startup.id).first()
    campaigns = Campaign.query.filter_by(startup_id=startup.id).all()

    return jsonify({
        'success': True,
        'data': {
            'monetization': {
                'payment_integration_type': monetization.payment_integration_type,
                'revenue_share_percentage': monetization.revenue_share_percentage
            } if monetization else None,
            'campaigns': [{
                'id': c.id,
                'name': c.name,
                'channel': c.channel,
                'status': c.status,
                'budget': c.budget,
                'roi': c.roi
            } for c in campaigns]
        }
    })

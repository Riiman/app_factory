"""
fundraising.py - Endpoints for managing fundraising and handover
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, Fundraising, db

fundraising_bp = Blueprint('fundraising', __name__)

# Platform endpoints
@fundraising_bp.route('/platform/startups/<int:startup_id>/fundraising', methods=['POST'])
@jwt_required()
def create_or_update_fundraising(startup_id):
    # ... (add authorization for platform team)
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    data = request.get_json()
    fundraising = Fundraising.query.filter_by(startup_id=startup_id).first()

    if not fundraising:
        fundraising = Fundraising(startup_id=startup_id)
        db.session.add(fundraising)

    fundraising.readiness_score = data.get('readiness_score', fundraising.readiness_score)
    fundraising.pitch_deck_url = data.get('pitch_deck_url', fundraising.pitch_deck_url)
    fundraising.investor_connect_status = data.get('investor_connect_status', fundraising.investor_connect_status)
    fundraising.commission_status = data.get('commission_status', fundraising.commission_status)
    fundraising.code_access_status = data.get('code_access_status', fundraising.code_access_status)

    db.session.commit()
    return jsonify({'success': True, 'data': {'fundraising_id': fundraising.id}})

@fundraising_bp.route('/platform/startups/<int:startup_id>/code-handover', methods=['POST'])
@jwt_required()
def manage_code_handover(startup_id):
    # ... (add authorization for platform team)
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    data = request.get_json()
    fundraising = Fundraising.query.filter_by(startup_id=startup_id).first()
    if not fundraising:
        return jsonify({'success': False, 'error': 'Fundraising record not found'}), 404

    fundraising.code_access_status = data.get('code_access_status', fundraising.code_access_status)
    db.session.commit()
    return jsonify({'success': True})

# Founder endpoints
@fundraising_bp.route('/dashboard/fundraising', methods=['GET'])
@jwt_required()
def get_dashboard_fundraising():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    fundraising = Fundraising.query.filter_by(startup_id=startup.id).first()
    if not fundraising:
        return jsonify({'success': False, 'error': 'Fundraising record not found'}), 404

    return jsonify({
        'success': True,
        'data': {
            'readiness_score': fundraising.readiness_score,
            'pitch_deck_url': fundraising.pitch_deck_url,
            'investor_connect_status': fundraising.investor_connect_status,
            'commission_status': fundraising.commission_status,
            'code_access_status': fundraising.code_access_status
        }
    })

@fundraising_bp.route('/dashboard/fundraising/pay-commission', methods=['POST'])
@jwt_required()
def pay_commission():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    fundraising = Fundraising.query.filter_by(startup_id=startup.id).first()
    if not fundraising:
        return jsonify({'success': False, 'error': 'Fundraising record not found'}), 404

    fundraising.commission_status = 'paid'
    db.session.commit()
    return jsonify({'success': True})

@fundraising_bp.route('/dashboard/fundraising/request-code-access', methods=['POST'])
@jwt_required()
def request_code_access():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    fundraising = Fundraising.query.filter_by(startup_id=startup.id).first()
    if not fundraising:
        return jsonify({'success': False, 'error': 'Fundraising record not found'}), 404

    fundraising.code_access_status = 'requested'
    db.session.commit()
    return jsonify({'success': True})

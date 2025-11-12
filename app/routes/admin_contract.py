from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models import Startup, Contract, ContractComment, ContractSignatory, ContractStatus, StartupStage # Import ContractStatus
from app.utils.decorators import admin_required
from datetime import datetime

admin_contract_bp = Blueprint('admin_contract', __name__, url_prefix='/api/admin/contract')

@admin_contract_bp.route('/<int:startup_id>/comments', methods=['POST'])
@admin_required
def add_contract_comment(startup_id):
    """
    Adds a comment to a contract.
    """
    startup = Startup.query.get_or_404(startup_id)
    if not startup.contract:
        return jsonify({'success': False, 'error': 'Contract not found for this startup'}), 404

    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({'success': False, 'error': 'Comment text is required'}), 400

    admin_user_id = session.get('user_id')
    if not admin_user_id:
        return jsonify({'success': False, 'error': 'Admin user not logged in'}), 401
    
    comment = ContractComment(
        contract_id=startup.contract.id,
        user_id=admin_user_id,
        text=text
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({'success': True, 'comment': comment.to_dict()}), 201

@admin_contract_bp.route('/<int:startup_id>/signatories', methods=['POST'])
@admin_required
def add_contract_signatory(startup_id):
    """
    Adds a signatory to a contract.
    """
    startup = Startup.query.get_or_404(startup_id)
    if not startup.contract:
        return jsonify({'success': False, 'error': 'Contract not found for this startup'}), 404

    data = request.get_json()
    name = data.get('name')
    email = data.get('email')

    if not name or not email:
        return jsonify({'success': False, 'error': 'Signatory name and email are required'}), 400

    signatory = ContractSignatory(
        contract_id=startup.contract.id,
        name=name,
        email=email,
        status='Not Signed' # Default status
    )
    db.session.add(signatory)
    db.session.commit()
    return jsonify({'success': True, 'signatory': signatory.to_dict()}), 201

@admin_contract_bp.route('/<int:startup_id>/status', methods=['PUT'])
@admin_required
def update_contract_status(startup_id):
    """
    Updates the status of a contract.
    """
    startup = Startup.query.get_or_404(startup_id)
    if not startup.contract:
        return jsonify({'success': False, 'error': 'Contract not found for this startup'}), 404

    data = request.get_json()
    new_status_str = data.get('status')

    if not new_status_str:
        return jsonify({'success': False, 'error': 'New status is required'}), 400

    try:
        new_status = ContractStatus[new_status_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid status: {new_status_str}'}), 400

    contract = startup.contract
    contract.status = new_status

    if new_status == ContractStatus.SENT and not contract.sent_at:
        contract.sent_at = datetime.utcnow()
    elif new_status == ContractStatus.SIGNED and not contract.signed_at:
        contract.signed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({'success': True, 'contract': contract.to_dict()}), 200

from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models import Startup, ScopeDocument, ScopeStatus, StartupStage
from app.utils.decorators import admin_required
from app.tasks import generate_contract_task

admin_scope_bp = Blueprint('admin_scope', __name__, url_prefix='/api/admin/scope')

@admin_scope_bp.route('/<int:startup_id>/status', methods=['PUT'])
@admin_required
def update_scope_status(startup_id):
    """
    Updates the status of a scope document and triggers contract generation
    if the scope is accepted.
    """
    startup = Startup.query.get_or_404(startup_id)
    if not startup.scope_document:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404

    data = request.get_json()
    new_status_str = data.get('status')

    if not new_status_str:
        return jsonify({'success': False, 'error': 'New status is required'}), 400

    try:
        new_status = ScopeStatus[new_status_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid status: {new_status_str}'}), 400

    startup.scope_document.status = new_status.name

    # If the scope is accepted, move the startup to the contract stage
    # and trigger the contract generation task.
    if new_status == ScopeStatus.ACCEPTED:
        startup.current_stage = StartupStage.CONTRACT
        generate_contract_task.delay(startup.id)
        print(f"--- [API] Triggered contract generation for startup ID: {startup.id} ---")

    db.session.commit()
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=True)}), 200

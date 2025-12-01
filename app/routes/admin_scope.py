from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models import Startup, ScopeDocument, ScopeStatus, StartupStage
from app.utils.decorators import admin_required
from app.tasks import generate_contract_task

from app.services.notification_service import publish_update

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
    
    publish_update("scope_status_updated", {"startup_id": startup.id, "scope_document": startup.scope_document.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=True)}), 200

@admin_scope_bp.route('/<int:startup_id>/comments', methods=['POST'])
@admin_required
def add_admin_scope_comment(startup_id):
    from app.models import ScopeComment, User
    from flask_jwt_extended import get_jwt_identity
    
    startup = Startup.query.get_or_404(startup_id)
    if not startup.scope_document:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404

    data = request.get_json()
    text = data.get('text')
    section_id = data.get('section_id', 'general') # Default to general if not provided

    if not text:
        return jsonify({'success': False, 'error': 'Comment text is required'}), 400

    user_id = get_jwt_identity()
    
    new_comment = ScopeComment(
        document_id=startup.scope_document.id,
        user_id=user_id,
        section_id=section_id,
        text=text
    )
    db.session.add(new_comment)
    db.session.commit()
    
    # Create notification for the founder
    from app.models import DashboardNotification
    notification = DashboardNotification(
        user_id=startup.user_id,
        title="New Scope Comment",
        message=f"Admin commented on your {section_id} scope: {text[:50]}...",
        type="info"
    )
    db.session.add(notification)
    db.session.commit()
    
    publish_update("scope_comment_added", {"startup_id": startup.id, "comment": new_comment.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    publish_update("notification_created", {"notification": notification.to_dict()}, rooms=[f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'comment': new_comment.to_dict()}), 201

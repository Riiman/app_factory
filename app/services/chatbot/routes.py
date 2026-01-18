
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Startup, User, UserRole, TeamMember
from .service import AIAssistantService

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')
ai_service = AIAssistantService()

def validate_startup_access(startup, user):
    """
    Validates if the user has access to the startup.
    (Duplicated from app/routes/startups.py to avoid circular imports)
    """
    if not user:
        return False
        
    # Super Admin Check: Org 1 + Admin Role
    if user.organization_id == 1 and user.role == UserRole.ADMIN:
        return True

    if startup.organization_id != user.organization_id:
        return False

    # Owner Check
    if startup.user_id == user.id:
        return True
    
    # Org Admin Check
    if user.role == UserRole.ADMIN:
        return True

    # Team Member Check
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        return True
            
    return False

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    startup_id = data.get('startup_id')
    query = data.get('query')
    history = data.get('history', [])
    
    if not startup_id or not query:
        return jsonify({'error': 'Missing startup_id or query'}), 400
        
    startup = Startup.query.get_or_404(startup_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'error': 'Unauthorized access to this startup'}), 403
        
    response = ai_service.process_query(user.id, startup.id, query, history)
    
    return jsonify({'response': response, 'success': True})

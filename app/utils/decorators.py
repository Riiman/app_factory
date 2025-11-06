from functools import wraps
from flask import session, jsonify
from app.models import UserRole, User

def session_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or user.role != UserRole.ADMIN:
            return jsonify({'success': False, 'error': 'Forbidden: Admin access required'}), 403
            
        return f(*args, **kwargs)
    return decorated_function

"""
Logo upload endpoint for startups
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from app.models import Startup
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from datetime import datetime

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@jwt_required()
def upload_startup_logo(startup_id):
    """Upload logo for a startup"""
    user_id = get_jwt_identity()
    startup = Startup.query.get_or_404(startup_id)
    
    # Verify ownership
    if startup.user_id != user_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    if 'logo' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['logo']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, SVG, WEBP'}), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'success': False, 'error': 'File too large. Maximum size is 2MB'}), 400
    
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join('static', 'uploads', 'logos')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    unique_filename = f"{startup.slug}_{timestamp}{ext}"
    
    filepath = os.path.join(upload_dir, unique_filename)
    file.save(filepath)
    
    # Update startup logo_url
    logo_url = f"/static/uploads/logos/{unique_filename}"
    startup.logo_url = logo_url
    db.session.commit()
    
    return jsonify({
        'success': True,
        'logo_url': logo_url
    }), 200


@jwt_required()
def delete_startup_logo(startup_id):
    """Delete logo for a startup"""
    user_id = get_jwt_identity()
    startup = Startup.query.get_or_404(startup_id)
    
    # Verify ownership
    if startup.user_id != user_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    if startup.logo_url:
        # Delete file from filesystem
        try:
            filepath = os.path.join('static', 'uploads', 'logos', os.path.basename(startup.logo_url))
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            print(f"Error deleting logo file: {e}")
        
        # Remove from database
        startup.logo_url = None
        db.session.commit()
    
    return jsonify({'success': True}), 200

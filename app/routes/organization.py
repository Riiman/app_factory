"""
Organization management routes including logo uploads.
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from app.models import Organization, User, UserRole
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from datetime import datetime

organization_bp = Blueprint('organization', __name__, url_prefix='/api/auth/organization')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@organization_bp.route('/<int:org_id>/logo', methods=['POST', 'PUT'])
@jwt_required()
def upload_organization_logo(org_id):
    """Upload logo for an organization"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    org = Organization.query.get_or_404(org_id)
    
    # Verify authorization: Must be Org Admin
    if user.organization_id != org_id or user.role != UserRole.ADMIN:
        return jsonify({'success': False, 'error': 'Unauthorized. Admin access required.'}), 403
    
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
    upload_dir = os.path.join('static', 'uploads', 'org_logos')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    unique_filename = f"{org.slug or org.id}_{timestamp}{ext}"
    
    filepath = os.path.join(upload_dir, unique_filename)
    file.save(filepath)
    
    # Delete old logo if exists to save space (Optional but good practice)
    if org.logo_url:
        try:
             # Extract old filename from URL
             old_filename = os.path.basename(org.logo_url)
             old_filepath = os.path.join(upload_dir, old_filename)
             if os.path.exists(old_filepath):
                 os.remove(old_filepath)
        except Exception as e:
            print(f"Failed to delete old logo: {e}")

    # Update organization logo_url
    logo_url = f"/static/uploads/org_logos/{unique_filename}"
    org.logo_url = logo_url
    db.session.commit()
    
    return jsonify({
        'success': True,
        'logo_url': logo_url,
        'organization': org.to_dict()
    }), 200


@organization_bp.route('/<int:org_id>/logo', methods=['DELETE'])
@jwt_required()
def delete_organization_logo(org_id):
    """Delete logo for an organization"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    org = Organization.query.get_or_404(org_id)
    
    # Verify authorization: Must be Org Admin
    if user.organization_id != org_id or user.role != UserRole.ADMIN:
        return jsonify({'success': False, 'error': 'Unauthorized. Admin access required.'}), 403
    
    if org.logo_url:
        # Delete file from filesystem
        try:
            filename = os.path.basename(org.logo_url)
            filepath = os.path.join('static', 'uploads', 'org_logos', filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            print(f"Error deleting logo file: {e}")
        
        # Remove from database
        org.logo_url = None
        db.session.commit()
    
    return jsonify({
        'success': True, 
        'organization': org.to_dict()
    }), 200

@organization_bp.route('/<int:org_id>/details', methods=['GET'])
@jwt_required()
def get_organization_details(org_id):
    """Get organization details"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    org = Organization.query.get_or_404(org_id)
    
    # Verify authorization: Must be member of org
    if user.organization_id != org_id:
         # Also allow if user is super admin (org id 1 + admin role) - optional but good practice
         if not (user.organization_id == 1 and user.role == UserRole.ADMIN):
            return jsonify({'success': False, 'error': 'Unauthorized.'}), 403
    
    org_dict = org.to_dict()
    print(f"DEBUG: /details returning org {org.id} logo: {org_dict.get('logo_url')}")
    return jsonify({
        'success': True,
        'organization': org_dict
    }), 200

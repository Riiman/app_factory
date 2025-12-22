from flask import Blueprint, request, jsonify, current_app
from app.email_utils import send_contact_form_email

contact_bp = Blueprint('contact', __name__, url_prefix='/api/contact')

@contact_bp.route('/submit', methods=['POST'])
def submit_contact():
    try:
        data = request.get_json()
        
        # Basic validation
        required_fields = ['name', 'email', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400

        # Send email
        if send_contact_form_email(data):
            return jsonify({'success': True, 'message': 'Request received successfully'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to send email'}), 500

    except Exception as e:
        current_app.logger.error(f"Contact form error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

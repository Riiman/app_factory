from flask import Blueprint, request, jsonify, redirect, url_for, current_app, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db, oauth
from app.modules.email.models import UserEmailIntegration, EmailProvider, EmailProtocol
from app.modules.email.services import EmailService
from app.models import User
from datetime import datetime

# Define Blueprint (imported in __init__.py)
from . import email_bp

@email_bp.route('/connect/custom', methods=['POST'])
@jwt_required()
def connect_custom():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    email_address = data.get('email_address')
    imap_host = data.get('imap_host')
    imap_port = data.get('imap_port', 993)
    smtp_host = data.get('smtp_host')
    smtp_port = data.get('smtp_port', 587)
    username = data.get('username')
    password = data.get('password')
    protocol_str = data.get('protocol', 'IMAP') # Default to IMAP
    
    if not all([email_address, imap_host, smtp_host, username, password]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        protocol = EmailProtocol(protocol_str)
    except ValueError:
        return jsonify({'error': 'Invalid protocol. Must be IMAP or POP3'}), 400

    # Create temporary integration object for testing
    temp_integration = UserEmailIntegration(
        user_id=user_id,
        provider=EmailProvider.CUSTOM,
        email_address=email_address,
        incoming_protocol=protocol
    )
    temp_integration.imap_host = imap_host
    temp_integration.imap_port = int(imap_port)
    temp_integration.smtp_host = smtp_host
    temp_integration.smtp_port = int(smtp_port)
    temp_integration.username = username
    temp_integration.set_password(password)
    
    # Test connection BEFORE saving
    try:
        service = EmailService(temp_integration)
        if protocol == EmailProtocol.POP3:
             service._get_pop3_connection().quit()
        else:
             service._get_imap_connection().logout()
    except Exception as e:
        return jsonify({'error': f'Connection failed: {str(e)}'}), 400

    # If successful, save or update real record
    integration = UserEmailIntegration.query.filter_by(
        user_id=user_id, 
        provider=EmailProvider.CUSTOM,
        email_address=email_address
    ).first()
    
    if not integration:
        integration = UserEmailIntegration(
            user_id=user_id,
            provider=EmailProvider.CUSTOM,
            email_address=email_address
        )
    
    integration.incoming_protocol = protocol
    integration.imap_host = imap_host
    integration.imap_port = int(imap_port)
    integration.smtp_host = smtp_host
    integration.smtp_port = int(smtp_port)
    integration.username = username
    integration.set_password(password) 
    
    db.session.add(integration)
    db.session.commit()
        
    return jsonify({'success': True, 'message': 'Account connected successfully'})

@email_bp.route('/connect/<provider>', methods=['GET'])
@jwt_required()
def connect_oauth(provider):
    # For OAuth, we need to generate a redirect URL
    user_id = get_jwt_identity()
    
    # Store user_id in session to retrieve it in callback (browser-based flow)
    # Note: Requires session to be working (cookie)
    session['oauth_user_id'] = user_id
    
    redirect_uri = f"{current_app.config.get('BACKEND_URL', 'http://localhost:5000')}/api/email/callback/{provider}"
    
    client = None
    if provider == 'google':
        client = oauth.google
    elif provider == 'outlook':
        client = oauth.microsoft
    else:
        return jsonify({'error': 'Invalid provider'}), 400

    # Generate the authorization URL and save the state
    print(f"DEBUG: Client ID being used: {client.client_id}")
    print(f"DEBUG: Redirect URI generated: {redirect_uri}")
    # Force 'offline' access to get a refresh_token
    # Force 'consent' to ensure we get it even if user previously approved
    rv = client.create_authorization_url(
        redirect_uri, 
        access_type='offline', 
        prompt='consent'
    )
    
    # save_authorize_data saves the state to the session so validating the callback works
    client.save_authorize_data(redirect_uri=redirect_uri, **rv)
    
    return jsonify({'url': rv['url']})

@email_bp.route('/callback/<provider>', methods=['GET'])
def auth_callback(provider):
    # Generic callback handler
    try:
        # Retrieve user_id from session
        user_id = session.get('oauth_user_id')
        if not user_id:
            return jsonify({'error': 'User session expired. Please try connecting again.'}), 400

        token_data = None
        user_info = None
        email_addr = None
        
        if provider == 'google':
            token_data = oauth.google.authorize_access_token()
            user_info = oauth.google.get('https://www.googleapis.com/oauth2/v1/userinfo').json()
            email_addr = user_info['email']
        elif provider == 'outlook':
            token_data = oauth.microsoft.authorize_access_token()
            # Graph API for user info
            resp = oauth.microsoft.get('https://graph.microsoft.com/v1.0/me')
            user_info = resp.json()
            email_addr = user_info.get('mail') or user_info.get('userPrincipalName')
            
        if not token_data or not email_addr:
             return jsonify({'error': 'Failed to fetch token or email'}), 400
             
        # Save to DB
        provider_enum = EmailProvider.GOOGLE if provider == 'google' else EmailProvider.OUTLOOK
        
        integration = UserEmailIntegration.query.filter_by(
            user_id=user_id, 
            provider=provider_enum,
            email_address=email_addr
        ).first()
        
        if not integration:
            integration = UserEmailIntegration(
                user_id=user_id,
                provider=provider_enum,
                email_address=email_addr
            )
        
        integration.access_token = token_data.get('access_token')
        integration.refresh_token = token_data.get('refresh_token')
        if token_data.get('expires_at'):
             integration.token_expires_at = datetime.fromtimestamp(token_data.get('expires_at'))
        
        db.session.add(integration)
        db.session.commit()
        
        # Determine frontend URL (from Env or default)
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/email?status=success")

    except Exception as e:
        return f"Auth Failed: {str(e)}", 400

@email_bp.route('/accounts', methods=['GET'])
@jwt_required()
def list_accounts():
    user_id = get_jwt_identity()
    integrations = UserEmailIntegration.query.filter_by(user_id=user_id).all()
    return jsonify([i.to_dict() for i in integrations])

@email_bp.route('/folders/<int:integration_id>', methods=['GET'])
@jwt_required()
def get_folders(integration_id):
    user_id = get_jwt_identity()
    integration = UserEmailIntegration.query.filter_by(id=integration_id, user_id=user_id).first_or_404()
    
    try:
        service = EmailService(integration)
        folders = service.list_folders()
        return jsonify(folders)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/messages/<int:integration_id>', methods=['GET'])
@jwt_required()
def get_messages(integration_id):
    user_id = get_jwt_identity()
    folder = request.args.get('folder', 'INBOX')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    
    integration = UserEmailIntegration.query.filter_by(id=integration_id, user_id=user_id).first_or_404()
    
    try:
        service = EmailService(integration)
        emails = service.fetch_emails(folder=folder, page=page, limit=limit)
        return jsonify(emails)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@email_bp.route('/disconnect/<int:integration_id>', methods=['DELETE'])
@jwt_required()
def disconnect_account(integration_id):
    user_id = get_jwt_identity()
    integration = UserEmailIntegration.query.filter_by(id=integration_id, user_id=user_id).first_or_404()
    
    try:
        db.session.delete(integration)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Account disconnected successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@email_bp.route('/send', methods=['POST'])
@jwt_required()
def send_email():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    integration_id = data.get('integration_id')
    to = data.get('to')
    subject = data.get('subject')
    body = data.get('body')
    
    integration = UserEmailIntegration.query.filter_by(id=integration_id, user_id=user_id).first_or_404()
    
    try:
        service = EmailService(integration)
        service.send_email(to, subject, body)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

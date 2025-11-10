from flask import request, jsonify, current_app, redirect, url_for, Blueprint, session
from app.extensions import db, oauth
from app.models import User, Submission
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app.utils.decorators import session_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/status')
@session_required
def status():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    submission = Submission.query.filter_by(user_id=user.id).order_by(Submission.submitted_at.desc()).first()
    
    startup_stage = None
    if submission and submission.startup:
        startup_stage = submission.startup.current_stage.value

    return jsonify({
        'success': True,
        'is_logged_in': True,
        'submission_status': submission.status.value if submission else None,
        'startup_stage': startup_stage
    })


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')

    if not all([email, password, full_name]):
        return jsonify({'success': False, 'error': 'Missing required fields.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already registered.'}), 400

    user = User(email=email, full_name=full_name)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'success': True, 
        'message': 'Account created successfully.',
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401

    # Store user_id in the session
    session['user_id'] = user.id

    # Check the user's most recent submission
    submission = Submission.query.filter_by(user_id=user.id).order_by(Submission.submitted_at.desc()).first()
    
    submission_status = None
    if submission:
        # If submission was rejected over 30 days ago, delete it so the user can start fresh.
        if submission.status.value == 'rejected' and (datetime.utcnow() - submission.submitted_at) > timedelta(days=30):
            db.session.delete(submission)
            db.session.commit()
            submission_status = None # The submission is gone, so status is null
        else:
            submission_status = submission.status.value

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'submission_status': submission_status
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@session_required
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@auth_bp.route('/google/login')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google/callback')
def google_callback():
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.parse_id_token(token)
    
    google_id = user_info['sub']
    email = user_info['email']
    full_name = user_info['name']

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if not user:
            # Create a new user if one doesn't exist
            user = User(email=email, full_name=full_name, google_id=google_id, is_verified=True)
            db.session.add(user)
        else:
            # Link the Google ID to an existing user
            user.google_id = google_id
    
    db.session.commit()
    
    # Store user_id in the session
    session['user_id'] = user.id
    
    # Redirect to a frontend page that can handle the callback
    return redirect(f"http://localhost:3000/auth/callback?user={jsonify(user.to_dict()).data.decode('utf-8')}")

@auth_bp.route('/linkedin/login')
def linkedin_login():
    redirect_uri = url_for('auth.linkedin_callback', _external=True)
    return oauth.linkedin.authorize_redirect(redirect_uri)

@auth_bp.route('/linkedin/callback')
def linkedin_callback():
    token = oauth.linkedin.authorize_access_token()
    resp = oauth.linkedin.get('me')
    profile = resp.json()
    
    linkedin_id = profile['id']
    # LinkedIn API for email is a separate call
    email_resp = oauth.linkedin.get('emailAddress?q=members&projection=(elements*(handle~))')
    email = email_resp.json()['elements'][0]['handle~']['emailAddress']
    full_name = f"{profile['firstName']['localized']['en_US']} {profile['lastName']['localized']['en_US']}"

    user = User.query.filter_by(linkedin_id=linkedin_id).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if not user:
            # Create a new user if one doesn't exist
            user = User(email=email, full_name=full_name, linkedin_id=linkedin_id, is_verified=True)
            db.session.add(user)
        else:
            # Link the LinkedIn ID to an existing user
            user.linkedin_id = linkedin_id
            
    db.session.commit()
    
    # Store user_id in the session
    session['user_id'] = user.id
    
    return redirect(f"http://localhost:3000/auth/callback?user={jsonify(user.to_dict()).data.decode('utf-8')}")


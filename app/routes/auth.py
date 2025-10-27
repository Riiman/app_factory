from flask import request, jsonify, url_for, current_app
from app.routes import auth_bp
from app import db, mail
from app.models import User, Startup
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime
import uuid

def generate_verification_token(email):
    """Generate email verification token"""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-verification')

def verify_token(token, expiration=3600):
    """Verify email verification token"""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='email-verification', max_age=expiration)
        return email
    except (SignatureExpired, BadSignature):
        return None

def send_verification_email(user_email, token):
    """Send verification email"""
    try:
        verification_url = f"http://localhost:3000/verify-email?token={token}"
        
        msg = Message(
            'Verify Your Email - Turning Ideas App Factory',
            recipients=[user_email]
        )
        
        msg.body = f"""
        Welcome to Turning Ideas App Factory!
        
        Please verify your email address by clicking the link below:
        
        {verification_url}
        
        This link will expire in 1 hour.
        
        If you didn't create an account, please ignore this email.
        
        Best regards,
        Turning Ideas Team
        """
        
        msg.html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">Welcome to Turning Ideas App Factory!</h2>
                    <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
                    <div style="margin: 30px 0;">
                        <a href="{verification_url}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 12px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px;
                                  display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Best regards,<br>
                        Turning Ideas Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        mobile = data.get('mobile')
        
        # Validation
        if not email or not password or not full_name:
            return jsonify({'success': False, 'error': 'Email, password, and full name are required'}), 400
        
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            email=email,
            full_name=full_name,
            mobile=mobile
        )
        user.set_password(password)
        
        # Generate verification token
        verification_token = generate_verification_token(email)
        user.verification_token = verification_token
        
        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        email_sent = send_verification_email(email, verification_token)
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully. Please check your email to verify your account.',
            'email_sent': email_sent,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Email verification endpoint"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'success': False, 'error': 'Verification token is required'}), 400
        
        # Verify token
        email = verify_token(token)
        
        if not email:
            return jsonify({'success': False, 'error': 'Invalid or expired verification link'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'success': True, 'message': 'Email already verified'}), 200
        
        # Verify user
        user.is_verified = True
        user.verification_token = None
        
        # Create startup record
        submission_id = str(uuid.uuid4())
        startup = Startup(
            user_id=user.id,
            submission_id=submission_id,
            status='not_started'
        )
        
        db.session.add(startup)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Email verified successfully! You can now login.',
            'submission_id': submission_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'success': False, 'error': 'Email already verified'}), 400
        
        # Generate new token
        verification_token = generate_verification_token(email)
        user.verification_token = verification_token
        db.session.commit()
        
        # Send email
        email_sent = send_verification_email(email, verification_token)
        
        return jsonify({
            'success': True,
            'message': 'Verification email sent successfully',
            'email_sent': email_sent
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        if not user.is_verified:
            return jsonify({'success': False, 'error': 'Please verify your email before logging in'}), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Get startup info
        startup = user.startup
        startup_info = None
        if startup:
            startup_info = {
                'submission_id': startup.submission_id,
                'status': startup.status,
                'current_stage': startup.current_stage
            }
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            'startup': startup_info
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'success': True,
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get startup info
        startup = user.startup
        startup_info = None
        if startup:
            startup_info = {
                'submission_id': startup.submission_id,
                'status': startup.status,
                'current_stage': startup.current_stage
            }
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'startup': startup_info
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

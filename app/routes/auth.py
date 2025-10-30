
from flask import request, jsonify, url_for, current_app
from app.routes import auth_bp
from app import db, mail
from app.models import User, Startup, Submission # Import Submission
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime, timedelta
import uuid
import secrets

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

def send_password_reset_email(user_email, token):
    """Send password reset email"""
    try:
        reset_url = f"http://localhost:3000/reset-password?token={token}"
        
        msg = Message(
            'Reset Your Password - Turning Ideas App Factory',
            recipients=[user_email]
        )
        
        msg.body = f"""
        You requested a password reset for your Turning Ideas App Factory account.
        
        Click the link below to reset your password:
        
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        Turning Ideas Team
        """
        
        msg.html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">Password Reset Request</h2>
                    <p>You requested a password reset for your account.</p>
                    <div style="margin: 30px 0;">
                        <a href="{reset_url}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 12px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
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

@auth_bp.route('/verify-email/<token>', methods=['POST'])
def verify_email(token):
    try:
        if not token:
            return jsonify({'success': False, 'error': 'Verification token is missing.'}), 400

        email = verify_token(token)
        if email is None:
            return jsonify({'success': False, 'error': 'Verification link is invalid or has expired.'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found.'}), 404

        if user.is_verified:
            return jsonify({'success': True, 'message': 'Account already verified.'}), 200

        user.is_verified = True
        db.session.commit()

        return jsonify({'success': True, 'message': 'Email verified successfully. You can now log in.'}), 200
    except Exception as e:
        current_app.logger.error(f"Error during email verification: {e}")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500

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
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401

        if not user.is_verified:
            return jsonify({'success': False, 'error': 'Please verify your email before logging in.'}), 403

        # Check for an existing submission for this user
        submission = Submission.query.filter_by(user_id=user.id).first()
        startup_data = None
        if submission:
            startup_data = {
                'submission_id': submission.id,
                'startup_name': submission.startup_name
            }

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'success': True,
            'token': access_token,
            'user': {
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'is_verified': user.is_verified
            },
            'startup': startup_data # Include startup data in the response
        }), 200

    except Exception as e:
        current_app.logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        # In a real implementation, you might want to blacklist the token
        # For now, we'll just return a success message
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Error during logout: {e}")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=str(current_user_id))
        
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
        print(f"Current user ID: {current_user_id}")
        user = User.query.get(int(current_user_id))
        print(f"Current user: {user}")
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

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Don't reveal if user exists or not
            return jsonify({'success': True, 'message': 'If the email exists, a password reset link has been sent'}), 200
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # Send reset email
        send_password_reset_email(user.email, reset_token)
        
        return jsonify({'success': True, 'message': 'If the email exists, a password reset link has been sent'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    try:
        data = request.json
        token = data.get('token')
        new_password = data.get('newPassword')
        
        if not token or not new_password:
            return jsonify({'success': False, 'error': 'Token and new password are required'}), 400
        
        user = User.query.filter_by(reset_token=token).first()
        
        if not user or user.reset_token_expiry < datetime.utcnow():
            return jsonify({'success': False, 'error': 'Invalid or expired reset token'}), 400
        
        # Update password
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

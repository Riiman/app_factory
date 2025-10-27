import os
import resend
import jwt
from datetime import datetime, timedelta
from flask import current_app, url_for

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

def generate_verification_token(email, expires_in=3600):
    """
    Generate JWT token for email verification.
    
    Args:
        email: User's email address
        expires_in: Token expiration time in seconds (default 1 hour)
    
    Returns:
        JWT token string
    """
    payload = {
        'email': email,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in),
        'iat': datetime.utcnow(),
        'purpose': 'email_verification'
    }
    
    token = jwt.encode(
        payload,
        os.getenv("SECRET_KEY"),
        algorithm='HS256'
    )
    
    return token

def verify_token(token):
    """
    Verify and decode JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Email address if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=['HS256']
        )
        
        # Check if token is for email verification
        if payload.get('purpose') != 'email_verification':
            return None
            
        return payload.get('email')
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def send_verification_email(user_email, user_name, verification_token):
    """
    Send verification email using Resend.
    
    Args:
        user_email: Recipient email address
        user_name: User's name for personalization
        verification_token: JWT token for verification
    
    Returns:
        Response from Resend API
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    verification_link = f"{frontend_url}/verify-email?token={verification_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to VentureXit!</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>Thank you for signing up with VentureXit, India's premier marketplace for startup exits and acquisitions.</p>
                <p>Please verify your email address by clicking the button below:</p>
                <center>
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                </center>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">{verification_link}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't create an account with VentureXit, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2025 VentureXit. All rights reserved.</p>
                <p>Noida, India</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": "VentureXit <noreply@venturexit.in>",  # Update with your verified domain
            "to": [user_email],
            "subject": "Verify your VentureXit account",
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        return {"success": True, "response": response}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_password_reset_email(user_email, user_name, reset_token):
    """
    Send password reset email.
    
    Args:
        user_email: Recipient email address
        user_name: User's name
        reset_token: JWT token for password reset
    
    Returns:
        Response from Resend API
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #DC2626;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #DC2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>We received a request to reset your password for your VentureXit account.</p>
                <p>Click the button below to reset your password:</p>
                <center>
                    <a href="{reset_link}" class="button">Reset Password</a>
                </center>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": "VentureXit <noreply@venturexit.in>",
            "to": [user_email],
            "subject": "Reset your VentureXit password",
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        return {"success": True, "response": response}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

import os
import jwt
from datetime import datetime, timedelta
from flask import current_app, url_for
from flask_mail import Message
from app.extensions import mail
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from googleapiclient.discovery import build


from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def get_gmail_service():
    """Authenticate and return Gmail API service using OAuth 2.0 Refresh Token"""
    try:
        client_id = current_app.config.get('GOOGLE_OAUTH_CLIENT_ID')
        client_secret = current_app.config.get('GOOGLE_OAUTH_CLIENT_SECRET')
        refresh_token = current_app.config.get('GOOGLE_OAUTH_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            print("Error: Missing OAuth credentials in configuration")
            return None
            
        SCOPES = ['https://www.googleapis.com/auth/gmail.send']
        
        # Create credentials object with refresh token
        creds = Credentials(
            None, # No access token initially
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
        
        # Refresh the token if expired (loops through logic to get new access token)
        if not creds.valid:
             creds.refresh(Request())
            
        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        print(f"Error creating Gmail service: {str(e)}")
        return None

def send_email_via_gmail(to_email, subject, html_content, text_content=None):
    """Send email using Gmail API"""
    try:
        service = get_gmail_service()
        if not service:
            return False, "Failed to initialize Gmail service"

        message = MIMEMultipart('alternative')
        message['to'] = to_email
        message['subject'] = subject
        
        # Determine sender email - crucial for DWD
        sender_email = current_app.config.get('MAIL_DEFAULT_SENDER')
        message['from'] = sender_email

        if text_content:
            part1 = MIMEText(text_content, 'plain')
            message.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        message.attach(part2)

        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        body = {'raw': raw_message}

        service.users().messages().send(userId='me', body=body).execute()
        return True, None
    except Exception as e:
        return False, str(e)

def send_email_internal(recipients, subject, html_content, text_content=None):
    """
    Common function to send email via SMTP or Gmail API based on config
    """
    use_gmail_api = current_app.config.get('USE_GMAIL_API', False)
    
    if use_gmail_api:
        success_count = 0
        error_msg = None
        for recipient in recipients:
            success, error = send_email_via_gmail(recipient, subject, html_content, text_content)
            if success:
                success_count += 1
            else:
                error_msg = error
        
        if success_count == len(recipients):
            return {"success": True}
        else:
            return {"success": False, "error": error_msg or "Failed to send to some recipients via Gmail API"}
    else:
        # Fallback to SMTP (Flask-Mail)
        try:
            msg = Message(
                subject=subject,
                recipients=recipients,
                html=html_content,
                body=text_content
            )
            mail.send(msg)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

def generate_verification_token(email, expires_in=3600):
    """
    Generate JWT token for email verification.
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
    
    return send_email_internal([user_email], "Verify your VentureXit account", html_content)

def send_password_reset_email(user_email, user_name, reset_token):
    """
    Send password reset email.
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
    
    return send_email_internal([user_email], "Reset your VentureXit password", html_content)


def get_org_context(email):
    """
    Fetch organization context for a given email.
    Returns: (org_name, org_logo_url)
    """
    from app.models import User
    
    try:
        user = User.query.filter_by(email=email).first()
        if user and user.organization:
            return user.organization.name, user.organization.logo_url
    except Exception as e:
        print(f"Error fetching org context for {email}: {str(e)}")
        
    return "Turning Ideas App Factory", None

# VentureStack Text Logo CSS
VS_LOGO_HTML = """
<div style="font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; background: linear-gradient(to right, #2563eb, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; display: inline-block;">
    VENTURESTACK
</div>
"""

def send_submission_confirmation_email(recipient_email, startup_name):
    """
    Send confirmation email when a startup application is submitted
    """
    org_name, org_logo_url = get_org_context(recipient_email)
    
    subject = f"Application Submitted - {startup_name} to {org_name}"
    
    # Org Logo HTML
    org_logo_html = ""
    if org_logo_url:
        org_logo_html = f'<img src="{org_logo_url}" alt="{org_name}" style="max-height: 40px; margin-left: 15px; vertical-align: middle;">'
    
    # HTML email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                text-align: center;
                padding: 30px 0;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .content {{
                padding: 30px 0;
            }}
            .success-icon {{
                font-size: 48px;
                text-align: center;
                margin: 20px 0;
                color: #10b981;
            }}
            .info-box {{
                background: #f8f9fa;
                border-left: 4px solid #2563eb;
                padding: 15px;
                margin: 20px 0;
            }}
            .highlight {{
                color: #2563eb;
                font-weight: bold;
            }}
            .footer {{
                text-align: center;
                padding-top: 20px;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #e0e0e0;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            {VS_LOGO_HTML}
            {org_logo_html}
        </div>
        
        <div class="content">
            <div class="success-icon">✓</div>
            
            <p>Dear Founder,</p>
            
            <p>Thank you for submitting your application for <span class="highlight">{startup_name}</span> to <strong>{org_name}</strong>!</p>
            
            <div class="info-box">
                <h3>📋 What Happens Next?</h3>
                <ul>
                    <li><strong>Review Period:</strong> Our team will review your application within 5-7 business days</li>
                    <li><strong>Evaluation:</strong> We'll assess your startup based on innovation, market potential, team strength, and scalability</li>
                    <li><strong>Decision:</strong> You'll receive an email with our decision and next steps</li>
                </ul>
            </div>
            
            <p>You can expect to hear from us by <strong>{get_response_date()}</strong></p>
            
            <p>Best regards,<br>
            <strong>The {org_name} Team</strong></p>
        </div>
        
        <div class="footer">
            <p>© {datetime.now().year} {org_name}. Powered by VentureStack.</p>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""
    Application Submitted Successfully!
    
    Dear Founder,
    
    Thank you for submitting your application for {startup_name} to {org_name}!
    
    WHAT HAPPENS NEXT?
    - Review Period: Our team will review your application within 5-7 business days
    - Evaluation: We'll assess your startup based on innovation, market potential, team strength, and scalability
    - Decision: You'll receive an email with our decision and next steps
    
    Timeline: You can expect to hear from us by {get_response_date()}
    
    Best regards,
    The {org_name} Team
    """
    
    result = send_email_internal([recipient_email], subject, html_body, text_body)
    return result.get('success', False)

def send_submission_status_email(email, startup_name, status, message=''):
    """
    Send notification when submission status changes
    """
    org_name, org_logo_url = get_org_context(email)
    
    status_messages = {
        'under_review': {
            'title': 'Application Under Review',
            'message': 'Your application is currently being reviewed by our team.'
        },
        'approved': {
            'title': 'Application Approved! 🎉',
            'message': 'Congratulations! Your application has been approved.'
        },
        'rejected': {
            'title': 'Application Status Update',
            'message': 'Thank you for your application. After careful review, we are unable to move forward at this time.'
        },
        'in_review': {
             'title': 'Application Under Review',
             'message': 'Your application is currently being reviewed by our team.'
        }
    }
    
    status_key = status.lower()
    status_info = status_messages.get(status_key, {
        'title': 'Application Status Update',
        'message': 'Your application status has been updated.'
    })
    
    subject = f"{status_info['title']} - {startup_name}"
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Org Logo HTML
    org_logo_html = ""
    if org_logo_url:
        org_logo_html = f'<img src="{org_logo_url}" alt="{org_name}" style="max-height: 40px; margin-left: 15px; vertical-align: middle;">'

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ 
                text-align: center; 
                padding: 30px 0; 
                border-bottom: 1px solid #e0e0e0; 
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .content {{ padding: 30px 0; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px; }}
            .status-box {{ background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2563eb; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                {VS_LOGO_HTML}
                {org_logo_html}
            </div>
            <div class="content">
                <h2>{status_info['title']}</h2>
                <p>Hello,</p>
                <p><strong>{org_name}</strong> has an update regarding your application for <strong>{startup_name}</strong>.</p>
                
                <div class="status-box">
                    <h3>Status: {status.replace('_', ' ').title()}</h3>
                    <p>{status_info['message']}</p>
                    {f'<p><strong>Additional Notes:</strong> {message}</p>' if message else ''}
                </div>
                
                {'<p>Our team will be in touch with you shortly regarding next steps.</p>' if status == 'approved' else ''}
                {'<p>We encourage you to continue refining your business model and reapply in the future.</p>' if status == 'rejected' else ''}
                
                <a href="{frontend_url}/submissions" class="button">View Submission Details</a>
                
                <p>If you have any questions, please feel free to contact us.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} {org_name}. Powered by VentureStack.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    result = send_email_internal([email], subject, html_content)
    return result.get('success', False)

def send_contact_form_email(data):
    """
    Send contact form submission to admin
    """
    admin_email = os.getenv('MAIL_DEFAULT_SENDER', 'info@venturestackai.com')
    subject = f"New Contact Request: {data.get('name', 'Unknown')}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ 
                text-align: center; 
                padding: 30px 0; 
                border-bottom: 1px solid #e0e0e0; 
            }}
            .content {{ background: #f9f9f9; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin-top: 20px; }}
            .field {{ margin-bottom: 15px; }}
            .label {{ font-weight: bold; color: #555; }}
            .value {{ margin-top: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                {VS_LOGO_HTML}
                <h2>New Contact Request</h2>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Name:</div>
                    <div class="value">{data.get('name', 'N/A')}</div>
                </div>
                <div class="field">
                    <div class="label">Email:</div>
                    <div class="value">{data.get('email', 'N/A')}</div>
                </div>
                <div class="field">
                    <div class="label">Organization:</div>
                    <div class="value">{data.get('organization', 'N/A')}</div>
                </div>
                <div class="field">
                    <div class="label">Timeline:</div>
                    <div class="value">{data.get('timeline', 'N/A')}</div>
                </div>
                <div class="field">
                    <div class="label">Use Case:</div>
                    <div class="value">{data.get('useCase', 'N/A')}</div>
                </div>
                <div class="field">
                    <div class="label">Message:</div>
                    <div class="value">{data.get('message', 'N/A')}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    result = send_email_internal([admin_email], subject, html_content)
    return result.get('success', False)


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
    
    return send_email_internal([user_email], "Verify your VentureXit account", html_content)

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
    
    return send_email_internal([user_email], "Reset your VentureXit password", html_content)


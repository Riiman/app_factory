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
    
    body_html = f"""
    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Hi {user_name},
    </p>

    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Thanks for joining VentureStack. Please confirm your email address to activate your account.
    </p>

    <p style="margin-top:24px; font-size:13px; color:#6b7280;">
    This link expires in 1 hour.
    </p>

    <p style="font-size:13px; color:#6b7280; word-break:break-all;">
    {verification_link}
    </p>

    <p style="margin-top:24px; font-size:13px; color:#6b7280;">
    If you didn’t create a VentureStack account, you can safely ignore this email.
    </p>
    """

    html_content = render_premium_email(
        title="Verify your email",
        body_html=body_html,
        cta_text="Confirm email",
        cta_link=verification_link
    )
        
    return send_email_internal([user_email], "Verify your VentureXit account", html_content)

def send_password_reset_email(user_email, user_name, reset_token):
    """
    Send password reset email.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    body_html = f"""
    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Hi {user_name},
    </p>

    <p style="font-size:15px; line-height:1.7; color:#374151;">
    We received a request to reset your VentureStack password.
    </p>

    <p style="margin-top:24px; font-size:13px; color:#6b7280;">
    This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.
    </p>
    """

    html_content = render_premium_email(
        title="Reset your password",
        body_html=body_html,
        cta_text="Reset password",
        cta_link=reset_link,
        footer_note="Security first"
    )
    
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
<div style="
  font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size:22px;
  font-weight:700;
  letter-spacing:-0.3px;
  background:linear-gradient(90deg, #2563eb, #f97316);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  display:inline-block;
">
  VentureStack
</div>
"""


def render_premium_email(
    title,
    body_html,
    cta_text=None,
    cta_link=None,
    footer_note="Built for serious founders"
):
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>
<body style="
  margin:0;
  padding:0;
  background-color:#f6f7f9;
  font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="
          background:#ffffff;
          border-radius:14px;
          box-shadow:0 12px 30px rgba(0,0,0,0.05);
          overflow:hidden;
        ">

          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 24px; border-bottom:1px solid #eef0f3;">
              {VS_LOGO_HTML}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <h1 style="
                margin:0 0 16px;
                font-size:24px;
                font-weight:600;
                color:#111827;
              ">
                {title}
              </h1>

              {body_html}

              {f'''
              <a href="{cta_link}" style="
                display:inline-block;
                margin-top:28px;
                padding:14px 28px;
                background:#111827;
                color:#ffffff;
                font-size:14px;
                font-weight:500;
                text-decoration:none;
                border-radius:10px;
              ">
                {cta_text}
              </a>
              ''' if cta_text and cta_link else ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:28px 48px;
              background:#fafafa;
              border-top:1px solid #eef0f3;
              font-size:12px;
              color:#9ca3af;
            ">
              © {datetime.now().year} VentureStack · {footer_note}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
    body_html = f"""
    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Dear Founder,
    </p>

    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Thank you for submitting your application for
    <strong>{startup_name}</strong> to <strong>{org_name}</strong>.
    </p>

    <div style="
    margin:24px 0;
    padding:16px;
    background:#f9fafb;
    border-left:4px solid #111827;
    font-size:14px;
    color:#374151;
    ">
    <strong>What happens next</strong><br><br>
    • Review within 5–7 business days<br>
    • Evaluation based on market, team, and scalability<br>
    • You’ll receive an update by <strong>{get_response_date()}</strong>
    </div>

    <p style="font-size:14px; color:#374151;">
    We appreciate the time you took to apply.
    </p>

    <p style="font-size:14px; color:#374151;">
    — The {org_name} Team
    </p>
    """

    html_body = render_premium_email(
        title="Application submitted",
        body_html=body_html,
        footer_note="Powered by VentureStack"
    )
    
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

    status_label = status.replace("_", " ").title()

    body_html = f"""
    <p style="font-size:15px; line-height:1.7; color:#374151;">
    Hello,
    </p>

    <p style="font-size:15px; line-height:1.7; color:#374151;">
    <strong>{org_name}</strong> has updated the status of your application for
    <strong>{startup_name}</strong>.
    </p>

    <div style="
    margin:24px 0;
    padding:16px;
    background:#f9fafb;
    border-left:4px solid #111827;
    font-size:14px;
    color:#374151;
    ">
    <strong>Status:</strong> {status_label}<br><br>
    {status_info['message']}
    {f'<br><br><strong>Notes:</strong> {message}' if message else ''}
    </div>

    <p style="font-size:14px; color:#374151;">
    You can view more details in your dashboard.
    </p>
    """

    html_content = render_premium_email(
        title=status_info["title"],
        body_html=body_html,
        cta_text="View submission",
        cta_link=f"{frontend_url}/submissions"
    )
    
    result = send_email_internal([email], subject, html_content)
    return result.get('success', False)

def send_contact_form_email(data):
    """
    Send contact form submission to admin
    """
    admin_email = os.getenv('MAIL_DEFAULT_SENDER', 'info@venturestackai.com')
    subject = f"New Contact Request: {data.get('name', 'Unknown')}"
    
    body_html = f"""
    <p style="font-size:15px; color:#374151;">
    A new contact request has been submitted.
    </p>

    <div style="
    margin:24px 0;
    padding:16px;
    background:#f9fafb;
    border-left:4px solid #111827;
    font-size:14px;
    color:#374151;
    ">
    <strong>Name:</strong> {data.get('name', 'N/A')}<br><br>
    <strong>Email:</strong> {data.get('email', 'N/A')}<br><br>
    <strong>Organization:</strong> {data.get('organization', 'N/A')}<br><br>
    <strong>Timeline:</strong> {data.get('timeline', 'N/A')}<br><br>
    <strong>Use case:</strong> {data.get('useCase', 'N/A')}<br><br>
    <strong>Message:</strong><br>
    {data.get('message', 'N/A')}
    </div>
    """

    html_content = render_premium_email(
        title="New contact request",
        body_html=body_html,
        footer_note="Internal notification"
    )
    
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
            }}
            .content {{
                padding: 30px 0;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #dc2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
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
        </div>
        
        <div class="content">
            <p>Hi {user_name},</p>
            <p>We received a request to reset your password.</p>
            <p>Click the button below to reset it:</p>
            
            <center>
                <a href="{reset_link}" class="button">Reset Password</a>
            </center>
            
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>© {datetime.now().year} VentureStack. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    return send_email_internal([user_email], "Reset your VentureStack password", html_content)


def get_response_date():
    """Calculate expected response date (7 business days from now)"""
    from datetime import datetime, timedelta
    
    today = datetime.now()
    business_days = 0
    current_date = today
    
    while business_days < 7:
        current_date += timedelta(days=1)
        # Skip weekends (5 = Saturday, 6 = Sunday)
        if current_date.weekday() < 5:
            business_days += 1
    
    return current_date.strftime("%B %d, %Y")

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

def send_email(to_email, subject, html_content):
    """
    Send an email using SMTP
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = Config.MAIL_DEFAULT_SENDER
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            server.starttls()
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


def send_verification_email(email, token):
    """
    Send email verification link
    """
    verification_url = f"{Config.FRONTEND_URL}/verify-email?token={token}"
    
    subject = "Verify Your Email - Turning Ideas App Factory"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Turning Ideas App Factory!</h1>
            </div>
            <div class="content">
                <p>Thank you for signing up! Please verify your email address to get started.</p>
                <p>Click the button below to verify your email:</p>
                <a href="{verification_url}" class="button">Verify Email</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)


def send_password_reset_email(email, token):
    """
    Send password reset link
    """
    reset_url = f"{Config.FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Reset Your Password - Turning Ideas App Factory"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}

            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>We received a request to reset your password.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)


def send_welcome_email(email, name):
    """
    Send welcome email after successful verification
    """
    subject = "Welcome to Turning Ideas App Factory!"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .feature {{ margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome, {name}!</h1>
            </div>
            <div class="content">
                <p>Your email has been verified successfully. Welcome to Turning Ideas App Factory!</p>
                <p>Here's what you can do next:</p>
                
                <div class="feature">
                    <h3>📝 Complete Your Evaluation Form</h3>
                    <p>Fill out our comprehensive startup evaluation form to get started.</p>
                </div>
                
                <div class="feature">
                    <h3>📄 Generate Documents</h3>
                    <p>Use our AI-powered tools to create pitch decks, business plans, and financial models.</p>
                </div>
                
                <div class="feature">
                    <h3>📊 Track Your Progress</h3>
                    <p>Monitor your application status and manage your submissions from the dashboard.</p>
                </div>
                
                <a href="{Config.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                
                <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)


def send_submission_confirmation_email(email, startup_name):
    """
    Send confirmation email after submission
    """
    subject = f"Submission Received - {startup_name}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .info-box {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Submission Received!</h1>
            </div>
            <div class="content">
                <p>Thank you for submitting your application for <strong>{startup_name}</strong>.</p>
                
                <div class="info-box">
                    <h3>What Happens Next?</h3>
                    <ul>
                        <li>Our team will review your submission within 5-7 business days</li>
                        <li>You'll receive an email notification once the review is complete</li>
                        <li>You can track your submission status in your dashboard</li>
                    </ul>
                </div>
                
                <p>In the meantime, you can:</p>
                <ul>
                    <li>Generate additional documents for your startup</li>
                    <li>Update your profile information</li>
                    <li>Prepare for potential follow-up questions</li>
                </ul>
                
                <a href="{Config.FRONTEND_URL}/dashboard" class="button">View Dashboard</a>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)


def send_document_generation_email(email, document_title, document_type):
    """
    Send notification when document generation is complete
    """
    subject = f"Document Ready - {document_title}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Your Document is Ready!</h1>
            </div>
            <div class="content">
                <div class="success-icon">✅</div>
                <p>Great news! Your <strong>{document_type}</strong> has been generated successfully.</p>
                <p><strong>Document:</strong> {document_title}</p>
                <p>You can now download your document from the dashboard.</p>
                
                <a href="{Config.FRONTEND_URL}/documents" class="button">View Documents</a>
                
                <p>The document has been created using AI and tailored to your startup information. Please review it carefully and make any necessary adjustments.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)


def send_submission_status_email(email, startup_name, status, message=''):
    """
    Send notification when submission status changes
    """
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
        }
    }
    
    status_info = status_messages.get(status, {
        'title': 'Application Status Update',
        'message': 'Your application status has been updated.'
    })
    
    subject = f"{status_info['title']} - {startup_name}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .status-box {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{status_info['title']}</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We have an update regarding your application for <strong>{startup_name}</strong>.</p>
                
                <div class="status-box">
                    <h3>Status: {status.replace('_', ' ').title()}</h3>
                    <p>{status_info['message']}</p>
                    {f'<p><strong>Additional Notes:</strong> {message}</p>' if message else ''}
                </div>
                
                {'<p>Our team will be in touch with you shortly regarding next steps.</p>' if status == 'approved' else ''}
                {'<p>We encourage you to continue refining your business model and reapply in the future.</p>' if status == 'rejected' else ''}
                
                <a href="{Config.FRONTEND_URL}/submissions" class="button">View Submission Details</a>
                
                <p>If you have any questions, please feel free to contact us.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Turning Ideas App Factory. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, html_content)
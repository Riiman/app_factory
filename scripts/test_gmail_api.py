import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.email_utils import send_email_internal

def test_email():
    app = create_app()
    with app.app_context():
        print(f"Testing with provider: {'Gmail API' if app.config.get('USE_GMAIL_API') else 'SMTP'}")
        
        recipients = ['rimanshu@venturestackai.com', 'rimanshu@gmail.com']
        subject = "Test Email from VentureXit System"
        html_content = """
        <h1>Gmail API Integration Test</h1>
        <p>This is a test email sent using the Gmail API integration.</p>
        <p>If you received this, the OAuth 2.0 implementation is working correctly!</p>
        """
        text_content = "This is a test email sent using the Gmail API integration. If you received this, the OAuth 2.0 implementation is working correctly!"
        
        print(f"Sending email to: {recipients}")
        result = send_email_internal(recipients, subject, html_content, text_content)
        
        print(f"Result: {result}")

if __name__ == "__main__":
    test_email()

import sys
import os
from unittest.mock import MagicMock, patch

# Add current directory to path
sys.path.append(os.getcwd())

# Mock firebase_admin before importing app to avoid RuntimeError during create_app
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.credentials'] = MagicMock()

from app import create_app
from config import TestingConfig
from app.email_utils import send_submission_confirmation_email, send_submission_status_email
from app.extensions import mail

def test_email_sending():
    """
    Test email sending functions with mocked mail.send
    """
    # Create app with TestingConfig class
    app = create_app(TestingConfig)
    
    with app.app_context():
        # Mock the mail.send method
        with patch.object(mail, 'send') as mock_send:
            print("Testing send_submission_confirmation_email...")
            # Test confirmation email
            result_conf = send_submission_confirmation_email("test@example.com", "My Startup")
            
            if result_conf and mock_send.called:
                print("✅ send_submission_confirmation_email Success!")
                args, _ = mock_send.call_args
                msg = args[0]
                print(f"   Subject: {msg.subject}")
                print(f"   Recipients: {msg.recipients}")
            else:
                print("❌ send_submission_confirmation_email Failed!")
                print(f"   Result: {result_conf}")
                print(f"   Mock Called: {mock_send.called}")
                
            mock_send.reset_mock()
            
            print("\nTesting send_submission_status_email...")
            # Test status update email
            result_status = send_submission_status_email("test@example.com", "My Startup", "approved")
            
            if result_status and mock_send.called:
                print("✅ send_submission_status_email Success!")
                args, _ = mock_send.call_args
                msg = args[0]
                print(f"   Subject: {msg.subject}")
                print(f"   Recipients: {msg.recipients}")
            else:
                print("❌ send_submission_status_email Failed!")
                print(f"   Result: {result_status}")
                print(f"   Mock Called: {mock_send.called}")

if __name__ == "__main__":
    test_email_sending()

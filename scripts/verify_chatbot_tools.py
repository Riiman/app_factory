
import sys
import os
from unittest.mock import MagicMock, patch

# Add app directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock AzureChatOpenAI before importing service
with patch('app.services.chatbot.service.AzureChatOpenAI') as mock_llm:
    from app.services.chatbot.service import AIAssistantService
    from app.models import Startup
    
    # Mock db.session and models
    with patch('app.services.chatbot.service.db'):
        print("Initializing AIAssistantService...")
        service = AIAssistantService()
        
        print("Verifying tool creation methods exist...")
        methods = [
            'create_financial_tool',
            'create_product_tool',
            'create_marketing_tool',
            'create_team_tool',
            'create_fundraising_tool',
            'create_documents_tool',
            'create_tasks_tool',
            'create_business_overview_tool'
        ]
        
        all_present = True
        for method in methods:
            if hasattr(service, method):
                print(f"[OK] {method} exists")
            else:
                print(f"[FAIL] {method} MISSING")
                all_present = False
                
        if all_present:
            print("\nAll tool creation methods are present.")
            
            # Verify process_query calls them (static analysis or simple invocation check logic)
            # Since process_query instantiates an agent which might fail with mocks, 
            # we mainly rely on existence here.
            print("Verification Complete.")
        else:
            print("\nVerification Failed.")
            sys.exit(1)

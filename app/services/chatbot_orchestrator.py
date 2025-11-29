from app.models import Submission
from app.extensions import db
from app.utils.chatbot_llm_utils import extract_submission_details_from_message

SUBMISSION_FIELDS = [
    {"key": "startup_name", "question": "What is the name of your startup?", "type": "string"},
    {"key": "founders_and_inspiration", "question": "Tell me about the founders and their inspiration for starting the company.", "type": "string"},
    {"key": "problem_statement", "question": "What specific problem is your startup trying to solve?", "type": "string"},
    {"key": "who_experiences_problem", "question": "Who are the primary people or businesses that experience this problem?", "type": "string"},
    {"key": "product_service_idea", "question": "Describe your product or service idea.", "type": "string"},
    {"key": "how_solves_problem", "question": "How does your product or service solve this problem?", "type": "string"},
    {"key": "intended_users_customers", "question": "Who are your intended users or customers?", "type": "string"},
    {"key": "main_competitors_alternatives", "question": "Who are your main competitors or alternatives?", "type": "string"},
    {"key": "how_stands_out", "question": "How does your startup stand out from the competition?", "type": "string"},
    {"key": "startup_type", "question": "What type of startup is it? (e.g., SaaS, E-commerce, Marketplace, AI, etc.)", "type": "string"},
]

class ChatbotOrchestrator:
    def __init__(self, submission_id):
        self.submission = Submission.query.get(submission_id)
        print(f"ORCHESTRATOR: Initialized with submission ID: {submission_id}, state: {self.submission.chat_progress_step}")
        if not self.submission:
            raise ValueError("Submission not found")

    def process_user_message(self, user_message):
        print(f"ORCHESTRATOR: Processing message: '{user_message}'")

        # Step 1: ALWAYS extract details from the user's message using the LLM.
        print("ORCHESTRATOR: Extracting data from message.")
        extracted_data = extract_submission_details_from_message(user_message, SUBMISSION_FIELDS, self.submission.to_dict())
        print(f"ORCHESTRATOR: Extracted data: {extracted_data}")

        # Step 2: ALWAYS update the submission with any extracted data, but only if the field is currently empty.
        if extracted_data and "error" not in extracted_data:
            for key, value in extracted_data.items():
                if hasattr(self.submission, key) and value:
                    print(f"ORCHESTRATOR: Setting {key} = {value}")
                    setattr(self.submission, key, value)
        
        # Step 3: ALWAYS find the next unanswered question AFTER updating.
        next_question = None
        next_question_key = None
        for field in SUBMISSION_FIELDS:
            if not getattr(self.submission, field['key']):
                next_question = field['question']
                next_question_key = field['key']
                break
        
        # Step 4: Determine the outcome and commit to the database.
        if not next_question:
            self.submission.chat_progress_step = 'completed'
            self.submission.status = 'IN_REVIEW' 
            print(f"ORCHESTRATOR: State before commit: chat_progress_step='completed', status='IN_REVIEW'")
            db.session.commit()
            db.session.refresh(self.submission) # Refresh to get the latest data
            return {
                "next_question": "Thank you! Your submission is complete and is now in review.",
                "submission_data": self.submission.to_dict(),
                "is_completed": True
            }
        else:
            self.submission.chat_progress_step = next_question_key
            print(f"ORCHESTRATOR: State before commit: chat_progress_step='{self.submission.chat_progress_step}'")
            db.session.commit()
            db.session.refresh(self.submission) # Refresh to get the latest data
            return {
                "next_question": next_question,
                "submission_data": self.submission.to_dict(),
                "is_completed": False
            }

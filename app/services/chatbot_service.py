import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables from .env file
load_dotenv()

class StartupAnalyzerChatbot:
    def __init__(self):
        self.client = self._initialize_azure_openai_client()
        self.conversation_history = []
        self.startup_data = {
            "startup_name": [],
            "founders_and_inspiration": [],
            "problem_statement": [],
            "who_experiences_problem": [],
            "product_service_idea": [],
            "how_solves_problem": [],
            "intended_users_customers": [],
            "main_competitors_alternatives": [],
            "how_stands_out": [],
            "startup_type": "unknown" # To be inferred
        }
        self.core_questions = [
            {"key": "startup_name", "question": "What is the name of your startup?"},
            {"key": "founders_and_inspiration", "question": "Who are the founders and what was the inspiration behind starting this venture?"},
            {"key": "problem_statement", "question": "What specific problem is the startup solving?"},
            {"key": "who_experiences_problem", "question": "Who experiences this problem?"},
            {"key": "product_service_idea", "question": "Describe the Proposed Solution: What is the product or service idea?"},
            {"key": "how_solves_problem", "question": "How does your product or service solve the problem?"},
            {"key": "intended_users_customers", "question": "Who are the intended users/customers for your solution?"},
            {"key": "main_competitors_alternatives", "question": "List main competitors or alternatives to your solution."},
            {"key": "how_stands_out", "question": "How does this startup stand out from competitors or alternatives?"}
        ]
        self.current_question_index = 0

    def _initialize_azure_openai_client(self):
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION")
        azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME")

        if not all([api_key, api_version, azure_endpoint, deployment_name]):
            raise ValueError(
                "Missing one or more required Azure OpenAI environment variables: "
                "AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME."
            )

        return AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    def _llm_chat(self, prompt, system_message=None):
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        
        messages.extend(self.conversation_history)
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            llm_response = response.choices[0].message.content
            return llm_response
        except Exception as e:
            print(f"Error communicating with Azure OpenAI: {e}")
            return "I'm sorry, I'm having trouble communicating right now. Please try again later."

    def _evaluate_completeness(self, question_key, user_response):
        evaluation_prompt = f"""
        The user was asked: "{self._get_question_text(question_key)}"
        The user responded: "{user_response}"

        Is this response detailed enough to understand this aspect of the startup? A simple name is complete, but other topics need more substance.
        Respond with only "YES" if it's sufficient, or "NO" followed by a friendly, encouraging request for more specific information.
        """
        evaluation_result = self._llm_chat(evaluation_prompt, system_message="You are a friendly AI assistant helping a founder flesh out their startup idea. Your goal is to get complete and detailed answers.")
        return evaluation_result.strip().upper()

    def _generate_follow_up_question(self, question_key, user_response):
        follow_up_prompt = f"""
        The user was asked: "{self._get_question_text(question_key)}"
        Their response was: "{user_response}"
        This was considered incomplete.

        Ask a friendly, specific, and complimentary follow-up question to encourage them to provide more detail on this topic. For example, if they gave a short problem statement, you could say, "That's a great starting point! Could you tell me a bit more about who typically faces this problem?"
        """
        follow_up_question = self._llm_chat(follow_up_prompt, system_message="You are a friendly and encouraging AI assistant helping a founder build their startup idea.")
        return follow_up_question

    def _infer_startup_type(self):
        if self.startup_data["problem_statement"] and self.startup_data["product_service_idea"]:
            problem_statement = self.startup_data["problem_statement"][-1]["answer"] if self.startup_data["problem_statement"] else ""
            product_service_idea = self.startup_data["product_service_idea"][-1]["answer"] if self.startup_data["product_service_idea"] else ""

            if problem_statement and product_service_idea:
                inference_prompt = f"""
                Based on the following information, what type of startup is this? (e.g., Software, Manufacturing, Service, E-commerce, Biotech, Fintech, etc.)
                Problem: {problem_statement}
                Solution: {product_service_idea}
                
                Respond with only the most relevant single word or short phrase for the startup type.
                """
                startup_type = self._llm_chat(inference_prompt, system_message="You are an AI assistant that infers startup types.")
                self.startup_data["startup_type"] = startup_type.strip()
                return f"Got it, thanks! Based on that, it sounds like you're building a {self.startup_data['startup_type']} startup. That helps me tailor the next questions."
        return None

    def _get_question_text(self, key):
        for q in self.core_questions:
            if q["key"] == key:
                return q["question"]
        return ""

    def start_chat(self):
        self.conversation_history.append({"role": "assistant", "content": "Hello! I'm here to help you gather information about your startup idea. We'll go through a few questions together."})
        first_question = self.core_questions[0]["question"]
        self.conversation_history.append({"role": "assistant", "content": first_question})
        return first_question

    def process_response(self, user_response):
        if self.current_question_index >= len(self.core_questions):
            return "Thank you for providing all the information. We will now finalize your submission.", True

        item = self.core_questions[self.current_question_index]
        question_key = item["key"]
        current_question = self.conversation_history[-1]['content'] # Get the last question asked

        self.conversation_history.append({"role": "user", "content": user_response})
        
        # Store the current Q&A for the item, even if incomplete, to track interactions
        item_q_a_history = self.startup_data.setdefault(question_key, [])
        item_q_a_history.append({"question": current_question, "answer": user_response})

        # Use LLM to evaluate completeness
        evaluation = self._evaluate_completeness(question_key, user_response)

        if evaluation.startswith("YES"):
            # Answer is complete
            self.current_question_index += 1

            # Compliment and move to the next question
            if self.current_question_index < len(self.core_questions):
                next_question_text = self.core_questions[self.current_question_index]["question"]
                response_text = f"Excellent, that's very clear. Now, let's move on. {next_question_text}"
                self.conversation_history.append({"role": "assistant", "content": response_text})
                return response_text, False
            else:
                # All questions answered
                response_text = "Great, that’s all the information I need. Thank you for sharing the details of your venture. We will now finalize your submission."
                self.conversation_history.append({"role": "assistant", "content": response_text})
                return response_text, True
        else:
            # Answer is incomplete, check follow-up limit
            # Max 2 follow-ups (initial question + 2 follow-ups = 3 entries in item_q_a_history)
            if len(item_q_a_history) < 3:
                follow_up_question = evaluation.replace("NO", "").strip()
                if not follow_up_question: # Fallback if the LLM just says "NO"
                    follow_up_question = self._generate_follow_up_question(question_key, user_response)

                self.conversation_history.append({"role": "assistant", "content": follow_up_question})
                return follow_up_question, False
            else:
                # Follow-up limit reached, accept current answer and move to next question
                response_text = f"Thank you for that. We've gathered enough information on '{self._get_question_text(question_key)}' for now. Let's move on to the next topic."
                self.current_question_index += 1
                
                if self.current_question_index < len(self.core_questions):
                    next_question_text = self.core_questions[self.current_question_index]["question"]
                    response_text += f" {next_question_text}"
                    self.conversation_history.append({"role": "assistant", "content": response_text})
                    return response_text, False
                else:
                    response_text = "Great, that’s all the information I need. Thank you for sharing the details of your venture. We will now finalize your submission."
                    self.conversation_history.append({"role": "assistant", "content": response_text})
                    return response_text, True


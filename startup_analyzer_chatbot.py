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
            {"key": "problem_statement", "question": "What specific problem is the startup solving?"},
            {"key": "who_experiences_problem", "question": "Who experiences this problem?"},
            {"key": "product_service_idea", "question": "Describe the Proposed Solution: What is the product or service idea?"},
            {"key": "how_solves_problem", "question": "How does your product or service solve the problem?"},
            {"key": "intended_users_customers", "question": "Who are the intended users/customers for your solution?"},
            {"key": "main_competitors_alternatives", "question": "List main competitors or alternatives to your solution."},
            {"key": "how_stands_out", "question": "How does this startup stand out from competitors or alternatives?"}
        ]

    def _initialize_azure_openai_client(self):
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        api_version = os.environ.get("AZURE_API_VERSION")
        azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        deployment_name = os.environ.get("DEPLOYMENT_NAME")

        if not all([api_key, api_version, azure_endpoint, deployment_name]):
            raise ValueError(
                "Missing one or more required Azure OpenAI environment variables: "
                "AZURE_OPENAI_API_KEY, AZURE_API_VERSION, AZURE_OPENAI_ENDPOINT, DEPLOYMENT_NAME."
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
        
        # Add previous conversation history for context
        messages.extend(self.conversation_history)
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=os.environ.get("DEPLOYMENT_NAME"),
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            llm_response = response.choices[0].message.content
            # Only store the LLM's direct response to the user's input in the main conversation history
            # The specific Q&A for each item will be stored separately
            # self.conversation_history.append({"role": "user", "content": prompt}) # This is already handled by the main loop
            # self.conversation_history.append({"role": "assistant", "content": llm_response})
            return llm_response
        except Exception as e:
            print(f"Error communicating with Azure OpenAI: {e}")
            return "I'm sorry, I'm having trouble communicating right now. Please try again later."

    def _get_user_input(self, prompt):
        print(f"LLM: {prompt}")
        user_input = input("You: ")
        return user_input

    def _evaluate_completeness(self, question_key, user_response):
        # Prompt the LLM to evaluate if the response is complete enough
        evaluation_prompt = f"""
        The user was asked: "{self._get_question_text(question_key)}"
        The user responded: "{user_response}"

        Based on the question and the response, is the response sufficiently detailed and complete for understanding this aspect of a startup?
        Respond with "YES" if it is complete, or "NO" followed by a brief reason if it is not.
        """
        evaluation_result = self._llm_chat(evaluation_prompt, system_message="You are an AI assistant evaluating the completeness of user responses.")
        return evaluation_result.strip().upper()

    def _generate_follow_up_question(self, question_key, user_response):
        # Prompt the LLM to generate a specific follow-up question
        follow_up_prompt = f"""
        The user was asked: "{self._get_question_text(question_key)}"
        The user responded: "{user_response}"
        The startup type is currently inferred as: "{self.startup_data['startup_type']}".

        Based on the previous interaction and the need for more detail, generate a concise, specific follow-up question to get more information about this topic, considering the inferred startup type.
        """
        follow_up_question = self._llm_chat(follow_up_prompt, system_message="You are an AI assistant generating follow-up questions for a startup information gathering process.")
        return follow_up_question

    def _infer_startup_type(self):
        if self.startup_data["problem_statement"] and self.startup_data["product_service_idea"]:
            # Extract the final answer from the list for inference
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
                print(f"LLM: I've inferred this is a {self.startup_data['startup_type']} startup.")

    def _get_question_text(self, key):
        for q in self.core_questions:
            if q["key"] == key:
                return q["question"]
        return ""

    def get_startup_info(self):
        print("Hello! I'm here to help you gather information about your startup idea.")
        print("Please answer the questions to the best of your ability.")
        print("Type 'exit' or 'quit' at any time to stop the conversation.")

        for item in self.core_questions:
            question_key = item["key"]
            current_question = item["question"]
            
            response_complete = False
            user_response = ""

            # Initialize a list to store Q&A for the current item
            q_a_history_for_item = []

            while not response_complete:
                user_response = self._get_user_input(current_question)
                if user_response.lower() in ['exit', 'quit']:
                    print("Exiting conversation.")
                    return None

                # Add current Q&A to the item's history
                q_a_history_for_item.append({"question": current_question, "answer": user_response})

                # Evaluate completeness
                evaluation_result = self._evaluate_completeness(question_key, user_response)
                
                if evaluation_result.startswith("YES"):
                    response_complete = True
                    self.startup_data[question_key] = q_a_history_for_item # Store the full Q&A history
                else:
                    print(f"LLM: {evaluation_result}") # Print the reason for incompleteness
                    current_question = self._generate_follow_up_question(question_key, user_response)
                    # The generated follow-up becomes the next question
            
            # Infer startup type after problem and solution are somewhat defined
            if question_key in ["problem_statement", "product_service_idea"]:
                self._infer_startup_type()

        return self.startup_data

if __name__ == "__main__":
    chatbot = StartupAnalyzerChatbot()
    collected_data = chatbot.get_startup_info()

    if collected_data:
        print("\n--- Startup Information Collected ---")
        for key, value in collected_data.items():
            if key == "startup_type":
                print(f"{key.replace('_', ' ').title()}: {value}")
            else:
                print(f"\n--- {key.replace('_', ' ').title()} ---")
                for qa in value:
                    print(f"  Q: {qa['question']}")
                    print(f"  A: {qa['answer']}")

        # Save to a JSON file
        output_filename = "startup_info.json"
        with open(output_filename, "w") as f:
            json.dump(collected_data, f, indent=4)
        print(f"Information saved to {output_filename}")

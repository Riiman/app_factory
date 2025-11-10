import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Placeholder for LLM interaction
# In a real scenario, you would integrate with an LLM API (e.g., OpenAI, Google Gemini)
# For demonstration, this function simulates LLM behavior.
def llm_chat(prompt, conversation_history):
    # In a real application, you'd send the prompt and history to an LLM API
    # and get a natural language response.
    # For now, we'll just print the prompt and get user input.
    print(f"LLM: {prompt}")
    user_input = input("You: ")
    conversation_history.append({"role": "user", "content": user_input})
    return user_input

def get_startup_info():
    startup_data = {
        "problem_statement": "",
        "who_experiences_problem": "",
        "product_service_idea": "",
        "how_solves_problem": "",
        "intended_users_customers": "",
        "main_competitors_alternatives": "",
        "how_stands_out": ""
    }

    questions = [
        {
            "key": "problem_statement",
            "question": "What specific problem is the startup solving?",
            "follow_up": "Could you elaborate more on the problem? What are its key aspects?",
            "min_length": 20
        },
        {
            "key": "who_experiences_problem",
            "question": "Who experiences this problem?",
            "follow_up": "Can you describe the target audience or user segment that faces this problem in more detail?",
            "min_length": 10
        },
        {
            "key": "product_service_idea",
            "question": "Describe the Proposed Solution: What is the product or service idea?",
            "follow_up": "Please provide more details about your product or service idea. What are its core features?",
            "min_length": 20
        },
        {
            "key": "how_solves_problem",
            "question": "How does your product or service solve the problem?",
            "follow_up": "Can you explain the mechanism or unique approach by which your solution addresses the problem?",
            "min_length": 20
        },
        {
            "key": "intended_users_customers",
            "question": "Who are the intended users/customers for your solution?",
            "follow_up": "Who exactly are your ideal customers? Can you describe their demographics, needs, or behaviors?",
            "min_length": 10
        },
        {
            "key": "main_competitors_alternatives",
            "question": "List main competitors or alternatives to your solution.",
            "follow_up": "Who are the primary competitors or existing alternatives? Please list a few and briefly describe them.",
            "min_length": 10
        },
        {
            "key": "how_stands_out",
            "question": "How does this startup stand out from competitors or alternatives?",
            "follow_up": "What makes your startup unique or better than the existing solutions? What is your competitive advantage?",
            "min_length": 20
        }
    ]

    conversation_history = []

    for item in questions:
        response = ""
        while len(response) < item["min_length"]:
            current_question = item["question"] if not response else item["follow_up"]
            response = llm_chat(current_question, conversation_history)
            if len(response) < item["min_length"]:
                print("LLM: That's a good start, but I need a bit more detail. Let's try again.")
        startup_data[item["key"]] = response
        conversation_history.append({"role": "assistant", "content": response}) # Simulate LLM remembering its own output

    return startup_data

if __name__ == "__main__":
    print("Hello! I'm here to help you gather information about your startup idea.")
    print("Please answer the questions to the best of your ability.")
    
    collected_data = get_startup_info()

    print("\n--- Startup Information Collected ---")
    for key, value in collected_data.items():
        print(f"{key.replace('_', ' ').title()}: {value}")

    # Save to a JSON file
    output_filename = "startup_info.json"
    with open(output_filename, "w") as f:
        json.dump(collected_data, f, indent=4)
    print(f"Information saved to {output_filename}")

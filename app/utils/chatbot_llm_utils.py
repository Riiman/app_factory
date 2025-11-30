import os
from openai import AzureOpenAI
import json

def extract_submission_details_from_message(user_message, fields_to_extract, current_submission=None):
    """
    Uses Azure OpenAI's function calling capability to extract structured data
    from a user's message.
    """
    try:
        client = AzureOpenAI(
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        )

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "update_submission_details",
                    "description": "Updates the submission details with the information extracted from the user's message.",
                    "parameters": {
                        "type": "object",
                        "properties": {field["key"]: {"type": field["type"], "description": field["question"]} for field in fields_to_extract},
                        "required": [], # We make all fields optional so the LLM can extract whatever it finds
                    },
                },
            }
        ]

        messages = [
            {"role": "system", "content": "You are a helpful assistant helping a user fill out their startup submission. Your goal is to extract key information from the user's responses. Review the 'Current Submission Data' and the new 'user_message'. Refine, merge, or add to the existing data to create the most complete and accurate version of each field. Use the available tool to update the submission details with this improved information. You can extract multiple pieces of information from a single user message."},
        ]

        if current_submission:
            existing_data = {k: v for k, v in current_submission.items() if v is not None and k in [f["key"] for f in fields_to_extract]}
            if existing_data:
                messages.append({"role": "system", "content": f"Current Submission Data: {json.dumps(existing_data)}"})
        
        messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
            tool_call = tool_calls[0]
            function_args = json.loads(tool_call.function.arguments)
            return function_args

        return {} # Return an empty dict if no details were extracted

    except Exception as e:
        print(f"Error extracting details with Azure OpenAI: {e}")
        return {"error": str(e)}

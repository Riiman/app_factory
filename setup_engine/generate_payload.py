
import sys
import os
import json
from dotenv import load_dotenv

# Ensure setup_engine is in path
sys.path.append(os.getcwd())

from setup_engine.providers.llm_provider import AzureLLMProvider
from setup_engine.utils.prompts import SETUP_GENERATION_PROMPT

def main():
    load_dotenv()
    
    # 1. Initialize LLM
    llm = AzureLLMProvider()
    if not llm.client:
        print("Error: Azure LLM not connected.")
        return

    # 2. Read Inputs
    try:
        with open("transcript.txt", "r") as f:
            transcript = f.read()
            
        with open("startup_evaluation_report.md", "r") as f:
            report = f.read()
    except FileNotFoundError as e:
        print(f"Error reading input files: {e}")
        return

    # 3. Construct Prompt
    final_prompt = f"""
    {SETUP_GENERATION_PROMPT}

    =========================================
    STARTUP EVALUATION REPORT
    =========================================
    {report}
    
    =========================================
    CONVERSATION TRANSCRIPT
    =========================================
    {transcript}
    """

    # 4. Generate JSON
    print("Generating Setup Payload via LLM...")
    response = llm.generate(final_prompt)
    
    # 5. Save Output
    # Extract JSON content if wrapped in markdown code blocks
    if "```json" in response:
        response = response.split("```json")[1].split("```")[0].strip()
    elif "```" in response:
         response = response.split("```")[1].split("```")[0].strip()
         
    try:
        data = json.loads(response)
        with open("generated_setup_payload.json", "w") as f:
            json.dump(data, f, indent=2)
        print("Success: Generated 'generated_setup_payload.json'")
    except json.JSONDecodeError:
        print("Error: Failed to parse LLM output as JSON.")
        print(response)

if __name__ == "__main__":
    main()

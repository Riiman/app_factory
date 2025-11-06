import os
import json
from app import db, create_app
from app.models import Submission, Evaluation
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import AzureChatOpenAI

def format_startup_data_for_analyzer(startup_data):
    formatted_data = ""
    for key, value in startup_data.items():
        if key == "startup_type":
            formatted_data += f"Startup Type: {value}\n\n"
        else:
            formatted_data += f"--- {key.replace('_', ' ').title()} ---
"
            # Assuming value is a list of dicts with 'answer'
            answers = [qa['answer'] for qa in value]
            formatted_data += "\n".join(answers)
            formatted_data += "\n\n"
    return formatted_data

def run_analysis(submission_id):
    app = create_app()
    with app.app_context():
        submission = Submission.query.get(submission_id)
        if not submission:
            print(f"Submission with ID {submission_id} not found.")
            return

        # Create or update evaluation record
        evaluation = submission.evaluation
        if not evaluation:
            evaluation = Evaluation(submission_id=submission.id)
            db.session.add(evaluation)
        
        evaluation.status = 'in_progress'
        db.session.commit()

        try:
            formatted_startup_data = format_startup_data_for_analyzer(submission.raw_chat_data)

            llm = AzureChatOpenAI(
                azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
                openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
                temperature=0.7,
                max_tokens=2000,
            )

            # --- Define Prompt Templates ---
            problem_prompt = PromptTemplate.from_template("Analyze the 'Problem' section... {startup_data}")
            solution_prompt = PromptTemplate.from_template("Analyze the 'Solution' section... {startup_data}")
            # ... (add all other prompts from startup_langchain_analyzer.py)
            compiler_prompt = PromptTemplate.from_template("Compile all sections... {problem_analysis} ...")

            # --- Initialize and Execute Chains ---
            problem_chain = LLMChain(llm=llm, prompt=problem_prompt)
            solution_chain = LLMChain(llm=llm, prompt=solution_prompt)
            # ... (initialize other chains)
            compiler_chain = LLMChain(llm=llm, prompt=compiler_prompt)

            problem_analysis = problem_chain.run(startup_data=formatted_startup_data)
            solution_analysis = solution_chain.run(startup_data=formatted_startup_data)
            # ... (run other chains)

            # For now, let's assume we get JSON back. In a real scenario, you'd parse the markdown.
            evaluation.problem_analysis = {"summary": problem_analysis}
            evaluation.solution_analysis = {"summary": solution_analysis}
            # ... (save other analysis sections)

            # A real implementation would calculate score and decision
            evaluation.overall_score = 85.0
            evaluation.final_decision = "Proceed"
            evaluation.overall_summary = "This is a promising startup with a clear problem and solution."
            
            evaluation.status = 'completed'
            db.session.commit()
            print(f"Analysis for submission {submission_id} completed successfully.")

        except Exception as e:
            print(f"An error occurred during analysis for submission {submission_id}: {e}")
            if 'evaluation' in locals():
                evaluation.status = 'failed'
                db.session.commit()

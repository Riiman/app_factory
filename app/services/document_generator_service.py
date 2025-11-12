import os
from app import db
from app.models import Submission, Evaluation, ScopeDocument
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI

def format_data_for_scope_generator(submission, evaluation):
    """Formats the submission and evaluation data into a readable string for the LLM."""
    formatted_data = f"Startup Name: {submission.startup_name}\n\n"
    formatted_data += """--- Submission Details ---""" + "\n"
    formatted_data += f"Problem Statement: {submission.problem_statement}\n"
    formatted_data += f"Product/Service Idea: {submission.product_service_idea}\n\n"
    
    formatted_data += """--- Evaluation Summary ---""" + "\n"
    formatted_data += f"Overall Summary: {evaluation.overall_summary}\n"
    formatted_data += f"Problem Analysis: {evaluation.problem_analysis['summary']}\n"
    formatted_data += f"Solution Analysis: {evaluation.solution_analysis['summary']}\n"
    formatted_data += f"Market Analysis: {evaluation.market_analysis['summary']}\n"
    
    return formatted_data

def generate_scope_document(submission_id):
    """
    Celery task to generate a scope document for a startup submission using Azure OpenAI.
    """
    print(f"--- [Celery Task] Starting scope document generation for submission ID: {submission_id} ---")
    submission = Submission.query.get(submission_id)
    if not submission or not submission.evaluation:
        print(f"--- [Celery Task] Error: Submission or evaluation not found for ID {submission_id}. ---")
        return

    startup = submission.startup
    if not startup:
        print(f"--- [Celery Task] Error: No startup associated with submission ID {submission_id}. ---")
        return

    formatted_data = format_data_for_scope_generator(submission, submission.evaluation)

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=4000,
    )

    # --- Define Prompt Templates ---
    product_scope_prompt = PromptTemplate.from_template(
        "Based on the following startup information, define a product scope with key features for the MVP. Output in Markdown format, starting with a '## Product Scope' heading.\n\n{data}"
    )
    gtm_strategy_prompt = PromptTemplate.from_template(
        "Based on the following startup information, outline a go-to-market (GTM) strategy. Output in Markdown format, starting with a '## Go-to-Market Strategy' heading.\n\n{data}"
    )

    # --- Define Chains ---
    product_scope_chain = product_scope_prompt | llm
    gtm_strategy_chain = gtm_strategy_prompt | llm

    # --- Execute Chains ---
    product_scope_content = product_scope_chain.invoke({"data": formatted_data}).content
    gtm_strategy_content = gtm_strategy_chain.invoke({"data": formatted_data}).content

    # --- Create and save ScopeDocument ---
    scope_document_content = f"\n\n{product_scope_content}\n\n{gtm_strategy_content}"
    
    scope_document = ScopeDocument(
        startup_id=startup.id,
        title=f"Scope Document for {startup.name}",
        content=scope_document_content
    )
    db.session.add(scope_document)
    db.session.commit()

    print(f"--- [Celery Task] Scope document generated for startup ID: {startup.id} ---")

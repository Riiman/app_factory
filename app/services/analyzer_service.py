import os
import json
from app import db
from app.models import Submission, Evaluation, SubmissionStatus
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from app.services.notification_service import publish_update

def format_startup_data_for_analyzer(startup_data):
    """Formats the raw JSON chat data into a readable string for the LLM."""
    if not startup_data:
        return ""
    formatted_data = ""
    for key, value in startup_data.items():
        if key in ["id", "user_id", "status", "submitted_at", "raw_chat_data", "chat_progress_step", "user", "evaluation", "startup"]:
            continue
        if key == "startup_type":
            formatted_data += f"Startup Type: {value}\n\n"
        else:
            formatted_data += f"--- {key.replace('_', ' ').title()} ---\n"
            if isinstance(value, list) and all('answer' in i for i in value):
                answers = [qa['answer'] for qa in value]
                formatted_data += "\n".join(answers)
            else:
                formatted_data += str(value)
            formatted_data += "\n\n"
    return formatted_data

def run_analysis(submission_id):
    """
    Celery task to run a comprehensive analysis of a startup submission using Azure OpenAI.
    This function fetches the submission, formats the data, and then runs a series of
    chained LLM calls to evaluate different aspects of the startup.
    """
    print(f"--- [Celery Task] Starting analysis for submission ID: {submission_id} ---")
    submission = Submission.query.get(submission_id)
    if not submission:
        print(f"--- [Celery Task] Error: Submission with ID {submission_id} not found. ---")
        return

    evaluation = submission.evaluation
    if not evaluation:
        evaluation = Evaluation(submission_id=submission.id)
        db.session.add(evaluation)
    
    evaluation.status = 'in_progress'
    db.session.commit()
    print(f"--- [Celery Task] Evaluation status set to 'in_progress' for submission ID: {submission_id} ---")

    publish_update("analysis_started", 
                   {
                       "submission_id": submission_id, 
                       "message": "Analysis started."
                   }, 
                   rooms=[f"user_{submission.user_id}", "admin"])

    try:
        formatted_startup_data = format_startup_data_for_analyzer(submission.to_dict())
        print(f"--- [Celery Task] Formatted startup data for submission ID: {submission_id} ---")

        llm = AzureChatOpenAI(
            azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
            openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            temperature=0.7,
            max_tokens=2000,
        )
        print(f"--- [Celery Task] AzureChatOpenAI initialized for submission ID: {submission_id} ---")

        # --- Define Prompt Templates ---
        problem_prompt = PromptTemplate.from_template("Analyze the 'Problem' section... {startup_data}")
        solution_prompt = PromptTemplate.from_template("Analyze the 'Solution' section... {startup_data}")
        market_prompt = PromptTemplate.from_template("Analyze the 'Market Feasibility' section... {startup_data}")
        growth_prompt = PromptTemplate.from_template("Analyze the 'Growth Potential' section... {startup_data}")
        competitor_prompt = PromptTemplate.from_template("Analyze the 'Competitor Analysis' section... {startup_data}")
        risks_prompt = PromptTemplate.from_template("Analyze the 'Advantages & Risks' section... {startup_data}")
        
        print(f"--- [Celery Task] Prompt templates defined for submission ID: {submission_id} ---")

        # --- Define Chains using LangChain Expression Language (LCEL) ---
        problem_chain = problem_prompt | llm
        solution_chain = solution_prompt | llm
        market_chain = market_prompt | llm
        growth_chain = growth_prompt | llm
        competitor_chain = competitor_prompt | llm
        risks_chain = risks_prompt | llm
        print(f"--- [Celery Task] LLM chains initialized for submission ID: {submission_id} ---")

        # --- Execute Chains ---
        problem_analysis_content = problem_chain.invoke({"startup_data": formatted_startup_data}).content
        solution_analysis_content = solution_chain.invoke({"startup_data": formatted_startup_data}).content
        market_analysis_content = market_chain.invoke({"startup_data": formatted_startup_data}).content
        growth_analysis_content = growth_chain.invoke({"startup_data": formatted_startup_data}).content
        competitor_analysis_content = competitor_chain.invoke({"startup_data": formatted_startup_data}).content
        risks_analysis_content = risks_chain.invoke({"startup_data": formatted_startup_data}).content
        print(f"--- [Celery Task] LLM chains executed for submission ID: {submission_id} ---")

        # --- Save analysis to Evaluation record ---
        evaluation.problem_analysis = {"summary": problem_analysis_content}
        evaluation.solution_analysis = {"summary": solution_analysis_content}
        evaluation.market_analysis = {"summary": market_analysis_content}
        evaluation.growth_analysis = {"summary": growth_analysis_content} # FIXED: was growth_potential
        evaluation.competitor_analysis = {"summary": competitor_analysis_content}
        evaluation.risks_analysis = {"summary": risks_analysis_content} # FIXED: was risk_analysis
        
        print(f"--- [Celery Task] Individual analyses completed for submission ID: {submission_id} ---")

        # --- Synthesis & Scoring ---
        synthesis_prompt = PromptTemplate.from_template("""
        You are an expert venture capital analyst. Review the following analysis of a startup:
        
        Problem: {problem}
        Solution: {solution}
        Market: {market}
        Growth: {growth}
        Competitors: {competitors}
        Risks: {risks}
        
        Based on this, provide a JSON output with the following keys:
        - "overall_score": A number between 0 and 100 representing the startup's potential.
        - "final_decision": "Proceed" or "Reject".
        - "overall_summary": A concise executive summary justifying the score and decision.
        
        Ensure the output is valid JSON.
        """)
        
        synthesis_chain = synthesis_prompt | llm
        
        synthesis_input = {
            "problem": problem_analysis_content,
            "solution": solution_analysis_content,
            "market": market_analysis_content,
            "growth": growth_analysis_content,
            "competitors": competitor_analysis_content,
            "risks": risks_analysis_content
        }
        
        synthesis_result_content = synthesis_chain.invoke(synthesis_input).content
        
        # Simple JSON parsing (in production, use a more robust parser or output parser)
        try:
            # removing potential markdown code block format
            clean_json = synthesis_result_content.replace('```json', '').replace('```', '').strip()
            synthesis_data = json.loads(clean_json)
            
            evaluation.overall_score = synthesis_data.get("overall_score", 0)
            evaluation.final_decision = synthesis_data.get("final_decision", "Pending")
            evaluation.overall_summary = synthesis_data.get("overall_summary", "Summary generation failed.")
            
        except json.JSONDecodeError as e:
            print(f"--- [Celery Task] Error parsing synthesis JSON: {e} ---")
            # Fallback
            evaluation.overall_score = 0
            evaluation.final_decision = "Error"
            evaluation.overall_summary = "Failed to parse analysis results."
        finally:
            evaluation.status = 'completed'
            
            # Set submission status to IN_REVIEW now that analysis is complete
            submission.status = SubmissionStatus.IN_REVIEW

            db.session.commit()
            
            publish_update("analysis_completed", 
                        {
                            "submission_id": submission_id, 
                            "evaluation": evaluation.to_dict(),
                            "submission_status": submission.status.value,
                            "status": "success",
                            "message": "Analysis completed successfully!"
                        }, 
                        rooms=[f"user_{submission.user_id}", "admin"])
            
            print(f"--- [Celery Task] Analysis for submission {submission_id} completed successfully. ---")

    except Exception as e:
        print(f"--- [Celery Task] An error occurred during analysis for submission {submission_id}: {e} ---")
        if 'evaluation' in locals():
            evaluation.status = 'failed'
            db.session.commit()
            publish_update("analysis_failed", 
                           {
                               "submission_id": submission_id, 
                               "error": str(e),
                               "status": "error",
                               "message": "Analysis failed."
                           }, 
                           rooms=[f"user_{submission.user_id}", "admin"])
import os
import json
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import AzureChatOpenAI
from app.models import Submission

load_dotenv()

class EvaluationService:
    def __init__(self):
        self.llm = AzureChatOpenAI(
            azure_deployment=os.environ.get("DEPLOYMENT_NAME"),
            api_version=os.environ.get("AZURE_API_VERSION"),
            openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            temperature=0.7,
            max_tokens=2000,
        )
        self._initialize_chains()

    def _initialize_chains(self):
        problem_prompt = PromptTemplate.from_template("Analyze the core problem: {startup_data}")
        solution_prompt = PromptTemplate.from_template("Analyze the proposed solution: {startup_data}")
        market_prompt = PromptTemplate.from_template("Analyze the market feasibility: {startup_data}")
        growth_prompt = PromptTemplate.from_template("Analyze the growth potential: {startup_data}")
        competitor_prompt = PromptTemplate.from_template("Analyze the competitive landscape: {startup_data}")
        risks_prompt = PromptTemplate.from_template("Analyze the advantages and risks: {startup_data}")

        self.problem_chain = LLMChain(llm=self.llm, prompt=problem_prompt)
        self.solution_chain = LLMChain(llm=self.llm, prompt=solution_prompt)
        self.market_chain = LLMChain(llm=self.llm, prompt=market_prompt)
        self.growth_chain = LLMChain(llm=self.llm, prompt=growth_prompt)
        self.competitor_chain = LLMChain(llm=self.llm, prompt=competitor_prompt)
        self.risks_chain = LLMChain(llm=self.llm, prompt=risks_prompt)

    def _format_submission_data(self, submission: Submission) -> str:
        data = submission.to_dict()
        formatted_data = ""
        for key, value in data.items():
            if value:
                formatted_data += f"--- {key.replace('_', ' ').title()} ---\n{value}\n\n"
        return formatted_data

    def analyze_submission(self, submission: Submission) -> dict:
        formatted_data = self._format_submission_data(submission)

        # For simplicity, we'll run these synchronously.
        # In a production app, this should be a background task.
        problem_analysis = self.problem_chain.run(startup_data=formatted_data)
        solution_analysis = self.solution_chain.run(startup_data=formatted_data)
        market_analysis = self.market_chain.run(startup_data=formatted_data)
        growth_analysis = self.growth_chain.run(startup_data=formatted_data)
        competitor_analysis = self.competitor_chain.run(startup_data=formatted_data)
        risks_analysis = self.risks_chain.run(startup_data=formatted_data)

        # Placeholder for overall score and decision logic
        # This would typically involve parsing the analysis results
        overall_score = 7.5 
        final_decision = "Needs Refinement"
        overall_summary = "A promising idea with a clear problem, but the market analysis needs more depth."

        return {
            "problem_analysis": {"summary": problem_analysis},
            "solution_analysis": {"summary": solution_analysis},
            "market_analysis": {"summary": market_analysis},
            "growth_analysis": {"summary": growth_analysis},
            "competitor_analysis": {"summary": competitor_analysis},
            "risks_analysis": {"summary": risks_analysis},
            "overall_score": overall_score,
            "final_decision": final_decision,
            "overall_summary": overall_summary,
        }

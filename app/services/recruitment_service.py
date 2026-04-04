
import os
import json
import logging
from datetime import datetime
from pypdf import PdfReader
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from app.models import Job, Candidate, Application
from app.extensions import db

# Configure logging
logger = logging.getLogger(__name__)

class RecruitmentService:
    def __init__(self):
        self._init_llm()

    def _init_llm(self):
        try:
            self.llm = AzureChatOpenAI(
                azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
                openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
                temperature=0.7,
                max_tokens=2000,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            self.llm = None

    def extract_text_from_pdf(self, file_path):
        """Extracts text from a locally saved PDF file."""
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return None

    def parse_resume(self, resume_text):
        """
        Uses AI to extract structured data from resume text.
        Returns a dict with name, email, phone, skills, experience.
        """
        if not self.llm:
            return None

        prompt = PromptTemplate.from_template(
            "You are an expert Resume Parser. Extract structured data from the following Resume text.\n"
            "--- Resume Text ---\n{resume_text}\n-------------------\n\n"
            "Output a JSON object with the following keys:\n"
            "- 'name': string (Full Name)\n"
            "- 'email': string\n"
            "- 'phone': string\n"
            "- 'skills': list of strings (Top 5 most relevant technical skills)\n"
            "- 'experience_years': integer (Total years of professional experience, estimate if needed)\n"
            "- 'current_role': string (Most recent job title)\n"
            "- 'current_company': string (Most recent company name)\n"
            "- 'location': string (City/Country if mentioned)\n"
            "- 'education': string (Highest degree and university)\n"
            "- 'summary': string (One-sentence professional summary)\n"
        )

        try:
            chain = prompt | self.llm
            result = chain.invoke({"resume_text": resume_text[:10000]}).content # Limit text size
            return json.loads(result)
        except Exception as e:
            logger.error(f"Error parsing resume with AI: {e}")
            return None

    def score_candidate(self, job_description, resume_text):
        """
        Compares a candidate's resume against a job description.
        Returns a dict with score (0-100) and analysis.
        """
        if not self.llm:
            return {"score": 0, "analysis": {"summary": "AI Service Unavailable"}}

        prompt = PromptTemplate.from_template(
            "You are a Senior Technical Recruiter. Evaluate this candidate for the given Job Description.\n\n"
            "--- Job Description ---\n{job_desc}\n\n"
            "--- Candidate Resume ---\n{resume_text}\n\n"
            "Task:\n"
            "1. Assign a 'match_score' from 0-100 based on skills, experience, and requirements.\n"
            "   - 90-100: Perfect match (Skills + Exp + Domain)\n"
            "   - 75-89: Good match (Missing minor skills)\n"
            "   - <60: Poor match\n"
            "2. Provide a 'pros' list (Why they match).\n"
            "3. Provide a 'cons' list (Missing skills/red flags).\n"
            "4. Suggest 3 'interview_questions' to probe weak areas.\n\n"
            "Output JSON keys: 'match_score' (int), 'pros' (list), 'cons' (list), 'interview_questions' (list), 'summary' (string)."
        )

        try:
            chain = prompt | self.llm
            # Truncate inputs to fit context window
            result = chain.invoke({
                "job_desc": job_description[:2000],
                "resume_text": resume_text[:6000]
            }).content
            
            data = json.loads(result)
            return {
                "score": data.get("match_score", 0),
                "analysis": data
            }
        except Exception as e:
            logger.error(f"Error scoring candidate: {e}")
            return {"score": 0, "analysis": {"summary": "Error during AI analysis"}}

    def generate_job_description(self, title, keywords, startup_context=""):
        """
        Generates a rich job description based on title and keywords.
        """
        if not self.llm:
            return None

        prompt = PromptTemplate.from_template(
            "Write a compelling Job Description for a {title} role at a startup.\n"
            "Context: {startup_context}\n"
            "Keywords/Tech Stack: {keywords}\n\n"
            "Structure:\n"
            "1. About the Role (Exciting hook)\n"
            "2. Responsibilities (Bullet points)\n"
            "3. Requirements (Bullet points - make sure to include the keywords)\n"
            "4. Why Join Us\n\n"
            "Output a JSON object with key 'description_html' containing the HTML formatted string (use <h3>, <ul>, <li>)."
        )

        try:
            chain = prompt | self.llm
            result = chain.invoke({
                "title": title,
                "keywords": keywords,
                "startup_context": startup_context
            }).content
            data = json.loads(result)
            return data.get("description_html")
        except Exception as e:
            logger.error(f"Error generating JD: {e}")
            return None

recruitment_service = RecruitmentService()

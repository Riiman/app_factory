import json
import os
import random
from datetime import datetime, timedelta
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import PromptTemplate

class LlmCompanySimulator:
    """
    Advanced simulation engine using LLM to generate a realistic 
    12-month startup story and a structured data set (JSON).
    """

    def __init__(self, industry="Manufacturing", maturity_years=1):
        self.industry = industry
        self.maturity_years = maturity_years
        self.llm = AzureChatOpenAI(
            azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
            openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            temperature=0.7,
            max_tokens=4000,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

    def generate_full_simulation(self):
        """Orchestrates the multi-step generation process."""
        print(f"--- [LLM Simulation] Starting Phase 1: Identity & Roadmap for {self.industry} ---")
        roadmap = self._generate_identity_and_roadmap()
        
        print(f"--- [LLM Simulation] Starting Phase 2: Monthly Data Expansion ---")
        full_story = self._generate_monthly_details(roadmap)
        
        return full_story

    def _generate_identity_and_roadmap(self):
        """Step 1: Generate Company Name, Tagline, and 12-month Milestone Roadmap."""
        now = datetime.now()
        end_month = now.strftime("%B %Y")
        start_month = (now - timedelta(days=335)).strftime("%B %Y") # approx 11 months ago

        prompt = PromptTemplate.from_template(
            "Generate a realistic company identity and a 12-month milestone roadmap for a {maturity_years}-year-old {industry} startup. \n"
            f"The roadmap should cover exactly 12 months ending in {end_month} (spanning from {start_month} to {end_month}).\n"
            "Each month MUST have a specific milestone (e.g., 'Product Launch', 'Major B2B Win').\n"
            "CRITICAL: A startup can have at most ONE investment round (Seed or Series A) in a 12-month period. Do not generate multiple funding milestones.\n"
            "Output JSON with keys:\n"
            "- 'company_name': String\n"
            "- 'tagline': String\n"
            "- 'description': Short background of the company\n"
            "- 'roadmap': Array of 12 objects, each with 'month_name', 'year', 'milestone_title', 'narrative_description'.\n"
            "Ensure the events are logical and tell a consistent story of growth or challenges."
        )
        chain = prompt | self.llm
        result = chain.invoke({"industry": self.industry, "maturity_years": self.maturity_years}).content
        return json.loads(result)

    def _generate_monthly_details(self, roadmap_data):
        """Step 2: Take the roadmap and generate concrete data points for each month."""
        company_context = {
            "name": roadmap_data["company_name"],
            "description": roadmap_data["description"]
        }
        
        simulation_data = {
            "metadata": roadmap_data,
            "monthly_data": []
        }
        
        # Initialize running state to track causal progress
        running_state = {
            "cash_balance": 150000.0,
            "total_customers": 0,
            "mrr": 0.0,
            "headcount": 5,
            "prev_month_summary": "Initial setup and MVP development."
        }
        
        for month in roadmap_data["roadmap"]:
            print(f"Generating details for: {month['month_name']} {month['year']}...")
            
            month_details = self._get_details_for_month(company_context, month, running_state)
            simulation_data["monthly_data"].append(month_details)
            
            # Update running state for the NEXT month's context
            financials = month_details.get("financials", {})
            revenue = financials.get("revenue", 0)
            expenses = financials.get("expenses", 0)
            burn = expenses - revenue
            
            investment = 0
            if "investment" in month_details and month_details["investment"]:
                investment = month_details["investment"].get("amount", 0)
                
            running_state["cash_balance"] += (investment - burn)
            running_state["total_customers"] = financials.get("total_customers", 0)
            running_state["mrr"] = financials.get("mrr", 0)
            
            # Update narrative summary for the next month
            running_state["prev_month_summary"] = f"Finished '{month['milestone_title']}'."
            if investment > 0:
                running_state["prev_month_summary"] += f" Raised ${investment:,.0f} in funding."
            
        return simulation_data

    def _get_details_for_month(self, company_context, month_roadmap, previous_state):
        """Uses LLM to generate specific metrics, tasks, and causal logic for a month."""
        prompt = PromptTemplate.from_template(
            "Given a startup named '{company_name}' ({company_description}) and its 12-month roadmap, generate data for {month_name} {year}. \n\n"
            "CURRENT STATE (End of previous month):\n"
            "- Cash in Bank: ${cash_balance:,.0f}\n"
            "- Total Customers: {total_customers}\n"
            "- MRR: ${mrr:,.0f}\n"
            "- Previous Month Summary: {prev_month_summary}\n\n"
            "THIS MONTH'S MILESTONE: '{milestone_title}' - {narrative_description}\n\n"
            "CAUSAL REALISM RULES:\n"
            "1. If an investment just happened, you MUST significantly increase 'expenses' next month to reflect hiring or increased marketing.\n"
            "2. Ensure 'revenue' and 'total_customers' grow logically based on 'marketing_campaigns' and 'milestone' outcomes.\n"
            "3. If cash is low, show reactive tasks (e.g., 'Cost cutting', 'Fundraising').\n"
            "4. TARGET 2-YEAR SPEND: Aim to deploy the majority of any new investment within 24 months. For example, if you raise $1.2M, the monthly burn should increase by ~$50k/month over the next year.\n"
            "5. REVENUE ROI: Increased operational spend (marketing/sales/hiring) MUST result in revenue or MRR growth within the following 2-3 months. There is no point in spending without growth.\n\n"
            "Generate JSON:\n"
            "1. 'financials': {{'revenue': float, 'expenses': float, 'mrr': float, 'new_customers': int, 'total_customers': int}}\n"
            "2. 'crm_deals': Array of 1-3 deals. Each: {{'name': string, 'amount': float, 'stage': 'OPEN'|'WON'|'LOST', 'notes': string}}\n"
            "3. 'tasks': Array of 2-4 tasks. Each: {{'name': string, 'description': string, 'status': 'PENDING'|'IN_PROGRESS'|'COMPLETED'}}\n"
            "4. 'features': Array of 2-3 features. Each: {{'name': string, 'description': string, 'status': 'DONE'|'BACKLOG'|'IN_PROGRESS'}}\n"
            "5. 'experiments': Array of 1-2 growth tests. Each: {{'name': string, 'hypothesis': string, 'result': 'Validated'|'Invalidated'|'Pending'}}\n"
            "6. 'marketing_campaigns': Array of 1-2 campaigns. Each: {{'name': string, 'channel': string, 'spend': number, 'conversions': number, 'impressions': int, 'clicks': int}}\n"
            "7. 'product_metrics': Array of 2-3 KPIs. Each: {{'name': string, 'value': float, 'unit': string}}\n"
            "8. 'investment': (Optional, ONLY if roadmap milestone is a Funding Round): {{'round_name': string, 'amount': number, 'status': 'CLOSED', 'investors': [{{'name': string, 'firm': string, 'amount': number}}]}}\n\n"
            "Ensure financial numbers are realistic for a {maturity_years}-year-old {industry} startup."
        )
        chain = prompt | self.llm
        result = chain.invoke({
            "company_name": company_context["name"],
            "company_description": company_context["description"],
            "month_name": month_roadmap["month_name"],
            "year": month_roadmap["year"],
            "milestone_title": month_roadmap["milestone_title"],
            "narrative_description": month_roadmap["narrative_description"],
            "maturity_years": self.maturity_years,
            "industry": self.industry,
            "cash_balance": previous_state["cash_balance"],
            "total_customers": previous_state["total_customers"],
            "mrr": previous_state["mrr"],
            "prev_month_summary": previous_state["prev_month_summary"]
        }).content
        
        data = json.loads(result)
        data["month"] = month_roadmap["month_name"]
        data["year"] = month_roadmap["year"]
        data["milestone"] = month_roadmap["milestone_title"]
        return data

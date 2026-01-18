
from datetime import datetime
from typing import List, Optional
from langchain_openai import AzureChatOpenAI
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.models import BusinessMonthlyData, Product, ProductMetric, MarketingCampaign, Startup
from app import db
from sqlalchemy import func
import os
import json
from dotenv import load_dotenv

load_dotenv()

class AIAssistantService:
    def __init__(self):
        self.llm = AzureChatOpenAI(
            azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
            openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            temperature=0.0,
        )

    def process_query(self, user_id: int, startup_id: int, query: str, history: List[dict] = []) -> str:
        """
        Process a natural language query using the AI assistant.
        """
        
        tools = [
            self.create_financial_tool(startup_id),
            self.create_product_tool(startup_id),
            self.create_marketing_tool(startup_id)
        ]

        system_prompt = (
            "You are a helpful data assistant for a startup founder. "
            "You have access to the startup's financial, product, and marketing data. "
            "Use the provided tools to answer the user's questions based on real data. "
            "If you cannot find the answer in the data, state that clearly. "
            "Format your response in a clear, readable manner (using markdown if needed for tables or lists)."
        )

        # Convert history
        messages = []
        for msg in history:
            role = msg.get("role")
            content = msg.get("content")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
        
        messages.append(HumanMessage(content=query))

        agent = create_agent(self.llm, tools, system_prompt=system_prompt)
        
        try:
            result = agent.invoke({"messages": messages})
            # content is in the last message of the returned state
            return result["messages"][-1].content
        except Exception as e:
            print(f"Error executing AI agent: {e}")
            return "I apologize, but I encountered an error while trying to fetch that information. Please try again later."

    def create_financial_tool(self, startup_id: int):
        @tool
        def get_financial_data(period: str = "last_quarter") -> str:
            """
            Fetches financial data for the startup.
            'period' can be 'last_month', 'last_quarter', 'last_year', or 'all_time'.
            Returns data like Revenue, Expenses, Net Burn, Cash in Bank, MRR.
            """
            query = BusinessMonthlyData.query.filter_by(startup_id=startup_id).order_by(BusinessMonthlyData.month_start.desc())
            
            data = query.all()
            if not data:
                return "No financial data found."

            # Simple filtering logic (in production this would be more robust dates)
            results = []
            for record in data[:6]: # Just return last 6 months for context
                results.append({
                    "month": record.month_start.isoformat(),
                    "revenue": float(record.total_revenue) if record.total_revenue else 0,
                    "expenses": float(record.total_expenses) if record.total_expenses else 0,
                    "net_burn": float(record.net_burn) if record.net_burn else 0,
                    "cash_in_bank": float(record.cash_in_bank) if record.cash_in_bank else 0,
                    "mrr": float(record.mrr) if record.mrr else 0,
                })
            
            return json.dumps(results, indent=2)
        return get_financial_data

    def create_product_tool(self, startup_id: int):
        @tool
        def get_product_performance() -> str:
            """
            Fetches performance metrics for all products.
            Returns product names, stages, and their associated metrics (e.g., users, retention).
            """
            products = Product.query.filter_by(startup_id=startup_id).all()
            if not products:
                return "No products found."

            results = []
            for p in products:
                metrics = ProductMetric.query.filter_by(product_id=p.id).all()
                metric_data = [{m.metric_name: float(m.value) if m.value else 0} for m in metrics]
                results.append({
                    "product_name": p.name,
                    "stage": p.stage.value if p.stage else "Unknown",
                    "metrics": metric_data
                })
            
            return json.dumps(results, indent=2)
        return get_product_performance

    def create_marketing_tool(self, startup_id: int):
        @tool
        def get_marketing_campaigns() -> str:
            """
            Fetches data on marketing campaigns.
            Returns campaign names, spend, impressions, clicks, conversions, and status.
            """
            campaigns = MarketingCampaign.query.filter_by(startup_id=startup_id).all()
            if not campaigns:
                return "No marketing campaigns found."

            results = []
            for c in campaigns:
                results.append({
                    "campaign": c.campaign_name,
                    "status": c.status.value if c.status else "Unknown",
                    "spend": float(c.spend) if c.spend else 0,
                    "impressions": c.impressions,
                    "clicks": c.clicks,
                    "conversions": c.conversions
                })
            
            return json.dumps(results, indent=2)
        return get_marketing_campaigns

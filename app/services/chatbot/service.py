
from datetime import datetime
from typing import List, Optional
from langchain_openai import AzureChatOpenAI
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.models import (
    BusinessMonthlyData, Product, ProductMetric, MarketingCampaign, Startup,
    TeamMember, Founder, FundingRound, Investor, CapTableEntry, Artifact,
    ScopeDocument, Contract, Task, BusinessOverview, Submission,
    ScopeDocument, Contract, Task, BusinessOverview, Submission,
    JournalEntry, JournalLine, Account, AccountType, BusinessModel, ProductMetric,
    StartupSnapshot
)
from app import db
from sqlalchemy import func
from app.services import business_analytics_service, executive_analytics_service
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
            self.create_marketing_tool(startup_id),
            self.create_team_tool(startup_id),
            self.create_fundraising_tool(startup_id),
            self.create_documents_tool(startup_id),
            self.create_tasks_tool(startup_id),
            self.create_business_overview_tool(startup_id),
            self.create_executive_summary_tool(startup_id),
            self.create_insights_tool(startup_id),
            self.create_data_ontology_tool(startup_id),
            self.create_knowledge_graph_tool(startup_id)
        ]

        current_date_str = datetime.now().strftime("%Y-%m-%d")
        system_prompt = (
            f"You are a highly sophisticated data assistant for a startup founder. Today is {current_date_str}. "
            "You have access to the startup's financial, product, marketing, and CRM data. "
            "You also have a 'Knowledge Graph' of the entire system (`models.py`) and a 'Data Ontology' for causal reasoning. "
            "Use the provided tools to answer the user's questions based on real data. "
            "For complex queries about business impact (e.g., 'How does marketing affect my valuation?'), "
            "use the 'get_knowledge_graph' to understand the structural links (e.g. Marketing -> Sales -> Revenue -> Valuation) "
            "and 'get_data_ontology' for causal directions (e.g. Higher Win Rate -> Higher Revenue). "
            "Always perform multi-step investigations for 'why' questions. "
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

            # Calculate current month-to-date revenue from Journal Entries
            current_month_start = datetime.now().replace(day=1)
            mtd_revenue = 0.0
            
            # Find all income accounts
            income_accounts = Account.query.filter_by(startup_id=startup_id, type=AccountType.INCOME).all()
            income_account_ids = [a.id for a in income_accounts]
            
            if income_account_ids:
                # Query journal lines for these accounts in the current month
                revenue_lines = db.session.query(func.sum(JournalLine.credit - JournalLine.debit)).join(JournalEntry).filter(
                    JournalEntry.startup_id == startup_id,
                    JournalEntry.date >= current_month_start,
                    JournalLine.account_id.in_(income_account_ids)
                ).scalar()
                
                if revenue_lines:
                    mtd_revenue = float(revenue_lines)

            # Simple filtering logic (in production this would be more robust dates)
            results = {
                "current_mtd_revenue": mtd_revenue,
                "current_month": current_month_start.strftime("%B %Y"),
                "historical_monthly_data": []
            }

            for record in data[:6]: # Just return last 6 months for context
                results["historical_monthly_data"].append({
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

    def create_team_tool(self, startup_id: int):
        @tool
        def get_team_info() -> str:
            """
            Fetches information about the startup's team and founders.
            Returns names, roles, bios, and specific responsibilities.
            """
            founders = Founder.query.filter_by(startup_id=startup_id).all()
            team_members = TeamMember.query.filter_by(startup_id=startup_id).all()
            
            results = {
                "founders": [],
                "team_members": []
            }
            
            for f in founders:
                results["founders"].append({
                    "name": f.name,
                    "role": f.role,
                    "bio": f.bio,
                    "linkedin": f.linkedin_profile
                })
                
            for m in team_members:
                # Need to fetch the User object to get the name for team members
                from app.models import User # delayed import to avoid circular dependency if any
                user = User.query.get(m.user_id)
                if user:
                    results["team_members"].append({
                        "name": user.name,
                        "role": m.role,
                        "scope": m.scope
                    })
            
            if not results["founders"] and not results["team_members"]:
                return "No team information found."
                
            return json.dumps(results, indent=2)
        return get_team_info

    def create_fundraising_tool(self, startup_id: int):
        @tool
        def get_fundraising_info() -> str:
            """
            Fetches fundraising data including funding rounds, investors, and cap table summary.
            Returns details on raised amounts, valuations, and investor lists.
            """
            rounds = FundingRound.query.filter_by(startup_id=startup_id).all()
            investors = Investor.query.filter_by(startup_id=startup_id).all()
            cap_table_entries = CapTableEntry.query.filter_by(startup_id=startup_id).all()
            
            results = {
                "funding_rounds": [],
                "investors": [],
                "cap_table_summary": []
            }
            
            for r in rounds:
                results["funding_rounds"].append({
                    "name": r.round_type,
                    "date": r.date_closed.isoformat() if r.date_closed else None,
                    "amount_raised": float(r.amount_raised) if r.amount_raised else 0,
                    "pre_money_valuation": float(r.valuation_pre) if r.valuation_pre else 0
                })
                
            for i in investors:
                results["investors"].append({
                    "name": i.name,
                    "type": i.type,
                    "stage": str(i.stage) if i.stage else None,
                    "check_size_interest": i.check_size_interest
                })
                
            for c in cap_table_entries:
                 results["cap_table_summary"].append({
                     "shareholder": c.stakeholder_name,
                     "shares": c.shares,
                     "stakeholder_type": str(c.stakeholder_type) if c.stakeholder_type else None
                 })
                 
            return json.dumps(results, indent=2)
        return get_fundraising_info

    def create_documents_tool(self, startup_id: int):
        @tool
        def get_documents_status() -> str:
            """
            Fetches the status of key documents like Scope and Contract, and lists other artifacts.
            """
            scope_doc = ScopeDocument.query.filter_by(startup_id=startup_id).first()
            contract = Contract.query.filter_by(startup_id=startup_id).first()
            artifacts = Artifact.query.filter_by(startup_id=startup_id).all()
            
            results = {
                "scope_document": {
                    "status": scope_doc.status if scope_doc else "Not Started",
                    "admin_accepted": scope_doc.admin_accepted if scope_doc else False,
                    "founder_accepted": scope_doc.founder_accepted if scope_doc else False
                },
                "contract": {
                    "status": contract.status.value if contract and contract.status else "Not Started",
                    "admin_accepted": contract.admin_accepted if contract else False,
                    "founder_accepted": contract.founder_accepted if contract else False
                },
                "artifacts": []
            }
            
            for a in artifacts:
                results["artifacts"].append({
                    "name": a.name,
                    "type": a.type.value if a.type else "Unknown",
                    "description": a.description
                })
                
            return json.dumps(results, indent=2)
        return get_documents_status

    def create_tasks_tool(self, startup_id: int):
        @tool
        def get_tasks_list() -> str:
            """
            Fetches the list of tasks for the startup.
            Returns task titles, statuses, due dates, and assignees.
            """
            tasks = Task.query.filter_by(startup_id=startup_id).all()
            
            if not tasks:
                return "No tasks found."
                
            results = []
            for t in tasks:
                assignee_name = "Unassigned"
                if t.assignee_id:
                    from app.models import User
                    user = User.query.get(t.assignee_id)
                    if user:
                        assignee_name = user.name

                results.append({
                    "title": t.title,
                    "status": t.status.value if t.status else "Unknown",
                    "priority": t.priority,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "assignee": assignee_name
                })
            
            return json.dumps(results, indent=2)
        return get_tasks_list

    def create_business_overview_tool(self, startup_id: int):
        @tool
        def get_business_context() -> str:
            """
            Fetches the high-level business overview and core submission details.
            Returns problem statement, solution, market size, and business model type.
            """
            overview = BusinessOverview.query.filter_by(startup_id=startup_id).first()
            # Assuming submission is linked to user who owns the startup, but we have startup_id.
            # We can find submission by startup_id roughly if we assume 1:1 or use startup.user_id
            
            startup = Startup.query.get(startup_id)
            submission = Submission.query.filter_by(user_id=startup.user_id).first()
            
            results = {
                "overview": {
                    "business_model": overview.business_model if overview else None,
                    "key_partners": overview.key_partners if overview else None,
                    "notes": overview.notes if overview else None
                },
                "business_models": [],
                "core_details": {}
            }
            
            # Fetch detailed business models with enriched metrics from analytics service
            enriched_models = business_analytics_service.get_enriched_business_models(startup_id)
            for bm in enriched_models:
                # model_type might be an Enum or string depending on service return
                m_type = bm.get('model_type')
                
                results["business_models"].append({
                    "name": bm.get('name'),
                    "type": str(m_type) if m_type else "Unknown",
                    "description": bm.get('description'),
                    # Target Metrics
                    "target_arpu": bm.get('target_arpu'),
                    "target_cac": bm.get('target_cac'),
                    "target_margin": bm.get('target_margin'),
                    # Actual Performance Metrics (from business_analytics_service)
                    "actual_arpu": bm.get('actual_arpu'),
                    "actual_revenue": bm.get('actual_revenue'),
                    "actual_margin": bm.get('actual_margin'),
                    "transaction_count": bm.get('transaction_count'),
                    "actual_quantity": bm.get('actual_quantity')
                })
            
            if submission:
                results["core_details"] = {
                    "problem": getattr(submission, 'problem_statement', "N/A"),
                    "solution": getattr(submission, 'product_service_idea', "N/A"),
                    "target_market": getattr(submission, 'intended_users_customers', "N/A")
                }
                
            return json.dumps(results, indent=2)
        return get_business_context

    def create_executive_summary_tool(self, startup_id: int):
        @tool
        def get_executive_summary() -> str:
            """
            Fetches a comprehensive executive summary for the startup.
            Returns financial health (revenue, burn, runway), growth metrics (MRR, customer growth), 
            module health status, critical alerts, and recent wins.
            """
            try:
                summary = executive_analytics_service.calculate_executive_summary(startup_id)
                return json.dumps(summary, indent=2)
            except Exception as e:
                return f"Error calculating executive summary: {str(e)}"
        return get_executive_summary

    def create_insights_tool(self, startup_id: int):
        @tool
        def get_startup_insights() -> str:
            """
            Fetches the latest AI-generated health scores and insights for the startup.
            Returns scores for founder maturity, product readiness, market fit, and detailed insight payloads.
            """
            latest_snapshot = StartupSnapshot.query.filter_by(startup_id=startup_id).order_by(StartupSnapshot.date.desc()).first()
            if not latest_snapshot:
                return "No insight snapshots available for this startup yet."
            
            return json.dumps(latest_snapshot.to_dict(), indent=2)
        return get_startup_insights

    def create_data_ontology_tool(self, startup_id: int):
        @tool
        def get_data_ontology() -> str:
            """
            Fetches the Data Ontology map which explains the relationships between metrics.
            Explains which drivers (e.g. CAC, Win Rate) impact which outcome metrics (e.g. Runway, Revenue).
            Use this for root-cause analysis and strategic advice.
            """
            ontology = {
                "financial_drivers": {
                    "Runway": {"drivers": ["Net Burn", "Cash Balance"], "logic": "Cash / Burn"},
                    "Net Burn": {"drivers": ["OpEx", "Revenue"], "logic": "Expenses - Revenue"},
                    "Gross Margin": {"drivers": ["Unit Cost", "Price"], "logic": "(Price - Cost) / Price"}
                },
                "growth_drivers": {
                    "Revenue": {"drivers": ["New Customers", "ARPU"], "logic": "Customers * Price"},
                    "New Customers": {"drivers": ["Leads", "Conversion Rate"], "logic": "Leads * Rate"},
                    "CAC": {"drivers": ["Marketing Spend", "New Customers"], "logic": "Spend / Customers"},
                    "LTV": {"drivers": ["ARPU", "Churn Rate"], "logic": "(ARPU * 12) / Churn"}
                },
                "causal_links": [
                    {"source": "Product Readiness", "target": "Conversion Rate", "impact": "Positive"},
                    {"source": "CAC", "target": "Runway", "impact": "Negative"},
                    {"source": "Retention", "target": "LTV", "impact": "Positive"},
                    {"source": "Sales Win Rate", "target": "Revenue", "impact": "Positive"}
                ],
                "analysis_patterns": {
                    "runway_drop": ["Check Net Burn", "Check Revenue vs OpEx", "Check CAC efficiency"],
                    "revenue_flat": ["Check Leads", "Check Win Rate", "Check ARPU trends"]
                }
            }
            return json.dumps(ontology, indent=2)
        return get_data_ontology

    def create_knowledge_graph_tool(self, startup_id: int):
        @tool
        def get_knowledge_graph() -> str:
            """
            Fetches a comprehensive knowledge graph of the entire data ecosystem (models.py).
            Shows how Marketing, Sales, Product, Finance, and Valuation segments are linked.
            Use this for 'Big Picture' analysis and cross-domain reasoning.
            """
            graph = {
                "segments": {
                    "Marketing": ["MarketingOverview", "MarketingCampaign", "MarketingContentCalendar", "MarketingContentItem"],
                    "Sales (CRM)": ["CrmCompany", "CrmContact", "CrmDeal", "CrmInteraction"],
                    "Finance": ["JournalEntry", "JournalLine", "Account", "BusinessMonthlyData", "BusinessModel"],
                    "Product": ["Product", "Feature", "Sprint", "Release", "ProductMetric"],
                    "Valuation": ["FundingRound", "RoundInvestor", "GlobalInvestor"]
                },
                "key_linkages": [
                    {"from": "MarketingCampaign", "to": "CrmContact/Lead", "type": "Generation"},
                    {"from": "CrmDeal (Won)", "to": "JournalLine (Revenue)", "type": "Conversion"},
                    {"from": "JournalLine", "to": "BusinessMonthlyData", "type": "Aggregation"},
                    {"from": "BusinessMonthlyData", "to": "FundingRound (Valuation)", "type": "Influence"},
                    {"from": "Feature (Done)", "to": "ProductMetric (Adoption)", "type": "Impact"}
                ],
                "system_nodes": {
                    "Startup": "Central hub connecting all segments.",
                    "StartupSnapshot": "Aggregated insight node summarizing all data points."
                }
            }
            return json.dumps(graph, indent=2)
        return get_knowledge_graph

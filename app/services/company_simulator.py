import random
from datetime import datetime, timedelta
from decimal import Decimal
from app.extensions import db
from app.models import (
    Startup, Product, BusinessMonthlyData, ProductMetric, 
    MarketingCampaign, Task, Experiment, Investor, FundingRound,
    User, Scope, TaskStatus, ExperimentStatus, ProductStage
)
from app.modules.crm.models import (
    CrmCompany, CrmContact, CrmDeal, CrmInteraction, 
    CrmLifecycleStage, CrmLeadStatus, CrmDealStage, InteractionType
)

class BaseSimulator:
    """Base class for all company simulators."""
    def __init__(self, startup_id, user_id):
        self.startup_id = startup_id
        self.user_id = user_id
        self.now = datetime.utcnow()

    def generate_all(self):
        raise NotImplementedError("Subclasses must implement generate_all()")

class EvolutionarySimulator(BaseSimulator):
    """
    Models a 12-month startup journey with realistic events, 
    product launches, and financial growth.
    """
    
    def __init__(self, startup_id, user_id, industry="Manufacturing", age_years=1):
        super().__init__(startup_id, user_id)
        self.industry = industry
        self.age_years = age_years
        
        # Initial State
        self.state = {
            "revenue": Decimal("50000") if age_years == 1 else Decimal("250000"),
            "customers": 10 if age_years == 1 else 60,
            "products": [],
            "crm_companies": [],
            "mrr_ratio": Decimal("0.3") if industry == "Manufacturing" else Decimal("0.8")
        }

    def generate_all(self, start_month=4, start_year=2024):
        """Orchestrates the 12-month simulation journey."""
        print(f"Starting evolutionary simulation for {self.industry} startup (Age: {self.age_years}yr)")
        
        start_date = datetime(start_year, start_month, 1)
        
        for month_idx in range(12):
            current_date = start_date + timedelta(days=31 * month_idx)
            current_date = current_date.replace(day=1)
            
            self._simulate_month(current_date, month_idx + 1)
            
        db.session.commit()
        print(f"Simulation completed for Startup ID: {self.startup_id}")

    def _simulate_month(self, date, month_num):
        """Simulates events and data for a specific month in the sequence."""
        
        # 1. Monthly Milestones (The "Story")
        if month_num == 1:
            self._milestone_setup_initial_products()
        elif month_num == 3:
            self._milestone_funding_round(date, "Seed" if self.age_years == 1 else "Series A")
        elif month_num == 6:
            self._milestone_marketing_push(date)
        elif month_num == 9:
            self._milestone_launch_new_product(date)
        elif month_num == 12:
            self._milestone_annual_review(date)
            
        # 2. Continuous Data Generation
        self._generate_monthly_financials(date)
        self._generate_crm_activity(date)
        self._generate_operational_tasks(date, month_num)
        
        # 3. Product Metrics (if products exist)
        for prod in self.state["products"]:
            self._generate_product_metrics(prod, date)

    # --- Milestones ---

    def _milestone_setup_initial_products(self):
        """Month 1: Initialize baseline products."""
        p1 = Product(
            startup_id=self.startup_id,
            name=f"Industrial {self.industry} Unit v1",
            description=f"Core product for {self.industry} operations.",
            stage=ProductStage.LIVE,
            tech_stack=["Standard Industry Stack"],
            unique_value_prop="High efficiency and low maintenance."
        )
        db.session.add(p1)
        db.session.flush()
        self.state["products"].append(p1)
        
        # Add a task for initial setup
        db.session.add(Task(
            startup_id=self.startup_id, name="Initial Production Line Calibration",
            status=TaskStatus.COMPLETED, created_by=self.user_id, scope=Scope.PRODUCT
        ))

    def _milestone_funding_round(self, date, round_name):
        """Month 3: A successful funding round."""
        amount = Decimal("1000000") if round_name == "Seed" else Decimal("5000000")
        round_data = FundingRound(
            startup_id=self.startup_id, round_type=round_name, status="Closed",
            target_amount=amount, amount_raised=amount * Decimal("1.2"),
            valuation_post=amount * 5, date_closed=date.date()
        )
        db.session.add(round_data)
        
        investor = Investor(
            startup_id=self.startup_id, name=f"Lead {round_name} Partner",
            firm_name="Growth Partners VC", notes=f"Led the {round_name} round."
        )
        db.session.add(investor)
        
        # Experiment triggered by funding
        db.session.add(Experiment(
            startup_id=self.startup_id, name="Scaling Production Capacity",
            description="Testing new automation to double output.", 
            status=ExperimentStatus.RUNNING
        ))

    def _milestone_marketing_push(self, date):
        """Month 6: A major marketing campaign leads to growth increase."""
        db.session.add(MarketingCampaign(
            startup_id=self.startup_id, campaign_name="Global Industry EXPO push",
            objective="Customer Acquisition", channel="Multi-channel",
            spend=Decimal("25000"), status="COMPLETED", created_by=self.user_id
        ))
        # Logic: Growth increases in subsequent months (handled in financials)
        self.state["marketing_boost"] = 0.05

    def _milestone_launch_new_product(self, date):
        """Month 9: Launching a 3rd Product (or secondary product)."""
        p_new = Product(
            startup_id=self.startup_id, name=f"Advanced {self.industry} Module",
            description="Next-gen addon for existing customers.", 
            stage=ProductStage.BETA, tech_stack=["Advanced IoT", "Cloud Sync"]
        )
        db.session.add(p_new)
        db.session.flush()
        self.state["products"].append(p_new)
        
        db.session.add(Task(
            startup_id=self.startup_id, name="Beta testing with 5 key customers",
            status=TaskStatus.IN_PROGRESS, created_by=self.user_id, scope=Scope.PRODUCT
        ))

    def _milestone_annual_review(self, date):
        """Month 12: Year-end recap."""
        db.session.add(Task(
            startup_id=self.startup_id, name="Annual Performance Board Meeting",
            status=TaskStatus.PENDING, created_by=self.user_id, scope=Scope.BUSINESS
        ))

    # --- Data Generators ---

    def _generate_monthly_financials(self, date):
        """Calculates and stores financial state for the month."""
        base_growth = random.uniform(0.02, 0.08)
        boost = self.state.get("marketing_boost", 0)
        
        growth = base_growth + boost
        self.state["revenue"] *= Decimal(str(1 + growth))
        
        new_cust = random.randint(2, 6)
        if boost > 0: new_cust += random.randint(3, 8)
        self.state["customers"] += new_cust
        
        expenses = self.state["revenue"] * Decimal(str(random.uniform(0.65, 0.85)))
        
        f_data = BusinessMonthlyData(
            startup_id=self.startup_id, month_start=date,
            total_revenue=self.state["revenue"].quantize(Decimal("0.01")),
            total_expenses=expenses.quantize(Decimal("0.01")),
            mrr=(self.state["revenue"] * self.state["mrr_ratio"]).quantize(Decimal("0.01")),
            new_customers=new_cust, total_customers=self.state["customers"],
            created_by=self.user_id
        )
        db.session.add(f_data)

    def _generate_crm_activity(self, date):
        """Creates leads and deals that evolve over time."""
        if random.random() < 0.4: # 40% chance of a new major lead
            company = CrmCompany(
                startup_id=self.startup_id, name=f"Client {random.randint(100,999)} Inc",
                industry=self.industry, owner_id=self.user_id
            )
            db.session.add(company)
            db.session.flush()
            
            contact = CrmContact(
                startup_id=self.startup_id, company_id=company.id,
                first_name="Story", last_name="Lead", job_title="VP Ops",
                owner_id=self.user_id
            )
            db.session.add(contact)
            
            # Deal starts in early stage
            deal = CrmDeal(
                startup_id=self.startup_id, company_id=company.id,
                name="Volume Purchase", amount=Decimal(str(random.randint(20000, 80000))),
                stage=CrmDealStage.QUALIFIED_TO_BUY, owner_id=self.user_id
            )
            db.session.add(deal)

    def _generate_operational_tasks(self, date, month_num):
        """Adds routine tasks to keep the board active."""
        if month_num % 3 == 0: # Quarterly tasks
            db.session.add(Task(
                startup_id=self.startup_id, name=f"Quarterly Performance Sync (Q{month_num//3})",
                status=TaskStatus.COMPLETED, created_by=self.user_id, scope=Scope.BUSINESS
            ))

    def _generate_product_metrics(self, product, date):
        """Generates realistic performance fluctuations."""
        # Just one record per month for simplicity in story
        db.session.add(ProductMetric(
            product_id=product.id, metric_name="Performance Index",
            value=Decimal(str(round(random.uniform(88, 97), 2))),
            unit="%", period="monthly", date_recorded=date.date()
        ))

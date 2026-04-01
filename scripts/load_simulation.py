import sys
import os
import json
import random
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import (
    Startup, Product, BusinessMonthlyData, ProductMetric, 
    Task, FundingRound, TaskStatus, Scope, ProductStage, User,
    Feature, FeatureStatus, Experiment, ExperimentStatus,
    MarketingCampaign, MarketingCampaignStatus, Investor, InvestorStage, RoundInvestor,
    CapTableEntry, StakeholderType
)
from app.modules.crm.models import (
    CrmCompany, CrmContact, CrmDeal, CrmDealStage
)
from app.services.insights_service import InsightsService
from app.services.accounting_service import recalculate_startup_balances

def load_simulation_to_db(json_path, user_email):
    """
    Reads a simulation JSON and populates the database for a target user/startup.
    """
    app = create_app()
    with app.app_context():
        # 1. Lookup User and Startup
        user = User.query.filter_by(email=user_email).first()
        if not user:
            print(f"Error: No user found with email: {user_email}")
            return
        
        startup = user.startups[0] if user.startups else None
        if not startup:
            print(f"Error: No startup associated with user: {user_email}")
            return
            
        print(f"--- [Loader] Loading simulation into Startup: {startup.name} (ID: {startup.id}) ---")
        
        # 1.5 Cleanup existing data for this startup
        print("--- [Loader] Cleaning up existing simulation data for this startup... ---")
        from app.models import (
            Feature, Experiment, MarketingCampaign, BusinessMonthlyData, 
            Task, StartupSnapshot, ProductMetric, FundingRound, RoundInvestor,
            Account, JournalEntry, JournalLine, AccountType
        )
        from app.modules.crm.models import CrmDeal, CrmCompany
        
        StartupSnapshot.query.filter_by(startup_id=startup.id).delete()
        BusinessMonthlyData.query.filter_by(startup_id=startup.id).delete()
        Task.query.filter_by(startup_id=startup.id).delete()
        Experiment.query.filter_by(startup_id=startup.id).delete()
        Investor.query.filter_by(startup_id=startup.id).delete()
        CapTableEntry.query.filter_by(startup_id=startup.id).delete()
        MarketingCampaign.query.filter_by(startup_id=startup.id).delete()
        CrmDeal.query.filter_by(startup_id=startup.id).delete()
        CrmCompany.query.filter_by(startup_id=startup.id).delete()
        
        # Cleanup Ledger
        JournalLine.query.filter(JournalLine.account.has(startup_id=startup.id)).delete()
        JournalEntry.query.filter_by(startup_id=startup.id).delete()
        Account.query.filter_by(startup_id=startup.id).delete()
        
        # Cleanup Product items
        for p in startup.products:
            Feature.query.filter_by(product_id=p.id).delete()
            ProductMetric.query.filter_by(product_id=p.id).delete()
            
        # Cleanup Funding
        rounds = FundingRound.query.filter_by(startup_id=startup.id).all()
        for r in rounds:
            RoundInvestor.query.filter_by(round_id=r.round_id).delete()
            db.session.delete(r)

        db.session.commit()
        print("--- [Loader] Cleanup complete. ---")

        # 2. Read JSON
        with open(json_path, 'r') as f:
            sim_data = json.load(f)
            
        # Setup Chart of Accounts
        coa = {
            'Bank': Account(startup_id=startup.id, name='Bank', type=AccountType.ASSET, subtype='Bank'),
            'Common Stock': Account(startup_id=startup.id, name='Common Stock', type=AccountType.EQUITY, subtype='Equity'),
            'Retained Earnings': Account(startup_id=startup.id, name='Retained Earnings', type=AccountType.EQUITY, subtype='Equity'),
            'Product Revenue': Account(startup_id=startup.id, name='Product Revenue', type=AccountType.INCOME, subtype='Revenue'),
            'Marketing Spend': Account(startup_id=startup.id, name='Marketing Spend', type=AccountType.EXPENSE, subtype='Operating Expense'),
            'Payroll & Benefits': Account(startup_id=startup.id, name='Payroll & Benefits', type=AccountType.EXPENSE, subtype='Operating Expense'),
            'Server Hosting': Account(startup_id=startup.id, name='Server Hosting', type=AccountType.EXPENSE, subtype='Operating Expense'),
            'Legal & Pro': Account(startup_id=startup.id, name='Legal & Pro', type=AccountType.EXPENSE, subtype='Operating Expense'),
            'Office & Admin': Account(startup_id=startup.id, name='Office & Admin', type=AccountType.EXPENSE, subtype='Operating Expense')
        }
        for acc in coa.values():
            db.session.add(acc)
        db.session.flush()
            
        current_cash = Decimal("150000.00") # Starting cash assumption
        
        # 2b. Ensure Product exists
        product_data = sim_data.get("product")
        if not startup.products and product_data:
            p = Product(
                startup_id=startup.id,
                name=product_data.get("name", "PulseSync Platform"),
                description=product_data.get("description", "AI-powered productivity and analytics"),
                stage=ProductStage.BETA,
                created_by=user.id
            )
            db.session.add(p)
            db.session.flush()
        elif not startup.products:
            # Fallback
            p = Product(
                startup_id=startup.id,
                name="PulseSync Platform",
                description="AI-powered productivity and analytics",
                stage=ProductStage.BETA,
                created_by=user.id
            )
            db.session.add(p)
            db.session.flush()
        
        # 2a. Record Opening Balance in Ledger
        first_month = sim_data["monthly_data"][0]
        start_dt = datetime.strptime(f"{first_month['month']} {first_month['year']}", "%B %Y").date()
        opening_je = JournalEntry(startup_id=startup.id, date=start_dt, description="Opening Balance")
        db.session.add(opening_je)
        db.session.flush()
        db.session.add(JournalLine(journal_entry_id=opening_je.id, account_id=coa['Bank'].id, debit=current_cash, credit=0))
        db.session.add(JournalLine(journal_entry_id=opening_je.id, account_id=coa['Common Stock'].id, debit=0, credit=current_cash))
        
        # 3. Process Monthly Data (Cumulative & Derived)
        for month_data in sim_data["monthly_data"]:
            month_name = month_data["month"]
            year = month_data["year"]
            dt = datetime.strptime(f"{month_name} {year}", "%B %Y").date()
            
            # --- PHASE A: Load Objects First ---
            
            # 1. Marketing Campaigns
            month_marketing_spend = Decimal("0.00")
            for mkt in month_data.get("marketing_campaigns", []):
                camp = MarketingCampaign(
                    startup_id=startup.id,
                    campaign_name=mkt["name"],
                    channel=mkt.get("channel", "Digital"),
                    spend=Decimal(str(mkt["spend"])),
                    impressions=mkt.get("impressions", 0),
                    clicks=mkt.get("clicks", 0),
                    conversions=mkt.get("conversions", 0),
                    start_date=dt,
                    end_date=dt + timedelta(days=27),
                    status=MarketingCampaignStatus.COMPLETED,
                    created_by=user.id
                )
                db.session.add(camp)
                month_marketing_spend += Decimal(str(mkt["spend"]))
            
            # 2. CRM Deals
            month_deal_revenue = Decimal("0.00")
            for deal_data in month_data.get("crm_deals", []):
                # Distribute deal dates across the month
                day = min(28, len(month_data.get("crm_deals", [])) + 1)
                deal_dt = datetime(dt.year, dt.month, day)
                
                # Close won stage
                is_won = deal_data["stage"] == "Closed Won" or deal_data["stage"] == "WON"
                stage = CrmDealStage.CLOSED_WON if is_won else CrmDealStage.QUALIFIED_TO_BUY
                
                deal = CrmDeal(
                    startup_id=startup.id,
                    name=deal_data["name"],
                    amount=Decimal(str(deal_data["amount"])),
                    stage=stage,
                    close_date=dt + timedelta(days=15),
                    created_at=deal_dt,
                    updated_at=deal_dt,
                    owner_id=user.id
                )
                db.session.add(deal)
                if is_won:
                    month_deal_revenue += deal.amount

            # 3. Funding Rounds
            month_investment = Decimal("0.00")
            inv_data = month_data.get("investment")
            if inv_data and inv_data["status"].upper() == "CLOSED":
                month_investment = Decimal(str(inv_data["amount"]))
                pre_money = Decimal(str(inv_data.get("valuation_pre", "30000000")))
                post_money = pre_money + month_investment
                
                fr = FundingRound(
                    startup_id=startup.id,
                    round_type=inv_data.get("round_name", "Funding"),
                    target_amount=month_investment,
                    amount_raised=month_investment,
                    valuation_pre=pre_money,
                    valuation_post=post_money,
                    date_opened=dt - timedelta(days=120),
                    date_closed=dt,
                    status="Closed"
                )
                db.session.add(fr)
                db.session.flush()

                # Update Cap Table
                # Total shares assumption: 10,000,000 post-money
                TOTAL_SHARES = 10000000
                investor_share_pct = month_investment / post_money
                investor_total_shares = int(TOTAL_SHARES * investor_share_pct)
                founder_shares = TOTAL_SHARES - investor_total_shares

                # Founder Entry (Update or Create)
                founder_entry = CapTableEntry.query.filter_by(startup_id=startup.id, stakeholder_type=StakeholderType.FOUNDER).first()
                if not founder_entry:
                    founder_entry = CapTableEntry(
                        startup_id=startup.id,
                        stakeholder_name=user.full_name,
                        stakeholder_type=StakeholderType.FOUNDER,
                        shares=founder_shares
                    )
                    db.session.add(founder_entry)
                else:
                    founder_entry.shares = founder_shares

                # Create Investors and link them
                for inv in inv_data.get("investors", []):
                    # Check if investor exists for this startup
                    investor = Investor.query.filter_by(
                        startup_id=startup.id,
                        name=inv["name"]
                    ).first()

                    if not investor:
                        investor = Investor(
                            startup_id=startup.id,
                            name=inv["name"],
                            firm_name=inv["firm"],
                            stage=InvestorStage.PORTFOLIO,
                            type="VC" if "Ventures" in inv["firm"] else "Angel"
                        )
                        db.session.add(investor)
                        db.session.flush()

                    # Link to round
                    ri = RoundInvestor(
                        round_id=fr.round_id,
                        investor_id=investor.investor_id,
                        amount_invested=Decimal(str(inv["amount"]))
                    )
                    db.session.add(ri)

                    # Add to Cap Table
                    inv_share_pct = Decimal(str(inv["amount"])) / month_investment
                    inv_shares = int(investor_total_shares * inv_share_pct)
                    
                    cap_entry = CapTableEntry(
                        startup_id=startup.id,
                        stakeholder_name=inv["name"],
                        stakeholder_type=StakeholderType.INVESTOR,
                        shares=inv_shares
                    )
                    db.session.add(cap_entry)

            # --- PHASE B: Derived Ledger Generation ---
            
            # Create a single Journal Entry for the month's primary activities
            je = JournalEntry(startup_id=startup.id, date=dt, description=f"Monthly Activity: {month_name} {year}")
            db.session.add(je)
            db.session.flush()

            # Ledger: Investment
            if month_investment > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=month_investment, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Common Stock'].id, debit=0, credit=month_investment))
                current_cash += month_investment

            # Ledger: Marketing (Directly from Campaign objects)
            if month_marketing_spend > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Marketing Spend'].id, debit=month_marketing_spend, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=0, credit=month_marketing_spend))
                current_cash -= month_marketing_spend

            # Ledger: Revenue (Sync check: Use LLM projected revenue, but ensure it's >= Won Deals)
            projected_rev = Decimal(str(month_data["financials"]["revenue"]))
            actual_ledger_rev = max(projected_rev, month_deal_revenue)
            
            if actual_ledger_rev > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=actual_ledger_rev, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Product Revenue'].id, debit=0, credit=actual_ledger_rev))
                current_cash += actual_ledger_rev

            # Ledger: Other Expenses (Payroll, Hosting, Admin)
            # We distribute the remaining expenses from LLM into categories
            total_projected_exp = Decimal(str(month_data["financials"]["expenses"]))
            other_exp = total_projected_exp - month_marketing_spend
            
            # Simple distribution for demo purposes
            payroll = other_exp * Decimal("0.70")
            hosting = other_exp * Decimal("0.15")
            admin = other_exp * Decimal("0.15")
            
            if payroll > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Payroll & Benefits'].id, debit=payroll, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=0, credit=payroll))
            if hosting > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Server Hosting'].id, debit=hosting, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=0, credit=hosting))
            if admin > 0:
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Office & Admin'].id, debit=admin, credit=0))
                db.session.add(JournalLine(journal_entry_id=je.id, account_id=coa['Bank'].id, debit=0, credit=admin))
            
            current_cash -= other_exp

            # --- PHASE C: Populate Monthly Data from Ledger ---
            # Instead of using raw LLM numbers, we use the DERIVED numbers to ensure parity
            total_month_rev = actual_ledger_rev
            total_month_exp = month_marketing_spend + other_exp
            
            bdata = BusinessMonthlyData(
                startup_id=startup.id,
                month_start=dt,
                total_revenue=total_month_rev,
                total_expenses=total_month_exp,
                net_burn=total_month_exp - total_month_rev,
                cash_in_bank=current_cash,
                mrr=Decimal(str(month_data["financials"]["mrr"])),
                new_customers=month_data["financials"]["new_customers"],
                total_customers=month_data["financials"]["total_customers"],
                created_by=user.id
            )
            db.session.add(bdata)

            # 4. Tasks
            for task_data in month_data.get("tasks", []):
                task_status = task_data.get("status", "PENDING").upper()
                task = Task(
                    startup_id=startup.id,
                    name=task_data["name"],
                    description=task_data.get("description", ""),
                    status=getattr(TaskStatus, task_status, TaskStatus.PENDING),
                    due_date=dt + timedelta(days=14),
                    created_by=user.id,
                    assigned_to=user.id
                )
                db.session.add(task)

            # 5. Experiments
            for exp_item in month_data.get("experiments", []):
                experiment = Experiment(
                    startup_id=startup.id,
                    name=exp_item["name"],
                    description=exp_item.get("hypothesis", ""),
                    assumption=exp_item.get("hypothesis", ""),
                    result=exp_item.get("result", ""),
                    status=ExperimentStatus.COMPLETED if exp_item.get("result") != "Pending" else ExperimentStatus.RUNNING,
                    scope=Scope.PRODUCT
                )
                db.session.add(experiment)

            # 6. Product features
            p1 = startup.products[0] if startup.products else None
            if p1:
                for feat_data in month_data.get("features", []):
                    feature_status = feat_data.get("status", "BACKLOG").upper()
                    feature = Feature(
                        product_id=p1.id,
                        name=feat_data["name"],
                        description=feat_data["description"],
                        status=getattr(FeatureStatus, feature_status, FeatureStatus.BACKLOG),
                        created_by=user.id
                    )
                    db.session.add(feature)
            
            # 7. Product Metrics
            if p1:
                for metric in month_data.get("product_metrics", []):
                    pm = ProductMetric(
                        product_id=p1.id,
                        metric_name=metric["name"],
                        value=Decimal(str(metric["value"])),
                        unit=metric["unit"],
                        period="monthly",
                        date_recorded=dt
                    )
                    db.session.add(pm)

        db.session.commit()
        # 4. Final Balance Reconciliation
        print(f"--- [Loader] Main data committed. Recalculating account balances... ---")
        recalculate_startup_balances(startup.id)
        
        # 5. Trigger Snapshot
        print(f"--- [Loader] Generating final snapshot... ---")
        try:
            InsightsService.generate_snapshot(startup.id)
            print(f"--- [Loader] Dashboard Snapshot generated successfully! ---")
        except Exception as e:
            print(f"--- [Loader] Warning: Failed to generate snapshot: {str(e)} ---")

        print(f"\n--- [Loader] Success! Enriched simulation data loaded for {startup.name}. ---")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 load_simulation.py <json_path> <user_email>")
        sys.exit(1)
        
    json_path = sys.argv[1]
    email = sys.argv[2]
    
    # Set the env var to skip socketio
    os.environ['FLASK_DB_CREATION'] = '1'
    load_simulation_to_db(json_path, email)

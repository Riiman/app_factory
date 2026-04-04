import sys
import os
from decimal import Decimal

# Add app directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import (
    Startup, BusinessMonthlyData, JournalEntry, JournalLine, 
    Account, AccountType, MarketingCampaign
)

def verify_startup(user_email):
    app = create_app()
    with app.app_context():
        from app.models import User
        user = User.query.filter_by(email=user_email).first()
        if not user or not user.startups:
            print(f"Error: User {user_email} not found or has no startups.")
            return
        
        startup = user.startups[0]
        print(f"--- Verifying Integrity for Startup: {startup.name} (ID: {startup.id}) ---\n")
        
        # 1. Monthly Parity (Executive vs Accounting)
        months = BusinessMonthlyData.query.filter_by(startup_id=startup.id).order_by(BusinessMonthlyData.month_start.asc()).all()
        
        discrepancies = 0
        for bmd in months:
            month_start = bmd.month_start
            month_end = bmd.month_start.replace(day=28) # Approximation
            
            # Revenue from Ledger
            ledger_rev = db.session.query(db.func.sum(JournalLine.credit - JournalLine.debit))\
                .join(Account).join(JournalEntry)\
                .filter(JournalEntry.startup_id == startup.id)\
                .filter(JournalEntry.date == month_start)\
                .filter(Account.type == AccountType.INCOME).scalar() or 0
                
            # Expenses from Ledger
            ledger_exp = db.session.query(db.func.sum(JournalLine.debit - JournalLine.credit))\
                .join(Account).join(JournalEntry)\
                .filter(JournalEntry.startup_id == startup.id)\
                .filter(JournalEntry.date == month_start)\
                .filter(Account.type == AccountType.EXPENSE).scalar() or 0
            
            # Marketing Sync
            mkt_camp_sum = db.session.query(db.func.sum(MarketingCampaign.spend))\
                .filter(MarketingCampaign.startup_id == startup.id)\
                .filter(MarketingCampaign.start_date == month_start).scalar() or 0
            
            ledger_mkt = db.session.query(db.func.sum(JournalLine.debit - JournalLine.credit))\
                .join(Account).join(JournalEntry)\
                .filter(JournalEntry.startup_id == startup.id)\
                .filter(JournalEntry.date == month_start)\
                .filter(Account.name == 'Marketing Spend').scalar() or 0

            print(f"[{month_start.strftime('%b %Y')}]")
            print(f"  Revenue: Executive={bmd.total_revenue}, Ledger={ledger_rev}")
            print(f"  Expenses: Executive={bmd.total_expenses}, Ledger={ledger_exp}")
            print(f"  Marketing: Objects={mkt_camp_sum}, Ledger={ledger_mkt}")
            
            if abs(Decimal(str(bmd.total_revenue)) - Decimal(str(ledger_rev))) > 0.01:
                print("  [!] Revenue Mismatch")
                discrepancies += 1
            if abs(Decimal(str(bmd.total_expenses)) - Decimal(str(ledger_exp))) > 0.01:
                print("  [!] Expense Mismatch")
                discrepancies += 1
            if abs(Decimal(str(mkt_camp_sum)) - Decimal(str(ledger_mkt))) > 0.01:
                print("  [!] Marketing Mismatch")
                discrepancies += 1
        
        print(f"\n--- Verification Complete. Discrepancies found: {discrepancies} ---")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "rock6241@gmail.com"
    verify_startup(email)

"""
Accounting Analytics Service
Calculates cash flow, P&L, expense breakdown, and financial health metrics
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import Account, AccountType, JournalEntry, JournalLine, BusinessMonthlyData
from app.extensions import db


def calculate_cash_flow(startup_id, months=6):
    """
    Calculate cash flow waterfall data
    Shows cash inflows and outflows over time
    """
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    # Get cash/bank accounts
    cash_accounts = Account.query.filter(
        Account.startup_id == startup_id,
        Account.type == AccountType.ASSET,
        Account.name.in_(['Cash', 'Bank', 'Petty Cash'])
    ).all()
    
    if not cash_accounts:
        return []
    
    cash_account_ids = [acc.id for acc in cash_accounts]
    
    # Get starting balance
    start_balance_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('balance')
    ).join(JournalEntry).filter(
        JournalLine.account_id.in_(cash_account_ids),
        JournalEntry.date < cutoff_date
    ).first()
    
    starting_balance = float(start_balance_query.balance or 0)
    
    # Get revenue (income accounts)
    revenue_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('revenue')
    ).join(JournalEntry).join(Account).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.INCOME
    ).first()
    
    revenue = float(revenue_query.revenue or 0)
    
    # Get expenses (expense accounts)
    expense_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('expenses')
    ).join(JournalEntry).join(Account).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.EXPENSE
    ).first()
    
    expenses = float(expense_query.expenses or 0)
    
    # Get ending balance
    end_balance_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('balance')
    ).join(JournalEntry).filter(
        JournalLine.account_id.in_(cash_account_ids)
    ).first()
    
    ending_balance = float(end_balance_query.balance or 0)
    
    # Build waterfall data
    waterfall_data = [
        {'name': 'Starting Cash', 'value': starting_balance, 'type': 'total'},
        {'name': 'Revenue', 'value': revenue, 'type': 'increase'},
        {'name': 'Expenses', 'value': -expenses, 'type': 'decrease'},
        {'name': 'Ending Cash', 'value': ending_balance, 'type': 'total'}
    ]
    
    return waterfall_data


def calculate_pnl(startup_id, months=6):
    """
    Calculate Profit & Loss statement
    """
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    # Revenue
    revenue_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('revenue')
    ).join(JournalEntry).join(Account).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.INCOME
    ).first()
    
    revenue = float(revenue_query.revenue or 0)
    
    # Cost of Goods Sold (if tracked separately)
    cogs_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('cogs')
    ).join(JournalEntry).join(Account).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.EXPENSE,
        Account.name.ilike('%cost%')
    ).first()
    
    cogs = float(cogs_query.cogs or 0)
    
    # Operating Expenses
    opex_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('opex')
    ).join(JournalEntry).join(Account).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.EXPENSE,
        ~Account.name.ilike('%cost%')
    ).first()
    
    opex = float(opex_query.opex or 0)
    
    gross_profit = revenue - cogs
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
    
    net_profit = revenue - cogs - opex
    net_margin = (net_profit / revenue * 100) if revenue > 0 else 0
    
    return {
        'revenue': revenue,
        'cogs': cogs,
        'gross_profit': gross_profit,
        'gross_margin': round(gross_margin, 2),
        'operating_expenses': opex,
        'net_profit': net_profit,
        'net_margin': round(net_margin, 2)
    }


def calculate_expense_breakdown(startup_id, months=6):
    """
    Calculate expense breakdown by category/account
    """
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    expense_breakdown = db.session.query(
        Account.name,
        func.sum(JournalLine.debit - JournalLine.credit).label('amount')
    ).join(JournalEntry).filter(
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= cutoff_date,
        Account.type == AccountType.EXPENSE
    ).group_by(Account.name).all()
    
    total_expenses = sum(float(row.amount or 0) for row in expense_breakdown)
    
    results = []
    for row in expense_breakdown:
        amount = float(row.amount or 0)
        percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
        
        results.append({
            'category': row.name,
            'amount': amount,
            'percentage': round(percentage, 1)
        })
    
    # Sort by amount descending
    results.sort(key=lambda x: x['amount'], reverse=True)
    
    return results


def calculate_burn_rate_trend(startup_id, months=6):
    """
    Calculate burn rate trend over time with runway projection
    """
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    monthly_data = BusinessMonthlyData.query.filter(
        BusinessMonthlyData.startup_id == startup_id,
        BusinessMonthlyData.month_start >= cutoff_date
    ).order_by(BusinessMonthlyData.month_start).all()
    
    results = []
    for data in monthly_data:
        burn_rate = float(data.net_burn or 0)
        cash_balance = float(data.cash_in_bank or 0)
        runway = (cash_balance / burn_rate) if burn_rate > 0 else 99
        
        results.append({
            'month': data.month_start.isoformat(),
            'burn_rate': burn_rate,
            'cash_balance': cash_balance,
            'runway_months': round(runway, 1)
        })
    
    return results


def calculate_balance_sheet_summary(startup_id):
    """
    Calculate simplified balance sheet summary
    """
    # Assets
    assets_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('total_assets')
    ).join(Account).filter(
        Account.startup_id == startup_id,
        Account.type == AccountType.ASSET
    ).first()
    
    total_assets = float(assets_query.total_assets or 0)
    
    # Liabilities
    liabilities_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('total_liabilities')
    ).join(Account).filter(
        Account.startup_id == startup_id,
        Account.type == AccountType.LIABILITY
    ).first()
    
    total_liabilities = float(liabilities_query.total_liabilities or 0)
    
    # Equity
    equity_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('total_equity')
    ).join(Account).filter(
        Account.startup_id == startup_id,
        Account.type == AccountType.EQUITY
    ).first()
    
    total_equity = float(equity_query.total_equity or 0)
    
    return {
        'total_assets': total_assets,
        'total_liabilities': total_liabilities,
        'total_equity': total_equity,
        'net_worth': total_assets - total_liabilities
    }

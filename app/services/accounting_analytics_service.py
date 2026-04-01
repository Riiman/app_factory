"""
Accounting Analytics Service
Calculates cash flow, P&L, expense breakdown, and financial health metrics
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import Account, AccountType, JournalEntry, JournalLine, BusinessMonthlyData
from app.extensions import db

def get_date_range(months=6, month=None, year=None):
    if month and year:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
    else:
        start_date = datetime.utcnow() - timedelta(days=months * 30)
        end_date = None
    return start_date, end_date


def calculate_cash_flow(startup_id, months=6, month=None, year=None):
    """
    Calculate cash flow waterfall data
    Shows cash inflows and outflows over time
    """
    start_date, end_date = get_date_range(months, month, year)
    
    # Get cash/bank accounts
    cash_accounts = Account.query.filter(
        Account.startup_id == startup_id,
        Account.type == AccountType.ASSET,
        Account.name.in_(['Cash', 'Bank', 'Petty Cash'])
    ).all()
    
    if not cash_accounts:
        return []
    
    cash_account_ids = [acc.id for acc in cash_accounts]
    
    # Get starting balance (all entries BEFORE start_date)
    start_balance_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('balance')
    ).join(JournalEntry).filter(
        JournalLine.account_id.in_(cash_account_ids),
        JournalEntry.date < start_date
    ).first()
    
    starting_balance = float(start_balance_query.balance or 0)
    
    # Get revenue (income accounts)
    rev_filters = [
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= start_date,
        Account.type == AccountType.INCOME
    ]
    if end_date: rev_filters.append(JournalEntry.date < end_date)
    
    revenue_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('revenue')
    ).join(JournalEntry).join(Account).filter(*rev_filters).first()
    
    revenue = float(revenue_query.revenue or 0)
    
    # Get expenses (expense accounts)
    exp_filters = [
        JournalEntry.startup_id == startup_id,
        JournalEntry.date >= start_date,
        Account.type == AccountType.EXPENSE
    ]
    if end_date: exp_filters.append(JournalEntry.date < end_date)
        
    expense_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('expenses')
    ).join(JournalEntry).join(Account).filter(*exp_filters).first()
    
    expenses = float(expense_query.expenses or 0)
    
    # Get ending balance
    end_bal_filters = [JournalLine.account_id.in_(cash_account_ids)]
    if end_date: end_bal_filters.append(JournalEntry.date < end_date)
        
    end_balance_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('balance')
    ).join(JournalEntry).filter(*end_bal_filters).first()
    
    ending_balance = float(end_balance_query.balance or 0)
    
    # Build waterfall data
    waterfall_data = [
        {'name': 'Starting Cash', 'value': starting_balance, 'type': 'total'},
        {'name': 'Revenue', 'value': revenue, 'type': 'increase'},
        {'name': 'Expenses', 'value': -expenses, 'type': 'decrease'},
        {'name': 'Ending Cash', 'value': ending_balance, 'type': 'total'}
    ]
    
    return waterfall_data


def calculate_pnl(startup_id, months=6, month=None, year=None):
    """
    Calculate Profit & Loss statement
    """
    start_date, end_date = get_date_range(months, month, year)
    
    # Revenue
    rev_filters = [JournalEntry.startup_id == startup_id, JournalEntry.date >= start_date, Account.type == AccountType.INCOME]
    if end_date: rev_filters.append(JournalEntry.date < end_date)
        
    revenue_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('revenue')
    ).join(JournalEntry).join(Account).filter(*rev_filters).first()
    revenue = float(revenue_query.revenue or 0)
    
    # Cost of Goods Sold
    cogs_filters = [JournalEntry.startup_id == startup_id, JournalEntry.date >= start_date, Account.type == AccountType.EXPENSE, Account.name.ilike('%cost%')]
    if end_date: cogs_filters.append(JournalEntry.date < end_date)
        
    cogs_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('cogs')
    ).join(JournalEntry).join(Account).filter(*cogs_filters).first()
    cogs = float(cogs_query.cogs or 0)
    
    # Operating Expenses
    opex_filters = [JournalEntry.startup_id == startup_id, JournalEntry.date >= start_date, Account.type == AccountType.EXPENSE, ~Account.name.ilike('%cost%')]
    if end_date: opex_filters.append(JournalEntry.date < end_date)
        
    opex_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('opex')
    ).join(JournalEntry).join(Account).filter(*opex_filters).first()
    
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


def calculate_expense_breakdown(startup_id, months=6, month=None, year=None):
    """
    Calculate expense breakdown by category/account
    """
    start_date, end_date = get_date_range(months, month, year)
    
    filters = [JournalEntry.startup_id == startup_id, JournalEntry.date >= start_date, Account.type == AccountType.EXPENSE]
    if end_date: filters.append(JournalEntry.date < end_date)
        
    expense_breakdown = db.session.query(
        Account.name,
        func.sum(JournalLine.debit - JournalLine.credit).label('amount')
    ).join(JournalEntry).filter(*filters).group_by(Account.name).all()
    
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


def calculate_burn_rate_trend(startup_id, months=6, month=None, year=None):
    """
    Calculate burn rate trend over time with runway projection. (Usually returns a trend over time. We cap the end date if month is provided.)
    """
    _, end_date = get_date_range(months, month, year)
    start_date = (end_date if end_date else datetime.utcnow()) - timedelta(days=months * 30)
    
    filters = [BusinessMonthlyData.startup_id == startup_id, BusinessMonthlyData.month_start >= start_date]
    if end_date: filters.append(BusinessMonthlyData.month_start < end_date)
        
    monthly_data = BusinessMonthlyData.query.filter(*filters).order_by(BusinessMonthlyData.month_start).all()
    
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


def calculate_balance_sheet_summary(startup_id, month=None, year=None):
    """
    Calculate simplified balance sheet summary AS OF the given month end.
    """
    _, end_date = get_date_range(6, month, year)
    
    # Assets
    asset_filters = [Account.startup_id == startup_id, Account.type == AccountType.ASSET]
    if end_date: asset_filters.append(JournalEntry.date < end_date)
        
    assets_query = db.session.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('total_assets')
    ).join(JournalEntry).join(Account).filter(*asset_filters).first()
    
    total_assets = float(assets_query.total_assets or 0)
    
    # Liabilities
    liab_filters = [Account.startup_id == startup_id, Account.type == AccountType.LIABILITY]
    if end_date: liab_filters.append(JournalEntry.date < end_date)
        
    liabilities_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('total_liabilities')
    ).join(JournalEntry).join(Account).filter(*liab_filters).first()
    
    total_liabilities = float(liabilities_query.total_liabilities or 0)
    
    # Equity
    eq_filters = [Account.startup_id == startup_id, Account.type == AccountType.EQUITY]
    if end_date: eq_filters.append(JournalEntry.date < end_date)
        
    equity_query = db.session.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('total_equity')
    ).join(JournalEntry).join(Account).filter(*eq_filters).first()
    
    total_equity = float(equity_query.total_equity or 0)
    
    return {
        'total_assets': total_assets,
        'total_liabilities': total_liabilities,
        'total_equity': total_equity,
        'net_worth': total_assets - total_liabilities
    }

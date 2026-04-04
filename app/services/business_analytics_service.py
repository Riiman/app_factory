"""
Business Model Analytics Service
Calculates actual performance metrics for business models based on transaction data.
"""

from sqlalchemy import func
from datetime import datetime, timedelta
from app.models import (
    JournalLine, JournalEntry, Account, AccountType, BusinessModel,
    BusinessMonthlyData, MarketingCampaign
)
from app.extensions import db

def get_business_model_analytics(startup_id, business_model_id=None):
    """
    Calculate actual performance metrics for business models.
    
    Returns:
    - total_revenue: Total revenue generated
    - total_cost: Total costs incurred
    - total_quantity: Total units sold/delivered
    - actual_arpu: Actual Average Revenue Per Unit
    - actual_margin: Actual Gross Margin %
    - transaction_count: Number of transactions
    """
    
    # Base query for revenue (Income accounts)
    revenue_query = db.session.query(
        JournalLine.business_model_id,
        func.sum(JournalLine.credit - JournalLine.debit).label('total_revenue'),
        func.sum(JournalLine.quantity).label('total_quantity'),
        func.count(func.distinct(JournalLine.journal_entry_id)).label('transaction_count')
    ).join(Account).join(JournalEntry).filter(
        JournalEntry.startup_id == startup_id,
        Account.type == AccountType.INCOME,
        JournalLine.business_model_id.isnot(None)
    )
    
    if business_model_id:
        revenue_query = revenue_query.filter(JournalLine.business_model_id == business_model_id)
    
    revenue_query = revenue_query.group_by(JournalLine.business_model_id)
    
    # Base query for costs (Expense accounts)
    cost_query = db.session.query(
        JournalLine.business_model_id,
        func.sum(JournalLine.debit - JournalLine.credit).label('total_cost')
    ).join(Account).join(JournalEntry).filter(
        JournalEntry.startup_id == startup_id,
        Account.type == AccountType.EXPENSE,
        JournalLine.business_model_id.isnot(None)
    )
    
    if business_model_id:
        cost_query = cost_query.filter(JournalLine.business_model_id == business_model_id)
    
    cost_query = cost_query.group_by(JournalLine.business_model_id)
    
    # Execute queries
    revenue_results = {row.business_model_id: row for row in revenue_query.all()}
    cost_results = {row.business_model_id: row for row in cost_query.all()}
    
    # Combine results
    all_model_ids = set(revenue_results.keys()) | set(cost_results.keys())
    
    analytics = []
    for model_id in all_model_ids:
        revenue_row = revenue_results.get(model_id)
        cost_row = cost_results.get(model_id)
        
        total_revenue = float(revenue_row.total_revenue) if revenue_row and revenue_row.total_revenue else 0
        total_cost = float(cost_row.total_cost) if cost_row and cost_row.total_cost else 0
        total_quantity = float(revenue_row.total_quantity) if revenue_row and revenue_row.total_quantity else 0
        transaction_count = revenue_row.transaction_count if revenue_row else 0
        
        # Calculate metrics
        actual_arpu = (total_revenue / total_quantity) if total_quantity > 0 else 0
        actual_margin = ((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0
        
        analytics.append({
            'business_model_id': model_id,
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'total_quantity': total_quantity,
            'actual_arpu': round(actual_arpu, 2),
            'actual_margin': round(actual_margin, 2),
            'transaction_count': transaction_count
        })
    
    return analytics if not business_model_id else (analytics[0] if analytics else None)


def get_enriched_business_models(startup_id):
    """
    Get all business models with their actual performance metrics.
    """
    models = BusinessModel.query.filter_by(startup_id=startup_id).all()
    analytics = get_business_model_analytics(startup_id)
    
    # Create lookup dict
    analytics_dict = {a['business_model_id']: a for a in analytics}
    
    # Enrich models with analytics
    enriched = []
    for model in models:
        # Start with the base model dict (includes target values)
        model_dict = model.to_dict()
        
        # Add actual metrics (don't overwrite target values)
        if model.id in analytics_dict:
            analytics_data = analytics_dict[model.id]
            model_dict['actual_revenue'] = analytics_data['total_revenue']
            model_dict['actual_cost'] = analytics_data['total_cost']
            model_dict['actual_quantity'] = analytics_data['total_quantity']
            model_dict['actual_arpu'] = analytics_data['actual_arpu']
            model_dict['actual_margin'] = analytics_data['actual_margin']
            model_dict['transaction_count'] = analytics_data['transaction_count']
        else:
            # No transactions yet - add zero values for actual metrics
            model_dict['actual_revenue'] = 0
            model_dict['actual_cost'] = 0
            model_dict['actual_quantity'] = 0
            model_dict['actual_arpu'] = 0
            model_dict['actual_margin'] = 0
            model_dict['transaction_count'] = 0
        
        enriched.append(model_dict)
    
    return enriched


def calculate_unit_economics(startup_id):
    """
    Calculate comprehensive unit economics for all business models
    including CAC, LTV, and LTV:CAC ratio
    """
    models = BusinessModel.query.filter_by(startup_id=startup_id).all()
    analytics_dict = {a['business_model_id']: a for a in get_business_model_analytics(startup_id)}
    
    # Get CAC from latest monthly data
    latest_monthly = BusinessMonthlyData.query.filter_by(
        startup_id=startup_id
    ).order_by(BusinessMonthlyData.month_start.desc()).first()
    
    cac = 0
    if latest_monthly and latest_monthly.marketing_total_spend and latest_monthly.new_customers:
        cac = float(latest_monthly.marketing_total_spend) / latest_monthly.new_customers
    
    # Get churn rate for LTV calculation
    churn_rate = 5.0  # Default 5% monthly churn
    if latest_monthly and latest_monthly.churn_rate:
        churn_rate = float(latest_monthly.churn_rate)
    
    results = []
    for model in models:
        analytics = analytics_dict.get(model.id, {})
        actual_arpu = analytics.get('actual_arpu', 0)
        
        # Calculate LTV = ARPU * 12 / (Churn Rate / 100)
        ltv = (actual_arpu * 12) / (churn_rate / 100) if churn_rate > 0 and actual_arpu > 0 else 0
        
        # Calculate LTV:CAC ratio
        ltv_cac_ratio = ltv / cac if cac > 0 and ltv > 0 else 0
        
        results.append({
            'model_id': model.id,
            'model_name': model.name,
            'model_type': model.model_type.value if model.model_type else None,
            'target_arpu': model.target_arpu,
            'actual_arpu': actual_arpu,
            'arpu_variance': actual_arpu - (model.target_arpu or 0),
            'target_cac': model.target_cac,
            'actual_cac': cac,
            'cac_variance': cac - (model.target_cac or 0) if model.target_cac else None,
            'ltv': round(ltv, 2),
            'ltv_cac_ratio': round(ltv_cac_ratio, 2),
            'target_margin': model.target_margin,
            'actual_margin': analytics.get('actual_margin', 0),
            'margin_variance': analytics.get('actual_margin', 0) - (model.target_margin or 0),
            'revenue': analytics.get('total_revenue', 0),
            'transaction_count': analytics.get('transaction_count', 0)
        })
    
    return results


def calculate_customer_growth(startup_id, months=12):
    """Calculate customer growth trends over time"""
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    monthly_data = BusinessMonthlyData.query.filter(
        BusinessMonthlyData.startup_id == startup_id,
        BusinessMonthlyData.month_start >= cutoff_date
    ).order_by(BusinessMonthlyData.month_start).all()
    
    results = []
    for data in monthly_data:
        churned = int((data.total_customers or 0) * (float(data.churn_rate or 0) / 100))
        
        results.append({
            'month': data.month_start.isoformat(),
            'new_customers': data.new_customers or 0,
            'total_customers': data.total_customers or 0,
            'churn_rate': float(data.churn_rate) if data.churn_rate else 0,
            'churned_customers': churned,
            'net_growth': (data.new_customers or 0) - churned
        })
    
    return results


def calculate_revenue_breakdown(startup_id):
    """Calculate revenue breakdown by business model"""
    analytics = get_business_model_analytics(startup_id)
    
    total_revenue = sum(a['total_revenue'] for a in analytics)
    
    results = []
    for a in analytics:
        model = BusinessModel.query.get(a['business_model_id'])
        if model:
            results.append({
                'model_id': model.id,
                'model_name': model.name,
                'revenue': a['total_revenue'],
                'percentage': (a['total_revenue'] / total_revenue * 100) if total_revenue > 0 else 0
            })
    
    return results


def calculate_burn_metrics(startup_id):
    """Calculate burn rate, runway, and burn multiple"""
    latest = BusinessMonthlyData.query.filter_by(
        startup_id=startup_id
    ).order_by(BusinessMonthlyData.month_start.desc()).first()
    
    if not latest:
        return {
            'burn_rate': 0,
            'cash_balance': 0,
            'runway_months': 0,
            'burn_multiple': 0,
            'revenue': 0
        }
    
    burn_rate = float(latest.net_burn) if latest.net_burn else 0
    cash_balance = float(latest.cash_in_bank) if latest.cash_in_bank else 0
    revenue = float(latest.total_revenue) if latest.total_revenue else 0
    
    # Calculate runway
    runway_months = (cash_balance / burn_rate) if burn_rate > 0 else 99
    
    # Calculate burn multiple (burn / revenue)
    burn_multiple = (burn_rate / revenue) if revenue > 0 else 0
    
    return {
        'burn_rate': burn_rate,
        'cash_balance': cash_balance,
        'runway_months': round(runway_months, 1),
        'burn_multiple': round(burn_multiple, 2),
        'revenue': revenue
    }

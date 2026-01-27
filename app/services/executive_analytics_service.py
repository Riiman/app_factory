"""
Executive Analytics Service - Simplified and Robust Version
Aggregates key metrics from all modules for the main executive dashboard
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from app.extensions import db
from app.models import (
    Startup, BusinessMonthlyData, BusinessModel, MarketingCampaign,
    FundingRound, Investor, InvestorStage, Product, Feature, FeatureStatus,
    ProductIssue
)
from app.modules.crm.models import CrmDeal, CrmDealStage
from app.services.business_analytics_service import calculate_unit_economics, calculate_burn_metrics
from app.services.crm_analytics_service import calculate_pipeline_health, calculate_win_rate
from app.services.marketing_analytics_service import calculate_channel_performance
from app.services.accounting_analytics_service import calculate_balance_sheet_summary


def calculate_executive_summary(startup_id, days=90):
    """
    Calculate comprehensive executive summary for main dashboard
    """
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f'Calculating executive summary for startup {startup_id}')
    
    # Get latest monthly data
    latest_monthly = db.session.query(BusinessMonthlyData).filter(
        BusinessMonthlyData.startup_id == startup_id
    ).order_by(BusinessMonthlyData.month_start.desc()).first()
    
    # Get previous month for comparison
    previous_monthly = db.session.query(BusinessMonthlyData).filter(
        BusinessMonthlyData.startup_id == startup_id
    ).order_by(BusinessMonthlyData.month_start.desc()).offset(1).first()
    
    logger.info(f'Latest monthly: {latest_monthly.month_start if latest_monthly else None}')
    logger.info(f'Previous monthly: {previous_monthly.month_start if previous_monthly else None}')
    
    # Calculate all metrics - let errors bubble up instead of catching them
    financial_health = _calculate_financial_health(startup_id, latest_monthly, previous_monthly)
    logger.info(f'Financial health calculated: revenue={financial_health.get("total_revenue")}')
    
    growth_metrics = _calculate_growth_metrics(startup_id, latest_monthly, previous_monthly)
    logger.info(f'Growth metrics calculated: customers={growth_metrics.get("customer_count")}')
    
    module_health = _calculate_module_health(startup_id, days)
    logger.info('Module health calculated')
    
    acquisition_funnel = _calculate_acquisition_funnel(startup_id, days)
    logger.info('Acquisition funnel calculated')
    
    sales_pipeline = _calculate_sales_pipeline_summary(startup_id)
    logger.info('Sales pipeline calculated')
    
    alerts = _generate_alerts(startup_id, financial_health, module_health)
    logger.info(f'Generated {len(alerts)} alerts')
    
    recent_wins = _get_recent_wins(startup_id, days=30)
    logger.info(f'Found {len(recent_wins)} recent wins')
    
    return {
        'financial_health': financial_health,
        'growth_metrics': growth_metrics,
        'module_health': module_health,
        'acquisition_funnel': acquisition_funnel,
        'sales_pipeline': sales_pipeline,
        'alerts': alerts,
        'recent_wins': recent_wins
    }


def _get_default_financial_health():
    return {
        'total_revenue': 0,
        'revenue_trend': 0,
        'burn_rate': 0,
        'burn_trend': 0,
        'cash_balance': 0,
        'runway_months': 0,
        'gross_margin': 0,
        'margin_target': 70,
        'net_worth': 0
    }


def _get_default_growth_metrics():
    return {
        'customer_count': 0,
        'customer_growth_rate': 0,
        'mrr': 0,
        'mrr_growth': 0,
        'total_pipeline_value': 0,
        'ltv_cac_ratio': 0
    }


def _get_default_module_health():
    return {
        'business': {'status': 'warning', 'key_metric': 'No data'},
        'crm': {'status': 'warning', 'key_metric': 'No data'},
        'marketing': {'status': 'warning', 'key_metric': 'No data'},
        'product': {'status': 'warning', 'key_metric': 'No data', 'features_completed': 0, 'total_features': 0, 'bugs': 0},
        'accounting': {'status': 'warning', 'key_metric': 'No data', 'runway': 0, 'cash_balance': 0},
        'fundraising': {'status': 'warning', 'key_metric': 'No data', 'active_investors': 0}
    }


def _calculate_financial_health(startup_id, latest_monthly, previous_monthly):
    """Calculate core financial health metrics"""
    
    burn_metrics = calculate_burn_metrics(startup_id)
    balance_sheet = calculate_balance_sheet_summary(startup_id)
    
    # Safe value extraction
    total_revenue = float(latest_monthly.total_revenue or 0) if latest_monthly else 0
    prev_revenue = float(previous_monthly.total_revenue or 0) if previous_monthly else 0
    revenue_trend = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    burn_rate = float(latest_monthly.net_burn or 0) if latest_monthly else 0
    prev_burn = float(previous_monthly.net_burn or 0) if previous_monthly else 0
    burn_trend = ((burn_rate - prev_burn) / abs(prev_burn) * 100) if prev_burn != 0 else 0
    
    total_expenses = float(latest_monthly.total_expenses or 0) if latest_monthly else 0
    gross_margin = ((total_revenue - total_expenses) / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        'total_revenue': total_revenue,
        'revenue_trend': round(revenue_trend, 1),
        'burn_rate': abs(burn_rate),
        'burn_trend': round(burn_trend, 1),
        'cash_balance': burn_metrics.get('cash_balance', 0),
        'runway_months': burn_metrics.get('runway_months', 0),
        'gross_margin': round(gross_margin, 1),
        'margin_target': 70,
        'net_worth': balance_sheet.get('net_worth', 0)
    }


def _calculate_growth_metrics(startup_id, latest_monthly, previous_monthly):
    """Calculate growth and traction metrics"""
    
    # Safe customer metrics
    customer_count = latest_monthly.total_customers if (latest_monthly and latest_monthly.total_customers is not None) else 0
    prev_customers = previous_monthly.total_customers if (previous_monthly and previous_monthly.total_customers is not None) else 0
    customer_growth_rate = ((customer_count - prev_customers) / prev_customers * 100) if prev_customers > 0 else 0
    
    # MRR metrics
    mrr = float(latest_monthly.mrr or 0) if latest_monthly else 0
    prev_mrr = float(previous_monthly.mrr or 0) if previous_monthly else 0
    mrr_growth = ((mrr - prev_mrr) / prev_mrr * 100) if prev_mrr > 0 else 0
    
    # LTV:CAC from unit economics
    unit_economics_list = calculate_unit_economics(startup_id)
    ltv_cac_ratio = sum(m.get('ltv_cac_ratio', 0) for m in unit_economics_list) / len(unit_economics_list) if unit_economics_list else 0
    
    # Pipeline value
    crm_pipeline = calculate_pipeline_health(startup_id)
    crm_value = crm_pipeline.get('total_pipeline_value', 0)
    
    # Count active investors
    active_investors_count = Investor.query.filter(
        Investor.startup_id == startup_id,
        Investor.stage.in_([InvestorStage.MEETING, InvestorStage.DUE_DILIGENCE, InvestorStage.TERM_SHEET])
    ).count()
    
    fundraising_estimate = active_investors_count * 100000
    total_pipeline_value = crm_value + fundraising_estimate
    
    return {
        'customer_count': customer_count,
        'customer_growth_rate': round(customer_growth_rate, 1),
        'mrr': mrr,
        'mrr_growth': round(mrr_growth, 1),
        'total_pipeline_value': total_pipeline_value,
        'ltv_cac_ratio': round(ltv_cac_ratio, 1)
    }


def _calculate_module_health(startup_id, days=90):
    """Calculate health status for each module"""
    
    # Business Module
    unit_economics_list = calculate_unit_economics(startup_id)
    avg_margin = sum(m.get('actual_margin', 0) for m in unit_economics_list) / len(unit_economics_list) if unit_economics_list else 0
    
    business_health = {
        'status': 'healthy' if avg_margin >= 60 else 'warning',
        'revenue_vs_target': round(avg_margin, 1),
        'key_metric': f"{avg_margin:.1f}% margin"
    }
    
    # CRM Module
    pipeline_health = calculate_pipeline_health(startup_id)
    win_rate_data = calculate_win_rate(startup_id)
    win_rate = win_rate_data.get('win_rate', 0)
    
    crm_health = {
        'status': 'healthy' if win_rate >= 20 else 'warning' if win_rate >= 10 else 'critical',
        'pipeline_value': pipeline_health.get('total_pipeline_value', 0),
        'win_rate': win_rate,
        'key_metric': f"{win_rate:.1f}% win rate"
    }
    
    # Marketing Module
    channel_perf = calculate_channel_performance(startup_id, days)
    avg_cac = sum(ch.get('cac', 0) for ch in channel_perf) / len(channel_perf) if channel_perf else 0
    
    marketing_health = {
        'status': 'healthy' if avg_cac < 1000 else 'warning',
        'cac': round(avg_cac, 2),
        'conversions': sum(ch.get('conversions', 0) for ch in channel_perf),
        'key_metric': f"${avg_cac:.0f} CAC"
    }
    
    # Product Module - simplified
    products = Product.query.filter_by(startup_id=startup_id).all()
    total_features = 0
    completed_features = 0
    critical_bugs = 0
    
    for product in products:
        features = Feature.query.filter_by(product_id=product.id).all()
        total_features += len(features)
        completed_features += sum(1 for f in features if f.status == FeatureStatus.COMPLETED)
        
        bugs = ProductIssue.query.filter(
            ProductIssue.product_id == product.id,
            ProductIssue.severity == 'critical',
            ProductIssue.status != 'Resolved'
        ).count()
        critical_bugs += bugs
    
    completion_rate = (completed_features / total_features * 100) if total_features > 0 else 0
    
    product_health = {
        'status': 'critical' if critical_bugs > 5 else 'warning' if critical_bugs > 0 else 'healthy',
        'features_completed': completed_features,
        'total_features': total_features,
        'bugs': critical_bugs,
        'key_metric': f"{completion_rate:.0f}% complete"
    }
    
    # Accounting Module
    burn_metrics = calculate_burn_metrics(startup_id)
    runway = burn_metrics.get('runway_months', 0)
    
    accounting_health = {
        'status': 'critical' if runway < 6 else 'warning' if runway < 12 else 'healthy',
        'runway': runway,
        'cash_balance': burn_metrics.get('cash_balance', 0),
        'key_metric': f"{runway:.1f} mo runway"
    }
    
    # Fundraising Module
    active_investors = Investor.query.filter(
        Investor.startup_id == startup_id,
        Investor.stage.in_([InvestorStage.MEETING, InvestorStage.DUE_DILIGENCE, InvestorStage.TERM_SHEET])
    ).count()
    
    fundraising_health = {
        'status': 'healthy' if active_investors >= 10 else 'warning' if active_investors >= 5 else 'critical',
        'active_investors': active_investors,
        'key_metric': f"{active_investors} active convos"
    }
    
    return {
        'business': business_health,
        'crm': crm_health,
        'marketing': marketing_health,
        'product': product_health,
        'accounting': accounting_health,
        'fundraising': fundraising_health
    }


def _calculate_acquisition_funnel(startup_id, days=90):
    """Calculate marketing to customer acquisition funnel"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    marketing_data = db.session.query(
        func.sum(MarketingCampaign.impressions).label('impressions'),
        func.sum(MarketingCampaign.clicks).label('clicks'),
        func.sum(MarketingCampaign.conversions).label('conversions')
    ).filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date
    ).first()
    
    impressions = marketing_data.impressions or 0
    clicks = marketing_data.clicks or 0
    conversions = marketing_data.conversions or 0
    
    new_customers = db.session.query(
        func.sum(BusinessMonthlyData.new_customers)
    ).filter(
        BusinessMonthlyData.startup_id == startup_id,
        BusinessMonthlyData.month_start >= cutoff_date
    ).scalar() or 0
    
    return {
        'impressions': impressions,
        'clicks': clicks,
        'leads': conversions,
        'customers': new_customers
    }


def _calculate_sales_pipeline_summary(startup_id):
    """Calculate sales pipeline summary"""
    
    pipeline_health = calculate_pipeline_health(startup_id)
    win_rate_data = calculate_win_rate(startup_id)
    
    stage_distribution = db.session.query(
        CrmDeal.stage,
        func.count(CrmDeal.id).label('count'),
        func.sum(CrmDeal.amount).label('value')
    ).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage != CrmDealStage.CLOSED_LOST
    ).group_by(CrmDeal.stage).all()
    
    by_stage = [
        {
            'stage': row.stage.value,
            'count': row.count,
            'value': float(row.value or 0)
        }
        for row in stage_distribution
    ]
    
    total_deals = pipeline_health.get('total_deals', 0)
    total_value = pipeline_health.get('total_pipeline_value', 0)
    avg_deal_size = total_value / total_deals if total_deals > 0 else 0
    
    return {
        'total_value': total_value,
        'deal_count': total_deals,
        'win_rate': win_rate_data.get('win_rate', 0),
        'avg_deal_size': avg_deal_size,
        'by_stage': by_stage
    }


def _generate_alerts(startup_id, financial_health, module_health):
    """Generate priority alerts based on health metrics"""
    
    alerts = []
    
    runway = financial_health.get('runway_months', 0)
    if runway < 6:
        alerts.append({
            'type': 'critical',
            'module': 'accounting',
            'message': f'Cash runway critically low: {runway:.1f} months remaining',
            'priority': 1
        })
    elif runway < 12:
        alerts.append({
            'type': 'warning',
            'module': 'accounting',
            'message': f'Cash runway below 12 months: {runway:.1f} months remaining',
            'priority': 2
        })
    
    bugs = module_health['product']['bugs']
    if bugs > 0:
        alerts.append({
            'type': 'critical' if bugs > 5 else 'warning',
            'module': 'product',
            'message': f'{bugs} critical bug{"s" if bugs != 1 else ""} need attention',
            'priority': 1 if bugs > 5 else 3
        })
    
    win_rate = module_health['crm']['win_rate']
    if win_rate < 10:
        alerts.append({
            'type': 'warning',
            'module': 'crm',
            'message': f'Low win rate: {win_rate:.1f}% - review sales process',
            'priority': 3
        })
    
    active_investors = module_health['fundraising']['active_investors']
    if active_investors < 5:
        alerts.append({
            'type': 'warning',
            'module': 'fundraising',
            'message': f'Only {active_investors} active investor conversations',
            'priority': 4
        })
    
    alerts.sort(key=lambda x: x['priority'])
    return alerts[:5]


def _get_recent_wins(startup_id, days=30):
    """Get recent wins and successes"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    wins = []
    
    # Closed deals
    closed_deals = CrmDeal.query.filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage == CrmDealStage.CLOSED_WON,
        CrmDeal.close_date >= cutoff_date
    ).order_by(CrmDeal.close_date.desc()).limit(3).all()
    
    for deal in closed_deals:
        wins.append({
            'type': 'deal_closed',
            'title': f'{deal.deal_name} - ${deal.amount:,.0f}',
            'date': deal.close_date.isoformat() if deal.close_date else None,
            'module': 'crm'
        })
    
    # Completed features - use created_at since updated_at doesn't exist
    completed_features = Feature.query.join(Product).filter(
        Product.startup_id == startup_id,
        Feature.status == FeatureStatus.COMPLETED,
        Feature.created_at >= cutoff_date
    ).order_by(Feature.created_at.desc()).limit(3).all()
    
    for feature in completed_features:
        wins.append({
            'type': 'feature_shipped',
            'title': f'Shipped: {feature.name}',
            'date': feature.created_at.isoformat() if feature.created_at else None,
            'module': 'product'
        })
    
    # Recent funding
    recent_rounds = FundingRound.query.filter(
        FundingRound.startup_id == startup_id,
        FundingRound.date_closed >= cutoff_date
    ).order_by(FundingRound.date_closed.desc()).limit(2).all()
    
    for round in recent_rounds:
        wins.append({
            'type': 'funding_received',
            'title': f'{round.round_type} - ${round.amount_raised:,.0f} raised',
            'date': round.date_closed.isoformat() if round.date_closed else None,
            'module': 'fundraising'
        })
    
    wins.sort(key=lambda x: x.get('date', ''), reverse=True)
    return wins[:5]

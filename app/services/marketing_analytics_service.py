"""
Marketing Analytics Service
Calculates channel performance, CAC, ROI, and marketing funnel metrics
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import MarketingCampaign, MarketingCampaignStatus, BusinessMonthlyData
from app.extensions import db


def calculate_channel_performance(startup_id, days=90):
    """
    Calculate performance metrics by marketing channel
    Returns spend, impressions, clicks, conversions, and ROI per channel
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Group campaigns by channel
    channel_data = db.session.query(
        MarketingCampaign.channel,
        func.sum(MarketingCampaign.spend).label('total_spend'),
        func.sum(MarketingCampaign.impressions).label('total_impressions'),
        func.sum(MarketingCampaign.clicks).label('total_clicks'),
        func.sum(MarketingCampaign.conversions).label('total_conversions'),
        func.count(MarketingCampaign.campaign_id).label('campaign_count')
    ).filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date,
        MarketingCampaign.channel.isnot(None)
    ).group_by(MarketingCampaign.channel).all()
    
    results = []
    for row in channel_data:
        spend = float(row.total_spend or 0)
        impressions = row.total_impressions or 0
        clicks = row.total_clicks or 0
        conversions = row.total_conversions or 0
        
        # Calculate metrics
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        conversion_rate = (conversions / clicks * 100) if clicks > 0 else 0
        cac = (spend / conversions) if conversions > 0 else 0
        cpc = (spend / clicks) if clicks > 0 else 0
        
        results.append({
            'channel': row.channel,
            'spend': spend,
            'impressions': impressions,
            'clicks': clicks,
            'conversions': conversions,
            'ctr': round(ctr, 2),
            'conversion_rate': round(conversion_rate, 2),
            'cac': round(cac, 2),
            'cpc': round(cpc, 2),
            'campaign_count': row.campaign_count
        })
    
    return results


def calculate_cac_by_channel(startup_id, days=90):
    """
    Calculate Customer Acquisition Cost by channel
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    channel_cac = db.session.query(
        MarketingCampaign.channel,
        func.sum(MarketingCampaign.spend).label('total_spend'),
        func.sum(MarketingCampaign.conversions).label('total_conversions')
    ).filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date,
        MarketingCampaign.channel.isnot(None)
    ).group_by(MarketingCampaign.channel).all()
    
    results = []
    for row in channel_cac:
        spend = float(row.total_spend or 0)
        conversions = row.total_conversions or 0
        cac = (spend / conversions) if conversions > 0 else 0
        
        results.append({
            'channel': row.channel,
            'cac': round(cac, 2),
            'spend': spend,
            'conversions': conversions
        })
    
    # Sort by CAC (lowest first)
    results.sort(key=lambda x: x['cac'])
    
    return results


def calculate_marketing_funnel(startup_id, days=90):
    """
    Calculate marketing funnel: Impressions → Clicks → Conversions
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    totals = db.session.query(
        func.sum(MarketingCampaign.impressions).label('total_impressions'),
        func.sum(MarketingCampaign.clicks).label('total_clicks'),
        func.sum(MarketingCampaign.conversions).label('total_conversions')
    ).filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date
    ).first()
    
    impressions = totals.total_impressions or 0
    clicks = totals.total_clicks or 0
    conversions = totals.total_conversions or 0
    
    funnel_data = [
        {
            'stage': 'Impressions',
            'value': impressions,
            'count': impressions
        },
        {
            'stage': 'Clicks',
            'value': clicks,
            'count': clicks
        },
        {
            'stage': 'Conversions',
            'value': conversions,
            'count': conversions
        }
    ]
    
    return funnel_data


def calculate_campaign_roi(startup_id, days=90):
    """
    Calculate ROI for each campaign
    Assumes revenue attribution based on conversions
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get average revenue per customer from latest monthly data
    latest_monthly = BusinessMonthlyData.query.filter_by(
        startup_id=startup_id
    ).order_by(BusinessMonthlyData.month_start.desc()).first()
    
    avg_customer_value = 0
    if latest_monthly and latest_monthly.total_customers and latest_monthly.total_revenue:
        avg_customer_value = float(latest_monthly.total_revenue) / latest_monthly.total_customers
    
    # Get campaigns with their metrics
    campaigns = MarketingCampaign.query.filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date,
        MarketingCampaign.conversions > 0
    ).all()
    
    results = []
    for campaign in campaigns:
        spend = float(campaign.spend or 0)
        conversions = campaign.conversions or 0
        
        # Estimate revenue from conversions
        estimated_revenue = conversions * avg_customer_value
        
        # Calculate ROI
        roi = ((estimated_revenue - spend) / spend * 100) if spend > 0 else 0
        
        results.append({
            'campaign_id': campaign.campaign_id,
            'campaign_name': campaign.campaign_name,
            'channel': campaign.channel,
            'spend': spend,
            'conversions': conversions,
            'estimated_revenue': round(estimated_revenue, 2),
            'roi': round(roi, 2)
        })
    
    # Sort by ROI (highest first)
    results.sort(key=lambda x: x['roi'], reverse=True)
    
    return results


def calculate_spend_allocation(startup_id, days=90):
    """
    Calculate marketing spend allocation by channel
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    channel_spend = db.session.query(
        MarketingCampaign.channel,
        func.sum(MarketingCampaign.spend).label('total_spend')
    ).filter(
        MarketingCampaign.startup_id == startup_id,
        MarketingCampaign.start_date >= cutoff_date,
        MarketingCampaign.channel.isnot(None)
    ).group_by(MarketingCampaign.channel).all()
    
    total_spend = sum(float(row.total_spend or 0) for row in channel_spend)
    
    results = []
    for row in channel_spend:
        spend = float(row.total_spend or 0)
        percentage = (spend / total_spend * 100) if total_spend > 0 else 0
        
        results.append({
            'channel': row.channel,
            'spend': spend,
            'percentage': round(percentage, 1)
        })
    
    return results


def calculate_marketing_trends(startup_id, months=6):
    """
    Calculate marketing performance trends over time
    """
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    monthly_data = BusinessMonthlyData.query.filter(
        BusinessMonthlyData.startup_id == startup_id,
        BusinessMonthlyData.month_start >= cutoff_date
    ).order_by(BusinessMonthlyData.month_start).all()
    
    results = []
    for data in monthly_data:
        results.append({
            'month': data.month_start.isoformat(),
            'spend': float(data.marketing_total_spend or 0),
            'impressions': data.marketing_impressions or 0,
            'new_customers': data.new_customers or 0
        })
    
    return results

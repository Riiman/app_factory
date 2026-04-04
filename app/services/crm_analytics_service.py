"""
CRM Analytics Service
Calculates sales pipeline, conversion rates, and deal velocity metrics
"""

from datetime import datetime, timedelta
from sqlalchemy import func, case
from app.modules.crm.models import CrmDeal, CrmDealStage, CrmContact, CrmCompany, CrmInteraction
from app.extensions import db


def calculate_sales_funnel(startup_id):
    """
    Calculate sales pipeline funnel with conversion rates
    Returns deals grouped by stage with counts and values
    """
    # Define stage order for funnel
    stage_order = [
        CrmDealStage.APPOINTMENT_SCHEDULED,
        CrmDealStage.QUALIFIED_TO_BUY,
        CrmDealStage.PRESENTATION_SCHEDULED,
        CrmDealStage.DECISION_MAKER_BOUGHT_IN,
        CrmDealStage.CONTRACT_SENT,
        CrmDealStage.CLOSED_WON
    ]
    
    funnel_data = []
    
    # First get raw count/value for each stage
    raw_data = {}
    for stage in stage_order:
        result = db.session.query(
            func.count(CrmDeal.id).label('count'),
            func.sum(CrmDeal.amount).label('total_value')
        ).filter(
            CrmDeal.startup_id == startup_id,
            CrmDeal.stage == stage
        ).first()
        raw_data[stage] = {
            'count': result.count or 0,
            'value': float(result.total_value or 0)
        }
    
    # Accumulate backwards for a true funnel (Closed Won -> Appointment)
    cumulative_count = 0
    cumulative_value = 0.0
    
    for stage in reversed(stage_order):
        cumulative_count += raw_data[stage]['count']
        cumulative_value += raw_data[stage]['value']
        
        funnel_data.insert(0, {
            'stage': stage.value,
            'count': cumulative_count,
            'value': cumulative_value
        })
    
    return funnel_data


def calculate_conversion_rates(startup_id):
    """
    Calculate conversion rates between pipeline stages
    """
    stage_order = [
        CrmDealStage.APPOINTMENT_SCHEDULED,
        CrmDealStage.QUALIFIED_TO_BUY,
        CrmDealStage.PRESENTATION_SCHEDULED,
        CrmDealStage.DECISION_MAKER_BOUGHT_IN,
        CrmDealStage.CONTRACT_SENT,
        CrmDealStage.CLOSED_WON
    ]
    
    # Get counts for each stage
    stage_counts = {}
    for stage in stage_order:
        count = db.session.query(func.count(CrmDeal.id)).filter(
            CrmDeal.startup_id == startup_id,
            CrmDeal.stage == stage
        ).scalar() or 0
        stage_counts[stage.value] = count
    
    # Calculate conversion rates
    conversions = []
    for i in range(len(stage_order) - 1):
        from_stage = stage_order[i].value
        to_stage = stage_order[i + 1].value
        
        from_count = stage_counts[from_stage]
        to_count = stage_counts[to_stage]
        
        conversion_rate = (to_count / from_count * 100) if from_count > 0 else 0
        
        conversions.append({
            'from_stage': from_stage,
            'to_stage': to_stage,
            'conversion_rate': round(conversion_rate, 1)
        })
    
    return conversions


def calculate_deal_velocity(startup_id, days=30):
    """
    Calculate deal velocity metrics
    Average time to close and deal progression speed
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get closed won deals in the period
    closed_deals = CrmDeal.query.filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage == CrmDealStage.CLOSED_WON,
        CrmDeal.updated_at >= cutoff_date
    ).all()
    
    if not closed_deals:
        return {
            'avg_days_to_close': 0,
            'total_closed': 0,
            'total_value_closed': 0,
            'avg_deal_size': 0
        }
    
    total_days = 0
    total_value = 0
    
    for deal in closed_deals:
        # Calculate days from creation to close
        days_to_close = (deal.updated_at - deal.created_at).days
        total_days += days_to_close
        total_value += float(deal.amount or 0)
    
    avg_days = total_days / len(closed_deals)
    avg_deal_size = total_value / len(closed_deals)
    
    return {
        'avg_days_to_close': round(avg_days, 1),
        'total_closed': len(closed_deals),
        'total_value_closed': total_value,
        'avg_deal_size': round(avg_deal_size, 2)
    }


def calculate_win_rate(startup_id, days=90):
    """
    Calculate win rate (closed won vs closed lost)
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Count closed won deals
    won_count = db.session.query(func.count(CrmDeal.id)).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage == CrmDealStage.CLOSED_WON,
        CrmDeal.updated_at >= cutoff_date
    ).scalar() or 0
    
    # Count closed lost deals
    lost_count = db.session.query(func.count(CrmDeal.id)).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage == CrmDealStage.CLOSED_LOST,
        CrmDeal.updated_at >= cutoff_date
    ).scalar() or 0
    
    total_closed = won_count + lost_count
    win_rate = (won_count / total_closed * 100) if total_closed > 0 else 0
    
    return {
        'win_rate': round(win_rate, 1),
        'won_count': won_count,
        'lost_count': lost_count,
        'total_closed': total_closed
    }


def calculate_pipeline_health(startup_id):
    """
    Calculate overall pipeline health metrics
    """
    # Total pipeline value (all open deals)
    pipeline_value = db.session.query(
        func.sum(CrmDeal.amount)
    ).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage.notin_([CrmDealStage.CLOSED_WON, CrmDealStage.CLOSED_LOST])
    ).scalar() or 0
    
    # Total deal count
    total_deals = db.session.query(func.count(CrmDeal.id)).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage.notin_([CrmDealStage.CLOSED_WON, CrmDealStage.CLOSED_LOST])
    ).scalar() or 0
    
    # Average deal size
    avg_deal_size = (pipeline_value / total_deals) if total_deals > 0 else 0
    
    # Deals by stage distribution
    stage_distribution = db.session.query(
        CrmDeal.stage,
        func.count(CrmDeal.id).label('count')
    ).filter(
        CrmDeal.startup_id == startup_id,
        CrmDeal.stage.notin_([CrmDealStage.CLOSED_WON, CrmDealStage.CLOSED_LOST])
    ).group_by(CrmDeal.stage).all()
    
    distribution = {stage.value: count for stage, count in stage_distribution}
    
    return {
        'total_pipeline_value': float(pipeline_value),
        'total_deals': total_deals,
        'avg_deal_size': round(avg_deal_size, 2),
        'stage_distribution': distribution
    }


def calculate_activity_metrics(startup_id, days=30):
    """
    Calculate sales activity metrics
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Total interactions
    total_interactions = db.session.query(func.count(CrmInteraction.id)).filter(
        CrmInteraction.startup_id == startup_id,
        CrmInteraction.interaction_date >= cutoff_date
    ).scalar() or 0
    
    # Interactions by type
    interactions_by_type = db.session.query(
        CrmInteraction.interaction_type,
        func.count(CrmInteraction.id).label('count')
    ).filter(
        CrmInteraction.startup_id == startup_id,
        CrmInteraction.interaction_date >= cutoff_date
    ).group_by(CrmInteraction.interaction_type).all()
    
    by_type = {itype.value: count for itype, count in interactions_by_type}
    
    # Active contacts (with recent interactions)
    active_contacts = db.session.query(
        func.count(func.distinct(CrmInteraction.contact_id))
    ).filter(
        CrmInteraction.startup_id == startup_id,
        CrmInteraction.interaction_date >= cutoff_date,
        CrmInteraction.contact_id.isnot(None)
    ).scalar() or 0
    
    return {
        'total_interactions': total_interactions,
        'interactions_by_type': by_type,
        'active_contacts': active_contacts,
        'avg_interactions_per_day': round(total_interactions / days, 1)
    }

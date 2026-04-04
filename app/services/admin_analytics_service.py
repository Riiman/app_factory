"""
Admin Analytics Service
Aggregates analytics across multiple startups for admin dashboard.
This service ONLY calls existing analytics functions without modifying them.
"""

from app.extensions import db
from app.models import Startup
from app.services.executive_analytics_service import calculate_executive_summary


def calculate_portfolio_metrics(organization_id):
    """
    Calculate aggregated portfolio metrics for all startups in an organization.
    
    Args:
        organization_id: ID of the organization (None for super admin to see all)
    
    Returns:
        Dictionary with aggregated portfolio metrics
    """
    
    # Get all startups for the organization
    query = Startup.query
    if organization_id and organization_id != 1:  # Filter by org unless super admin
        query = query.filter(Startup.organization_id == organization_id)
    
    startups = query.all()
    
    if not startups:
        return _get_empty_portfolio_metrics()
    
    # Aggregate metrics across all startups
    total_revenue = 0
    total_burn = 0
    total_cash = 0
    total_customers = 0
    total_mrr = 0
    total_pipeline_value = 0
    
    startup_health_counts = {
        'healthy': 0,
        'warning': 0,
        'critical': 0
    }
    
    startup_summaries = []
    successful_startups = 0  # Track startups with valid data
    
    for startup in startups:
        try:
            # Call existing analytics function for each startup
            summary = calculate_executive_summary(startup.id)
            
            # Only count startups that have valid data
            if not summary or not summary.get('financial_health'):
                print(f"Skipping startup {startup.id} - no valid analytics data")
                continue
            
            successful_startups += 1
            
            # Aggregate financial metrics
            total_revenue += summary['financial_health'].get('total_revenue', 0)
            total_burn += summary['financial_health'].get('burn_rate', 0)
            total_cash += summary['financial_health'].get('cash_balance', 0)
            
            # Aggregate growth metrics
            total_customers += summary['growth_metrics'].get('customer_count', 0)
            total_mrr += summary['growth_metrics'].get('mrr', 0)
            total_pipeline_value += summary['growth_metrics'].get('total_pipeline_value', 0)
            
            # Determine startup health based on alerts
            critical_alerts = [a for a in summary.get('alerts', []) if a.get('type') == 'critical']
            warning_alerts = [a for a in summary.get('alerts', []) if a.get('type') == 'warning']
            
            if critical_alerts:
                startup_health_counts['critical'] += 1
                health_status = 'critical'
            elif warning_alerts:
                startup_health_counts['warning'] += 1
                health_status = 'warning'
            else:
                startup_health_counts['healthy'] += 1
                health_status = 'healthy'
            
            # Store summary for ranking
            startup_summaries.append({
                'startup_id': startup.id,
                'startup_name': startup.name,
                'health_status': health_status,
                'revenue': summary['financial_health'].get('total_revenue', 0),
                'burn_rate': summary['financial_health'].get('burn_rate', 0),
                'runway_months': summary['financial_health'].get('runway_months', 0),
                'customer_count': summary['growth_metrics'].get('customer_count', 0),
                'mrr': summary['growth_metrics'].get('mrr', 0),
                'alerts': summary.get('alerts', [])
            })
            
        except Exception as e:
            # Log error but continue with other startups
            print(f"Error calculating analytics for startup {startup.id} ({startup.name}): {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    # Calculate averages - use successful_startups count
    average_runway = total_cash / total_burn if total_burn > 0 else 0
    
    return {
        'total_revenue': total_revenue,
        'total_burn': total_burn,
        'total_cash': total_cash,
        'average_runway': average_runway,
        'total_customers': total_customers,
        'total_mrr': total_mrr,
        'total_pipeline_value': total_pipeline_value,
        'total_startups': successful_startups,  # Only count startups with data
        'healthy_startups': startup_health_counts['healthy'],
        'warning_startups': startup_health_counts['warning'],
        'critical_startups': startup_health_counts['critical'],
        'startup_summaries': startup_summaries
    }


def get_startup_rankings(organization_id, metric='revenue', limit=10):
    """
    Get top startups ranked by a specific metric.
    
    Args:
        organization_id: ID of the organization (None for super admin)
        metric: Metric to rank by ('revenue', 'growth', 'customers', 'mrr')
        limit: Number of top startups to return
    
    Returns:
        List of startups ranked by the specified metric
    """
    
    portfolio = calculate_portfolio_metrics(organization_id)
    startup_summaries = portfolio.get('startup_summaries', [])
    
    # Sort by the specified metric
    metric_key_map = {
        'revenue': 'revenue',
        'customers': 'customer_count',
        'mrr': 'mrr',
        'burn': 'burn_rate'
    }
    
    sort_key = metric_key_map.get(metric, 'revenue')
    
    # Sort in descending order (except for burn rate where lower is better)
    reverse = metric != 'burn'
    sorted_startups = sorted(
        startup_summaries,
        key=lambda x: x.get(sort_key, 0),
        reverse=reverse
    )
    
    # Add rank
    rankings = []
    for idx, startup in enumerate(sorted_startups[:limit], 1):
        rankings.append({
            'rank': idx,
            'startup_id': startup['startup_id'],
            'startup_name': startup['startup_name'],
            'metric_value': startup.get(sort_key, 0),
            'health_status': startup['health_status']
        })
    
    return rankings


def get_organization_alerts(organization_id):
    """
    Get all critical alerts across the organization.
    
    Args:
        organization_id: ID of the organization (None for super admin)
    
    Returns:
        List of alerts sorted by priority
    """
    
    portfolio = calculate_portfolio_metrics(organization_id)
    startup_summaries = portfolio.get('startup_summaries', [])
    
    all_alerts = []
    
    for startup in startup_summaries:
        for alert in startup.get('alerts', []):
            all_alerts.append({
                **alert,
                'startup_id': startup['startup_id'],
                'startup_name': startup['startup_name']
            })
    
    # Sort by priority (lower number = higher priority)
    all_alerts.sort(key=lambda x: x.get('priority', 999))
    
    return all_alerts


def _get_empty_portfolio_metrics():
    """Return empty portfolio metrics when no startups exist."""
    return {
        'total_revenue': 0,
        'total_burn': 0,
        'total_cash': 0,
        'average_runway': 0,
        'total_customers': 0,
        'total_mrr': 0,
        'total_pipeline_value': 0,
        'total_startups': 0,
        'healthy_startups': 0,
        'warning_startups': 0,
        'critical_startups': 0,
        'startup_summaries': []
    }

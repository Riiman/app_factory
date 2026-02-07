"""
Product Analytics Service
Provides aggregated analytics and metrics for product planning and management
"""

from datetime import datetime, timedelta
from sqlalchemy import func, case
from app.extensions import db
from app.models import Product, Feature, FeatureStatus, Sprint, Release


def calculate_product_overview(startup_id):
    """
    Calculate comprehensive product overview metrics for a startup
    """
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f'Calculating product overview for startup_id: {startup_id}')
    
    # Get all products for this startup
    products = Product.query.filter_by(startup_id=startup_id).all()
    product_ids = [p.id for p in products]
    logger.info(f'Found {len(products)} products: {[p.name for p in products]}')
    
    # Total products count
    total_products = len(products)
    
    # Feature metrics
    total_features = Feature.query.join(Product).filter(
        Product.startup_id == startup_id
    ).count()
    logger.info(f'Total features: {total_features}')
    
    completed_features = Feature.query.join(Product).filter(
        Product.startup_id == startup_id,
        Feature.status.in_([FeatureStatus.DONE, FeatureStatus.SHIPPED])
    ).count()
    logger.info(f'Completed features: {completed_features}')
    
    completion_rate = (completed_features / total_features * 100) if total_features > 0 else 0
    
    # Sprint metrics
    active_sprints = Sprint.query.filter(
        Sprint.startup_id == startup_id,
        Sprint.status == 'ACTIVE'
    ).count()
    logger.info(f'Active sprints: {active_sprints}')
    
    # Release metrics
    upcoming_releases = Release.query.join(Product).filter(
        Product.startup_id == startup_id,
        Release.status.in_(['PLANNED', 'IN_PROGRESS']),
        Release.target_date >= datetime.utcnow().date()
    ).count()
    logger.info(f'Upcoming releases: {upcoming_releases}')
    
    # Average RICE score
    avg_rice = db.session.query(
        func.avg(Feature.rice_score)
    ).join(Product).filter(
        Product.startup_id == startup_id,
        Feature.rice_score.isnot(None)
    ).scalar() or 0
    
    result = {
        'total_products': total_products,
        'total_features': total_features,
        'completed_features': completed_features,
        'completion_rate': round(completion_rate, 1),
        'active_sprints': active_sprints,
        'upcoming_releases': upcoming_releases,
        'avg_rice_score': round(avg_rice, 2)
    }
    logger.info(f'Result: {result}')
    return result



def calculate_feature_distribution(startup_id):
    """
    Calculate feature distribution by status
    """
    
    distribution = db.session.query(
        Feature.status,
        func.count(Feature.id).label('count')
    ).join(Product).filter(
        Product.startup_id == startup_id
    ).group_by(Feature.status).all()
    
    return [
        {
            'status': row.status.value if hasattr(row.status, 'value') else str(row.status),
            'count': row.count
        }
        for row in distribution
    ]


def calculate_sprint_velocity(startup_id, limit=6):
    """
    Calculate sprint velocity (features completed per sprint) for recent sprints
    """
    
    # Get completed sprints
    sprints = Sprint.query.filter(
        Sprint.startup_id == startup_id,
        Sprint.status == 'COMPLETED'
    ).order_by(Sprint.end_date.desc()).limit(limit).all()
    
    velocity_data = []
    for sprint in reversed(sprints):  # Reverse to show chronologically
        completed_count = Feature.query.filter(
            Feature.sprint_id == sprint.id,
            Feature.status.in_([FeatureStatus.DONE, FeatureStatus.SHIPPED])
        ).count()
        
        velocity_data.append({
            'sprint_name': sprint.name,
            'sprint_id': sprint.id,
            'start_date': sprint.start_date.isoformat() if sprint.start_date else None,
            'end_date': sprint.end_date.isoformat() if sprint.end_date else None,
            'features_completed': completed_count,
            'capacity': sprint.capacity or 0
        })
    
    return velocity_data


def calculate_release_timeline(startup_id):
    """
    Get upcoming and recent releases with their status
    """
    
    # Get upcoming releases
    upcoming = Release.query.join(Product).filter(
        Product.startup_id == startup_id,
        Release.target_date >= datetime.utcnow().date()
    ).order_by(Release.target_date.asc()).limit(5).all()
    
    # Get recent releases
    recent = Release.query.join(Product).filter(
        Product.startup_id == startup_id,
        Release.actual_date.isnot(None)
    ).order_by(Release.actual_date.desc()).limit(5).all()
    
    def serialize_release(release):
        # Count features in this release
        feature_count = Feature.query.filter_by(release_id=release.id).count()
        completed_features = Feature.query.filter(
            Feature.release_id == release.id,
            Feature.status.in_([FeatureStatus.DONE, FeatureStatus.SHIPPED])
        ).count()
        
        return {
            'id': release.id,
            'version': release.version,
            'name': release.name,
            'target_date': release.target_date.isoformat() if release.target_date else None,
            'actual_date': release.actual_date.isoformat() if release.actual_date else None,
            'status': release.status,
            'feature_count': feature_count,
            'completed_features': completed_features,
            'product_id': release.product_id
        }
    
    return {
        'upcoming': [serialize_release(r) for r in upcoming],
        'recent': [serialize_release(r) for r in recent]
    }


def calculate_product_health(startup_id):
    """
    Calculate product health indicators
    """
    
    # Critical bugs (if ProductIssue model exists)
    try:
        from app.models import ProductIssue
        critical_bugs = ProductIssue.query.join(Product).filter(
            Product.startup_id == startup_id,
            ProductIssue.severity == 'critical',
            ProductIssue.status != 'Resolved'
        ).count()
    except ImportError:
        critical_bugs = 0
    
    # Overdue features (features in progress past their sprint end date)
    overdue_features = db.session.query(Feature).join(Sprint).join(Product).filter(
        Product.startup_id == startup_id,
        Feature.status.in_([FeatureStatus.IN_PROGRESS, FeatureStatus.IN_REVIEW]),
        Sprint.end_date < datetime.utcnow().date()
    ).count()
    
    # Stale features (in backlog for more than 90 days)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    stale_features = Feature.query.join(Product).filter(
        Product.startup_id == startup_id,
        Feature.status == FeatureStatus.BACKLOG,
        Feature.created_at < ninety_days_ago
    ).count()
    
    # Calculate health score (0-100)
    health_score = 100
    health_score -= min(critical_bugs * 10, 30)  # Max -30 for bugs
    health_score -= min(overdue_features * 5, 30)  # Max -30 for overdue
    health_score -= min(stale_features * 2, 20)  # Max -20 for stale
    
    return {
        'health_score': max(0, health_score),
        'critical_bugs': critical_bugs,
        'overdue_features': overdue_features,
        'stale_features': stale_features
    }


def get_recent_activity(startup_id, limit=10):
    """
    Get recent product-related activity
    """
    
    # Recently completed features
    recent_features = Feature.query.join(Product).filter(
        Product.startup_id == startup_id,
        Feature.status.in_([FeatureStatus.DONE, FeatureStatus.SHIPPED])
    ).order_by(Feature.created_at.desc()).limit(limit).all()
    
    activities = []
    for feature in recent_features:
        activities.append({
            'type': 'feature_completed',
            'title': feature.name,
            'product_id': feature.product_id,
            'date': feature.created_at.isoformat() if feature.created_at else None
        })
    
    # Recent releases
    recent_releases = Release.query.join(Product).filter(
        Product.startup_id == startup_id,
        Release.actual_date.isnot(None)
    ).order_by(Release.actual_date.desc()).limit(5).all()
    
    for release in recent_releases:
        activities.append({
            'type': 'release_shipped',
            'title': f'{release.version} - {release.name}',
            'product_id': release.product_id,
            'date': release.actual_date.isoformat() if release.actual_date else None
        })
    
    # Sort by date and limit
    activities.sort(key=lambda x: x.get('date', ''), reverse=True)
    return activities[:limit]

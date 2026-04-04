"""
Feature Status Synchronization Utility

This module provides utilities to sync feature statuses in the SQL database
based on mission statuses in missions.json.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def sync_feature_status_from_mission(mission_id: int, mission_status: str, feature_id: Optional[str] = None):
    """
    Synchronizes a feature's status in the database based on its mission status.
    
    This should be called whenever a mission status changes to ensure the UI
    reflects the current state immediately.
    
    Args:
        mission_id: The ID of the mission that changed
        mission_status: The new status of the mission (pending, in_progress, completed, etc.)
        feature_id: Optional feature ID. If not provided, will be looked up from missions.json
    """
    try:
        from app.models import Feature, FeatureStatus
        from app.extensions import db
        
        # If feature_id not provided, we can't sync
        if not feature_id:
            logger.debug(f"No feature_id for mission {mission_id}, skipping feature sync")
            return
            
        # Skip virtual/system features
        if feature_id in ["PREVIEW_LAUNCH", None]:
            return
            
        # Get the feature from database
        feature = Feature.query.get(feature_id)
        if not feature:
            logger.warning(f"Feature {feature_id} not found in database")
            return
            
        # Determine target status based on mission status
        target_status = None
        
        if mission_status == "completed":
            # Check if ALL missions for this feature are completed
            # For now, we'll set to completed and let the aggregator fix it if needed
            target_status = FeatureStatus.COMPLETED
        elif mission_status in ["in_progress", "coding", "verification", "architecting", "fix_required"]:
            target_status = FeatureStatus.IN_PROGRESS
        elif mission_status == "pending":
            # Only set to pending if feature is currently pending
            # Don't downgrade from in_progress to pending
            if feature.status == FeatureStatus.PENDING:
                target_status = FeatureStatus.PENDING
        
        # Update if changed
        if target_status and feature.status != target_status:
            old_status = feature.status
            feature.status = target_status
            db.session.commit()
            logger.info(f"Feature sync: Updated {feature.name} ({feature_id}) from {old_status.value} to {target_status.value} (mission {mission_id} -> {mission_status})")
        else:
            logger.debug(f"Feature {feature.name} already at correct status {feature.status.value}")
            
    except Exception as e:
        logger.error(f"Failed to sync feature status for mission {mission_id}: {e}")
        # Don't raise - this is a non-critical sync operation


def sync_all_feature_statuses_from_missions(startup_id: str):
    """
    Performs a full sync of all feature statuses based on missions.json.
    
    This is the comprehensive sync that aggregates all missions per feature
    and determines the correct status. Should be called periodically or when
    resuming work.
    
    Args:
        startup_id: The startup ID to sync features for
    """
    try:
        from app.models import Feature, FeatureStatus
        from app.extensions import db
        from app.manager import DockerManager
        import json
        
        manager = DockerManager()
        
        # Read missions from file
        res = manager.read_file(startup_id, "artifacts/missions.json")
        if res.get("error"):
            logger.warning(f"Could not read missions.json for feature sync: {res.get('error')}")
            return
            
        data = json.loads(res["content"])
        missions = data.get("missions", [])
        
        # Aggregate statuses per feature ID
        feature_map = {}  # fid -> list of mission_statuses
        
        for m in missions:
            fid = m.get("feature_id")
            status = m.get("status")
            if fid and status:
                if fid not in feature_map:
                    feature_map[fid] = []
                feature_map[fid].append(status)
        
        # Update each feature
        dirty = False
        for fid, statuses in feature_map.items():
            # Skip virtual features
            if fid in ["PREVIEW_LAUNCH", None]:
                continue
                
            target_db_status = FeatureStatus.PENDING
            
            # Rule 1: If ALL completed -> Completed
            if all(s == "completed" for s in statuses):
                target_db_status = FeatureStatus.COMPLETED
            # Rule 2: If ANY in progress/active -> In Progress
            elif any(s in ["in_progress", "coding", "verification", "architecting", "fix_required"] for s in statuses):
                target_db_status = FeatureStatus.IN_PROGRESS
            # Rule 3: Else (some completed, some pending, but none active) -> In Progress
            # (Because if you finished one mission, you technically started the feature)
            elif any(s == "completed" for s in statuses):
                target_db_status = FeatureStatus.IN_PROGRESS
                
            f = Feature.query.get(fid)
            if f and f.status != target_db_status:
                old_status = f.status
                f.status = target_db_status
                dirty = True
                logger.info(f"Full sync: Updated Feature {f.name} ({fid}) from {old_status.value} to {target_db_status.value}")
        
        if dirty:
            db.session.commit()
            logger.info("Feature status full sync completed")
        else:
            logger.debug("No feature status changes needed in full sync")
            
    except Exception as e:
        logger.error(f"Failed to perform full feature sync: {e}")

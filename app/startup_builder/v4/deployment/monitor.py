"""
V4 Monitoring System

Monitors V4 system performance and health.
"""

import logging
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class V4Monitor:
    """
    Monitors V4 system metrics.
    
    Tracks:
    - Success/failure rates
    - Execution times
    - Cost tracking
    - Circuit breaker activations
    - Healing effectiveness
    """
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.start_time = datetime.utcnow()
    
    def record_mission(
        self,
        mission_id: str,
        success: bool,
        execution_time: float,
        cost: float,
        quality_score: float
    ):
        """Record mission execution"""
        self.metrics['missions'].append({
            'mission_id': mission_id,
            'success': success,
            'execution_time': execution_time,
            'cost': cost,
            'quality_score': quality_score,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def record_circuit_breaker(self, breaker_type: str, tool_name: str):
        """Record circuit breaker activation"""
        self.metrics['circuit_breakers'].append({
            'type': breaker_type,
            'tool': tool_name,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def record_healing(self, error_type: str, success: bool, confidence: float):
        """Record healing attempt"""
        self.metrics['healing'].append({
            'error_type': error_type,
            'success': success,
            'confidence': confidence,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def get_stats(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """
        Get system statistics.
        
        Args:
            time_window_hours: Time window for stats
            
        Returns:
            Statistics dictionary
        """
        cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)
        
        # Filter metrics by time window
        recent_missions = [
            m for m in self.metrics['missions']
            if datetime.fromisoformat(m['timestamp']) > cutoff
        ]
        
        recent_healing = [
            h for h in self.metrics['healing']
            if datetime.fromisoformat(h['timestamp']) > cutoff
        ]
        
        recent_breakers = [
            b for b in self.metrics['circuit_breakers']
            if datetime.fromisoformat(b['timestamp']) > cutoff
        ]
        
        # Calculate stats
        total_missions = len(recent_missions)
        successful_missions = sum(1 for m in recent_missions if m['success'])
        
        stats = {
            'time_window_hours': time_window_hours,
            'missions': {
                'total': total_missions,
                'successful': successful_missions,
                'failed': total_missions - successful_missions,
                'success_rate': successful_missions / total_missions if total_missions > 0 else 0,
                'avg_execution_time': sum(m['execution_time'] for m in recent_missions) / total_missions if total_missions > 0 else 0,
                'avg_cost': sum(m['cost'] for m in recent_missions) / total_missions if total_missions > 0 else 0,
                'avg_quality_score': sum(m['quality_score'] for m in recent_missions) / total_missions if total_missions > 0 else 0
            },
            'healing': {
                'total_attempts': len(recent_healing),
                'successful': sum(1 for h in recent_healing if h['success']),
                'avg_confidence': sum(h['confidence'] for h in recent_healing) / len(recent_healing) if recent_healing else 0
            },
            'circuit_breakers': {
                'total_activations': len(recent_breakers),
                'by_type': self._count_by_field(recent_breakers, 'type')
            },
            'uptime_hours': (datetime.utcnow() - self.start_time).total_seconds() / 3600
        }
        
        return stats
    
    def _count_by_field(self, items: List[Dict], field: str) -> Dict[str, int]:
        """Count items by field value"""
        counts = defaultdict(int)
        for item in items:
            counts[item[field]] += 1
        return dict(counts)
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get current health status.
        
        Returns:
            Health status
        """
        stats = self.get_stats(time_window_hours=1)  # Last hour
        
        # Determine health
        success_rate = stats['missions']['success_rate']
        
        if success_rate >= 0.9:
            health = 'healthy'
        elif success_rate >= 0.7:
            health = 'degraded'
        else:
            health = 'critical'
        
        return {
            'status': health,
            'success_rate': success_rate,
            'circuit_breaker_activations': stats['circuit_breakers']['total_activations'],
            'healing_success_rate': stats['healing']['successful'] / stats['healing']['total_attempts'] if stats['healing']['total_attempts'] > 0 else 0,
            'timestamp': datetime.utcnow().isoformat()
        }

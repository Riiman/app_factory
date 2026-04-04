"""
Resource Monitor for V4 Autonomous System

Tracks resource usage and provides warnings before limits are reached.
"""

import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ResourceUsage:
    """Current resource usage snapshot"""
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    elapsed_seconds: float
    timestamp: float


class ResourceMonitor:
    """
    Monitors system resource usage.
    
    Provides early warnings before circuit breakers trip.
    """
    
    def __init__(self):
        self.start_time: Optional[float] = None
        self.has_psutil = self._check_psutil()
    
    def _check_psutil(self) -> bool:
        """Check if psutil is available"""
        try:
            import psutil
            return True
        except ImportError:
            logger.warning("psutil not available - resource monitoring disabled")
            return False
    
    def start(self) -> None:
        """Start monitoring"""
        self.start_time = time.time()
    
    def get_usage(self) -> ResourceUsage:
        """Get current resource usage"""
        
        if not self.has_psutil:
            return ResourceUsage(
                cpu_percent=0.0,
                memory_mb=0.0,
                memory_percent=0.0,
                elapsed_seconds=self._get_elapsed(),
                timestamp=time.time()
            )
        
        try:
            import psutil
            process = psutil.Process()
            
            # Get memory info
            mem_info = process.memory_info()
            memory_mb = mem_info.rss / 1024 / 1024
            
            # Get system memory for percentage
            system_mem = psutil.virtual_memory()
            memory_percent = (mem_info.rss / system_mem.total) * 100
            
            # Get CPU usage
            cpu_percent = process.cpu_percent(interval=0.1)
            
            return ResourceUsage(
                cpu_percent=cpu_percent,
                memory_mb=memory_mb,
                memory_percent=memory_percent,
                elapsed_seconds=self._get_elapsed(),
                timestamp=time.time()
            )
        
        except Exception as e:
            logger.error(f"Failed to get resource usage: {e}")
            return ResourceUsage(
                cpu_percent=0.0,
                memory_mb=0.0,
                memory_percent=0.0,
                elapsed_seconds=self._get_elapsed(),
                timestamp=time.time()
            )
    
    def get_warnings(self, usage: ResourceUsage) -> list[str]:
        """Get warning messages for high resource usage"""
        warnings = []
        
        if usage.memory_mb > 1500:  # 75% of 2GB limit
            warnings.append(f"High memory usage: {usage.memory_mb:.1f}MB (limit: 2048MB)")
        
        if usage.cpu_percent > 75:
            warnings.append(f"High CPU usage: {usage.cpu_percent:.1f}%")
        
        if usage.elapsed_seconds > 240:  # 80% of 5 min limit
            warnings.append(f"Task running long: {usage.elapsed_seconds:.1f}s (limit: 300s)")
        
        return warnings
    
    def _get_elapsed(self) -> float:
        """Get elapsed time since start"""
        if not self.start_time:
            return 0.0
        return time.time() - self.start_time
    
    def reset(self) -> None:
        """Reset the monitor"""
        self.start_time = None

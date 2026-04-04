"""
Strategy Memory for V4 Autonomous System

Tracks failed strategies and prevents retrying approaches that already failed.
Learns from failures to avoid repeating mistakes.
"""

import json
import logging
import hashlib
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class FailedStrategy:
    """Represents a failed strategy attempt"""
    strategy_signature: str
    tool_name: str
    args: dict
    error_type: str
    error_message: str
    timestamp: str
    attempt_number: int


class StrategyMemory:
    """
    Tracks failed strategies to prevent retrying them.
    
    Maintains a memory of what approaches have been tried and failed,
    preventing the agent from repeating the same mistakes.
    """
    
    def __init__(self):
        self.failed_strategies: Set[str] = set()
        self.failure_details: List[FailedStrategy] = []
        self.strategy_patterns: Dict[str, int] = {}  # pattern -> failure count
    
    def record_failure(
        self,
        tool_name: str,
        args: dict,
        error_type: str,
        error_message: str,
        attempt_number: int
    ) -> None:
        """Record a failed strategy"""
        
        # Create strategy signature
        signature = self._make_signature(tool_name, args)
        
        # Add to failed set
        self.failed_strategies.add(signature)
        
        # Store details
        failure = FailedStrategy(
            strategy_signature=signature,
            tool_name=tool_name,
            args=args,
            error_type=error_type,
            error_message=error_message,
            timestamp=datetime.now().isoformat(),
            attempt_number=attempt_number
        )
        self.failure_details.append(failure)
        
        # Track pattern
        pattern = self._extract_pattern(tool_name, args)
        self.strategy_patterns[pattern] = self.strategy_patterns.get(pattern, 0) + 1
        
        logger.info(f"Recorded failed strategy: {signature}")
    
    def is_blocked(self, tool_name: str, args: dict) -> tuple[bool, str]:
        """
        Check if this strategy has already failed.
        
        Returns:
            (is_blocked, reason)
        """
        signature = self._make_signature(tool_name, args)
        
        if signature in self.failed_strategies:
            # Find the failure details
            for failure in self.failure_details:
                if failure.strategy_signature == signature:
                    reason = (
                        f"Strategy already failed in attempt #{failure.attempt_number}: "
                        f"{failure.error_type} - {failure.error_message[:100]}"
                    )
                    return True, reason
            
            return True, f"Strategy '{signature}' already failed"
        
        # Check for similar patterns
        pattern = self._extract_pattern(tool_name, args)
        if self.strategy_patterns.get(pattern, 0) >= 3:
            return True, f"Similar strategy pattern '{pattern}' failed {self.strategy_patterns[pattern]} times"
        
        return False, ""
    
    def get_llm_guidance(self) -> str:
        """
        Generate guidance for LLM about blocked strategies.
        
        Returns formatted text to inject into system prompt.
        """
        if not self.failed_strategies:
            return ""
        
        guidance_parts = [
            "\n## ⚠️ BLOCKED STRATEGIES - DO NOT RETRY\n",
            "The following approaches have ALREADY FAILED. You MUST try something different:\n"
        ]
        
        # Group by tool
        by_tool: Dict[str, List[FailedStrategy]] = {}
        for failure in self.failure_details:
            if failure.tool_name not in by_tool:
                by_tool[failure.tool_name] = []
            by_tool[failure.tool_name].append(failure)
        
        # Format by tool
        for tool_name, failures in by_tool.items():
            guidance_parts.append(f"\n### ❌ {tool_name}")
            for failure in failures:
                args_summary = self._summarize_args(failure.args)
                guidance_parts.append(
                    f"- Attempt #{failure.attempt_number}: {args_summary} "
                    f"→ {failure.error_type}"
                )
        
        guidance_parts.append(
            "\n**CRITICAL**: You MUST use a FUNDAMENTALLY DIFFERENT approach. "
            "If stuck, call `run_diagnosis` for expert analysis.\n"
        )
        
        return "\n".join(guidance_parts)
    
    def get_failure_summary(self) -> Dict[str, Any]:
        """Get summary of all failures"""
        return {
            'total_failures': len(self.failure_details),
            'unique_strategies': len(self.failed_strategies),
            'by_tool': self._group_by_tool(),
            'by_error_type': self._group_by_error_type(),
            'patterns': dict(self.strategy_patterns)
        }
    
    def clear(self) -> None:
        """Clear all failure memory"""
        self.failed_strategies.clear()
        self.failure_details.clear()
        self.strategy_patterns.clear()
        logger.info("Strategy memory cleared")
    
    def _make_signature(self, tool_name: str, args: dict) -> str:
        """Create unique signature for a strategy"""
        try:
            # Normalize args for consistent hashing
            normalized = self._normalize_args(args)
            args_str = json.dumps(normalized, sort_keys=True)
            args_hash = hashlib.md5(args_str.encode()).hexdigest()[:8]
            return f"{tool_name}:{args_hash}"
        except:
            return f"{tool_name}:{str(args)[:50]}"
    
    def _extract_pattern(self, tool_name: str, args: dict) -> str:
        """Extract high-level pattern from strategy"""
        
        # For specific tools, extract key parameters
        if tool_name == "stop_process":
            alias = args.get('alias', 'unknown')
            return f"stop_process:alias={alias}"
        
        elif tool_name == "ensure_server_running":
            port = args.get('port', 'unknown')
            return f"ensure_server:port={port}"
        
        elif tool_name == "run_shell":
            command = args.get('command', '')
            # Extract base command
            base_cmd = command.split()[0] if command else 'unknown'
            return f"run_shell:cmd={base_cmd}"
        
        elif tool_name == "update_file":
            path = args.get('path', 'unknown')
            return f"update_file:path={path}"
        
        else:
            return f"{tool_name}:generic"
    
    def _normalize_args(self, args: dict) -> dict:
        """Normalize arguments for consistent comparison"""
        normalized = {}
        for key, value in args.items():
            # Truncate long strings
            if isinstance(value, str) and len(value) > 100:
                normalized[key] = value[:100] + "..."
            else:
                normalized[key] = value
        return normalized
    
    def _summarize_args(self, args: dict) -> str:
        """Create human-readable summary of arguments"""
        key_args = []
        
        # Extract most important args
        important_keys = ['alias', 'port', 'command', 'path', 'file']
        for key in important_keys:
            if key in args:
                value = args[key]
                if isinstance(value, str) and len(value) > 50:
                    value = value[:50] + "..."
                key_args.append(f"{key}={value}")
        
        if key_args:
            return ", ".join(key_args)
        else:
            return str(args)[:100]
    
    def _group_by_tool(self) -> Dict[str, int]:
        """Group failures by tool name"""
        by_tool = {}
        for failure in self.failure_details:
            by_tool[failure.tool_name] = by_tool.get(failure.tool_name, 0) + 1
        return by_tool
    
    def _group_by_error_type(self) -> Dict[str, int]:
        """Group failures by error type"""
        by_error = {}
        for failure in self.failure_details:
            by_error[failure.error_type] = by_error.get(failure.error_type, 0) + 1
        return by_error


class StrategyBlocker:
    """
    Analyzes failed attempts and generates blocking rules.
    
    Works with existing failed_attempts structure from V3.
    """
    
    def __init__(self, failed_attempts: List[dict]):
        self.failed_attempts = failed_attempts
        self.blocked_strategies: Set[str] = set()
        self._analyze_failures()
    
    def _analyze_failures(self) -> None:
        """Analyze failed attempts to build blocked set"""
        for attempt in self.failed_attempts:
            tool = attempt.get('action', '')
            command = str(attempt.get('command', ''))
            
            # Extract strategy signature
            signature = self._extract_signature(tool, command)
            if signature:
                self.blocked_strategies.add(signature)
    
    def _extract_signature(self, tool: str, command: str) -> Optional[str]:
        """Extract strategy signature from tool and command"""
        
        # stop_process
        if 'stop_process' in tool:
            import re
            match = re.search(r"'alias':\s*'([^']+)'", command)
            if match:
                return f"stop_process:alias={match.group(1)}"
        
        # ensure_server_running
        elif 'ensure_server_running' in tool:
            import re
            match = re.search(r"'port':\s*(\d+)", command)
            if match:
                return f"ensure_server:port={match.group(1)}"
        
        # run_shell
        elif 'run_shell' in tool:
            import re
            match = re.search(r"'command':\s*'([^']+)'", command)
            if match:
                cmd = match.group(1)
                base_cmd = cmd.split()[0] if cmd else ''
                if base_cmd:
                    return f"run_shell:cmd={base_cmd}"
        
        return None
    
    def is_blocked(self, strategy: str) -> bool:
        """Check if strategy is blocked"""
        return strategy in self.blocked_strategies
    
    def get_guidance(self) -> str:
        """Generate LLM guidance about blocked strategies"""
        if not self.blocked_strategies:
            return ""
        
        return f"""
## ⚠️ BLOCKED STRATEGIES

The following approaches have ALREADY FAILED. DO NOT RETRY THEM:

{chr(10).join(f"❌ {s}" for s in sorted(self.blocked_strategies))}

You MUST use a DIFFERENT approach than the ones listed above.
If you're stuck, call the `run_diagnosis` tool for help.
"""

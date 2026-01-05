"""
Cost Tracker for V4 Autonomous System

Tracks LLM API costs and provides budget management.
"""

import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class LLMCall:
    """Record of an LLM API call"""
    timestamp: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    purpose: str  # e.g., "code_generation", "verification", "diagnosis"


@dataclass
class CostBudget:
    """Budget configuration"""
    per_task_usd: float = 5.0
    per_mission_usd: float = 50.0
    per_day_usd: float = 500.0


class CostTracker:
    """
    Tracks LLM API costs and enforces budgets.
    
    Provides cost visibility and prevents runaway spending.
    """
    
    def __init__(self, budget: Optional[CostBudget] = None):
        self.budget = budget or CostBudget()
        self.calls: List[LLMCall] = []
        self.total_cost = 0.0
        
        # Pricing (approximate, update as needed)
        self.pricing = {
            'gpt-4': {'input': 0.03 / 1000, 'output': 0.06 / 1000},
            'gpt-4-turbo': {'input': 0.01 / 1000, 'output': 0.03 / 1000},
            'gpt-3.5-turbo': {'input': 0.0005 / 1000, 'output': 0.0015 / 1000},
            'gemini-pro': {'input': 0.00025 / 1000, 'output': 0.0005 / 1000},
            'gemini-flash': {'input': 0.000125 / 1000, 'output': 0.00025 / 1000},
        }
    
    def record_call(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        purpose: str = "unknown"
    ) -> float:
        """
        Record an LLM call and return its cost.
        
        Returns:
            cost in USD
        """
        # Calculate cost
        cost = self.calculate_cost(model, input_tokens, output_tokens)
        
        # Record call
        call = LLMCall(
            timestamp=datetime.now().isoformat(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
            purpose=purpose
        )
        self.calls.append(call)
        self.total_cost += cost
        
        logger.info(
            f"LLM call recorded: {model} ({input_tokens}+{output_tokens} tokens) "
            f"= ${cost:.4f} (total: ${self.total_cost:.4f})"
        )
        
        return cost
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for a call"""
        
        # Normalize model name
        model_key = self._normalize_model_name(model)
        
        if model_key not in self.pricing:
            logger.warning(f"Unknown model '{model}', using default pricing")
            model_key = 'gpt-3.5-turbo'
        
        pricing = self.pricing[model_key]
        cost = (input_tokens * pricing['input']) + (output_tokens * pricing['output'])
        
        return cost
    
    def check_budget(self) -> tuple[bool, str]:
        """
        Check if budget is exceeded.
        
        Returns:
            (within_budget, message)
        """
        if self.total_cost >= self.budget.per_task_usd:
            return False, f"Task budget exceeded: ${self.total_cost:.2f} / ${self.budget.per_task_usd:.2f}"
        
        return True, f"Within budget: ${self.total_cost:.2f} / ${self.budget.per_task_usd:.2f}"
    
    def get_remaining_budget(self) -> float:
        """Get remaining budget for current task"""
        return max(0, self.budget.per_task_usd - self.total_cost)
    
    def get_stats(self) -> Dict:
        """Get cost statistics"""
        if not self.calls:
            return {
                'total_calls': 0,
                'total_cost': 0.0,
                'total_tokens': 0,
                'by_purpose': {},
                'by_model': {}
            }
        
        # Group by purpose
        by_purpose = {}
        for call in self.calls:
            if call.purpose not in by_purpose:
                by_purpose[call.purpose] = {'calls': 0, 'cost': 0.0, 'tokens': 0}
            by_purpose[call.purpose]['calls'] += 1
            by_purpose[call.purpose]['cost'] += call.cost_usd
            by_purpose[call.purpose]['tokens'] += call.input_tokens + call.output_tokens
        
        # Group by model
        by_model = {}
        for call in self.calls:
            if call.model not in by_model:
                by_model[call.model] = {'calls': 0, 'cost': 0.0, 'tokens': 0}
            by_model[call.model]['calls'] += 1
            by_model[call.model]['cost'] += call.cost_usd
            by_model[call.model]['tokens'] += call.input_tokens + call.output_tokens
        
        total_tokens = sum(c.input_tokens + c.output_tokens for c in self.calls)
        
        return {
            'total_calls': len(self.calls),
            'total_cost': self.total_cost,
            'total_tokens': total_tokens,
            'by_purpose': by_purpose,
            'by_model': by_model,
            'remaining_budget': self.get_remaining_budget()
        }
    
    def reset(self) -> None:
        """Reset the tracker"""
        self.calls.clear()
        self.total_cost = 0.0
        logger.info("Cost tracker reset")
    
    def _normalize_model_name(self, model: str) -> str:
        """Normalize model name for pricing lookup"""
        model_lower = model.lower()
        
        if 'gpt-4-turbo' in model_lower or 'gpt-4-1106' in model_lower:
            return 'gpt-4-turbo'
        elif 'gpt-4' in model_lower:
            return 'gpt-4'
        elif 'gpt-3.5' in model_lower:
            return 'gpt-3.5-turbo'
        elif 'gemini' in model_lower and 'flash' in model_lower:
            return 'gemini-flash'
        elif 'gemini' in model_lower:
            return 'gemini-pro'
        else:
            return model_lower

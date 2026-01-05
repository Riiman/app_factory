"""
Hierarchical Prompt Builder for V4 Autonomous System

Builds structured prompts with 7 levels of context.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PromptContext:
    """Context for prompt building"""
    # Level 1: System Identity
    system_role: str = "Developer Agent"
    capabilities: List[str] = None
    
    # Level 2: Project Context
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    tech_stack: List[str] = None
    
    # Level 3: Mission Context
    mission_type: Optional[str] = None
    mission_goal: Optional[str] = None
    implementation_plan: Optional[str] = None
    
    # Level 4: Task Context
    task_description: Optional[str] = None
    task_requirements: List[str] = None
    
    # Level 5: Failure Context
    failed_attempts: List[Dict] = None
    strategy_guidance: Optional[str] = None
    
    # Level 6: Constraints
    constraints: List[str] = None
    
    # Level 7: Examples
    examples: List[str] = None


class HierarchicalPromptBuilder:
    """
    Builds hierarchical prompts with 7 levels of context.
    
    Levels:
    1. System Identity & Capabilities
    2. Project Context
    3. Mission Context
    4. Task Context
    5. Failure Context (if applicable)
    6. Constraints & Requirements
    7. Examples (few-shot)
    """
    
    def build_prompt(self, context: PromptContext) -> str:
        """
        Build a hierarchical prompt.
        
        Args:
            context: Prompt context with all levels
            
        Returns:
            Complete system prompt
        """
        sections = []
        
        # Level 1: System Identity
        sections.append(self._build_identity(context))
        
        # Level 2: Project Context
        if context.project_name:
            sections.append(self._build_project_context(context))
        
        # Level 3: Mission Context
        if context.mission_type:
            sections.append(self._build_mission_context(context))
        
        # Level 4: Task Context
        if context.task_description:
            sections.append(self._build_task_context(context))
        
        # Level 5: Failure Context
        if context.failed_attempts:
            sections.append(self._build_failure_context(context))
        
        # Level 6: Constraints
        if context.constraints:
            sections.append(self._build_constraints(context))
        
        # Level 7: Examples
        if context.examples:
            sections.append(self._build_examples(context))
        
        return "\n\n".join(sections)
    
    def _build_identity(self, context: PromptContext) -> str:
        """Level 1: System Identity & Capabilities"""
        capabilities = context.capabilities or [
            "Write and edit code in multiple languages",
            "Execute shell commands and manage processes",
            "Read and analyze files",
            "Search for information",
            "Debug and fix errors",
            "Run tests and verify code quality"
        ]
        
        return f"""# {context.system_role}

You are an expert {context.system_role} with the following capabilities:
{chr(10).join(f"- {cap}" for cap in capabilities)}

Your goal is to complete tasks autonomously with high quality and minimal human intervention."""
    
    def _build_project_context(self, context: PromptContext) -> str:
        """Level 2: Project Context"""
        tech_stack = context.tech_stack or []
        
        return f"""## Project Context

**Project:** {context.project_name}
**Description:** {context.project_description or 'N/A'}
**Tech Stack:** {', '.join(tech_stack) if tech_stack else 'N/A'}"""
    
    def _build_mission_context(self, context: PromptContext) -> str:
        """Level 3: Mission Context"""
        return f"""## Mission Context

**Mission Type:** {context.mission_type}
**Goal:** {context.mission_goal or 'N/A'}

{f"**Implementation Plan:**{chr(10)}{context.implementation_plan}" if context.implementation_plan else ""}"""
    
    def _build_task_context(self, context: PromptContext) -> str:
        """Level 4: Task Context"""
        requirements = context.task_requirements or []
        
        return f"""## Current Task

**Description:** {context.task_description}

{f"**Requirements:**{chr(10)}{chr(10).join(f'- {req}' for req in requirements)}" if requirements else ""}"""
    
    def _build_failure_context(self, context: PromptContext) -> str:
        """Level 5: Failure Context"""
        failed_attempts = context.failed_attempts or []
        
        failure_summary = []
        for i, attempt in enumerate(failed_attempts[-3:], 1):  # Last 3 attempts
            error_type = attempt.get('error', {}).get('error_type', 'Unknown')
            error_msg = attempt.get('error', {}).get('error_message', '')
            action = attempt.get('action', 'Unknown')
            
            failure_summary.append(
                f"**Attempt {i}:** {action} → {error_type}: {error_msg[:100]}"
            )
        
        prompt = f"""## ⚠️ Previous Failures

You have attempted this task {len(failed_attempts)} time(s) and failed. Learn from these mistakes:

{chr(10).join(failure_summary)}

**CRITICAL:** Do NOT repeat the same approaches that failed above."""
        
        if context.strategy_guidance:
            prompt += f"\n\n{context.strategy_guidance}"
        
        return prompt
    
    def _build_constraints(self, context: PromptContext) -> str:
        """Level 6: Constraints & Requirements"""
        constraints = context.constraints or []
        
        return f"""## Constraints & Requirements

{chr(10).join(f"- {constraint}" for constraint in constraints)}"""
    
    def _build_examples(self, context: PromptContext) -> str:
        """Level 7: Examples (few-shot)"""
        examples = context.examples or []
        
        return f"""## Examples

{chr(10).join(f"### Example {i+1}{chr(10)}{example}" for i, example in enumerate(examples))}"""
    
    def build_developer_prompt(
        self,
        task: Dict[str, Any],
        mission: Dict[str, Any],
        project_info: Optional[Dict[str, Any]] = None,
        strategy_guidance: Optional[str] = None
    ) -> str:
        """
        Build a prompt specifically for the Developer agent.
        
        Args:
            task: Current task dict
            mission: Current mission dict
            project_info: Optional project information
            strategy_guidance: Optional strategy guidance from safety systems
            
        Returns:
            Complete developer prompt
        """
        context = PromptContext(
            system_role="Senior Software Developer",
            capabilities=[
                "Write production-quality code",
                "Debug complex issues systematically",
                "Execute shell commands safely",
                "Read and analyze codebases",
                "Run tests and verify quality",
                "Self-heal from failures"
            ],
            project_name=project_info.get('name') if project_info else None,
            project_description=project_info.get('description') if project_info else None,
            tech_stack=project_info.get('tech_stack', []) if project_info else None,
            mission_type=mission.get('type'),
            mission_goal=mission.get('description'),
            implementation_plan=mission.get('implementation_plan'),
            task_description=task.get('description'),
            task_requirements=task.get('requirements', []),
            failed_attempts=task.get('failed_attempts', []),
            strategy_guidance=strategy_guidance,
            constraints=[
                "Write clean, maintainable code",
                "Follow best practices and conventions",
                "Add appropriate error handling",
                "Verify your changes work before marking complete",
                "Use existing code patterns when available"
            ]
        )
        
        return self.build_prompt(context)

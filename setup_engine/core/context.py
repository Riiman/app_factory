import dataclasses
from typing import List, Dict, Any, Optional, Set
import json
from datetime import datetime

@dataclasses.dataclass
class KnowledgeNode:
    category: str # e.g., "Regulatory", "Tech", "Market"
    key: str      # e.g., "BVLOS", "Battery Range"
    value: Any    # The actual data
    source: str   # "User", "Inference", "Research"
    confidence: float # 0.0 to 1.0

@dataclasses.dataclass
class Gap:
    description: str
    category: str
    severity: str = "High" # Critical, High, Medium, Low
    
    # Status: "Open", "Discussing", "Confirmed_Missing", "Verified_Present"
    status: str = "Open"
    
    # Drill-down checklist
    required_details: List[str] = dataclasses.field(default_factory=list) 
    gathered_details: Dict[str, str] = dataclasses.field(default_factory=dict)
    
    attempts: int = 0
    last_correction: Optional[str] = None

@dataclasses.dataclass
class Task:
    title: str
    description: str
    priority: str
    status: str = "Pending"

@dataclasses.dataclass
class StartupContext:
    # Basic Info
    name: str
    idea: str
    industry: str
    
    # Dynamic Knowledge
    knowledge_graph: Dict[str, KnowledgeNode] = dataclasses.field(default_factory=dict)
    
    # What we need to find out
    unknowns: List[str] = dataclasses.field(default_factory=list)
    
    # Identified Gaps
    gaps: List[Gap] = dataclasses.field(default_factory=list)
    
    # Output Entities
    entities: Dict[str, List[Any]] = dataclasses.field(default_factory=lambda: {"tasks": [], "products": [], "business_models": []})
    
    # Comprehensive Blueprint
    requirements: List[Dict[str, str]] = dataclasses.field(default_factory=list)
    foundational_questions: List[str] = dataclasses.field(default_factory=list)
    
    # Conversation History
    history: List[Dict[str, str]] = dataclasses.field(default_factory=list)

    def add_knowledge(self, category, key, value, source="System", confidence=1.0):
        self.knowledge_graph[key] = KnowledgeNode(category, key, value, source, confidence)
        
    def get_knowledge(self, key):
        return self.knowledge_graph.get(key)

    def add_gap(self, description, category, severity="High", required_details=None):
        # Avoid duplicates
        for gap in self.gaps:
            if gap.description == description:
                return
        
        new_gap = Gap(description, category, severity)
        if required_details:
            new_gap.required_details = required_details
        self.gaps.append(new_gap)

    def mark_gap_missing(self, description):
        for gap in self.gaps:
            if gap.description == description:
                gap.status = "Confirmed_Missing"

    def mark_gap_verified(self, description):
        for gap in self.gaps:
            if gap.description == description:
                gap.status = "Verified_Present"

    def to_json(self):
        return json.dumps(dataclasses.asdict(self), default=str, indent=4)

class ContextManager:
    def __init__(self, initial_data: Dict[str, Any]):
        self.context = StartupContext(
            name=initial_data.get("startup_name", "Unknown Startup"),
            idea=initial_data.get("product_service_idea", ""),
            industry=initial_data.get("industry", "General")
        )

    def update_from_agent(self, agent_output: Dict[str, Any]):
        """
        Generic handler to merge agent outputs into context.
        """
        if "knowledge" in agent_output:
            for item in agent_output["knowledge"]:
                self.context.add_knowledge(
                    item.get("category", "General"),
                    item["key"],
                    item["value"],
                    item.get("source", "Agent")
                )
        
        if "gaps" in agent_output:
            for gap in agent_output["gaps"]:
                self.context.add_gap(
                    gap["description"], 
                    gap["category"], 
                    gap.get("severity", "High"),
                    gap.get("required_details", [])
                )

        if "tasks" in agent_output:
            for task in agent_output["tasks"]:
                self.context.entities["tasks"].append(Task(**task))
                
        if "requirements" in agent_output:
            self.context.requirements.extend(agent_output["requirements"])
            
        if "foundational_questions" in agent_output:
            self.context.foundational_questions.extend(agent_output["foundational_questions"])

    def get_context(self):
        return self.context

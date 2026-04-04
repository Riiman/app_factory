from typing import Dict, Any, List
import json
from setup_engine.utils.logger import AgentLogger
from setup_engine.providers.llm_provider import LLMProvider
from setup_engine.utils.prompts import ARCHETYPE_SYSTEM_PROMPT

class ArchetypeAgent:
    """
    Simulates an AI Agent that analyzes the startup idea and generates 
    a 'Success Archetype' (a set of Knowledge requirements and Milestones).
    """
    def __init__(self, llm_provider: LLMProvider = None):
        self.llm = llm_provider

    def analyze(self, idea: str, industry: str) -> Dict[str, Any]:
        """
        Input: "Drone delivery for medical"
        Output: { ... }
        """
        AgentLogger.think("ArchetypeAgent", f"Analyzing patterns for idea: '{idea}' in industry: '{industry}'...")

        # --- REAL LLM PATH ---
        if self.llm:
            AgentLogger.think("ArchetypeAgent", "Engaging Neural Engine for deep analysis...")
            prompt = f"Idea: {idea}\nIndustry: {industry}\n\nGenerate the Strategic Blueprint."
            
            response = self.llm.generate(prompt, ARCHETYPE_SYSTEM_PROMPT)
            
            try:
                # Clean markdown code blocks if present
                clean_response = response.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_response)
                AgentLogger.success("Neural Analysis Complete.")
                return data
            except Exception as e:
                AgentLogger.error(f"Failed to parse LLM response: {e}. Falling back to heuristics.")

        # --- MOCK LOGIC (Fallback) ---
        idea_lower = idea.lower()
        output = {"knowledge": [], "gaps": [], "requirements": [], "foundational_questions": []}
        
        # 1. Drone / Logistics logic
        if "drone" in idea_lower:
            AgentLogger.think("ArchetypeAgent", "Detected strong correlation with 'Aviation' and 'Logistics' vectors.")
            AgentLogger.think("ArchetypeAgent", "Matching against 'Logistics_Drone' patterns...")
            output["archetype_name"] = "Logistics_Drone"
            
            # --- BLUEPRINT GENERATION ---
            AgentLogger.think("ArchetypeAgent", "Retrieving regulatory & technical blueprints for drone operations...")

            output["requirements"] = [
                {"category": "Tech", "item": "Long-range Drone Fleet (Custom or Off-the-shelf)"},
                {"category": "Tech", "item": "Ground Control Station (Software)"},
                {"category": "Tech", "item": "Customer Mobile App (Ordering)"},
                {"category": "Regulatory", "item": "BVLOS Approval (O.P.A)"},
                {"category": "Regulatory", "item": "UIN (Unique Identification Number) for each Drone"},
                {"category": "Regulatory", "item": "Third-Party Insurance Policy"},
                {"category": "Ops", "item": "Pilot/Operator Team (Remote)"},
                {"category": "Ops", "item": "Maintenance Crew"},
                {"category": "Ops", "item": "Cold Chain Storage (Hubs)"},
                {"category": "Business", "item": "B2B Contracts (Hospitals/Labs)"}
            ]

            # --- Regulatory ---
            output["knowledge"].append({
                "category": "Regulatory",
                "key": "BVLOS_Status", 
                "value": "Unknown",
                "source": "ArchetypeAgent"
            })
            
            # --- Technical Hardness ---
            output["knowledge"].append({
                "category": "Tech",
                "key": "Drone_Range",
                "value": "Unknown",
                "source": "ArchetypeAgent"
            })
            output["knowledge"].append({
                "category": "Tech",
                "key": "Payload_Capacity",
                "value": "Unknown",
                "source": "ArchetypeAgent"
            })
            
             # --- Business ---
            output["knowledge"].append({
                "category": "Business",
                "key": "Unit_Economics", # Cost per delivery vs Price
                "value": "Unknown",
                "source": "ArchetypeAgent"
            })
            
            # Add Initial Gaps (Assumptions based on difficulty)
            output["gaps"].append({
                "description": "BVLOS_Approval_Needed",
                "category": "Regulatory",
                "severity": "Critical",
                "required_details": ["Application Status", "Approval Date", "Conditions"]
            })
            output["gaps"].append({
                "description": "Validate_Battery_Range_For_Mission",
                "category": "Tech",
                "severity": "High",
                "required_details": ["Battery Chemistry", "Max Flight Time", "Payload Impact"]
            })
            output["gaps"].append({
                "description": "Define_Unit_Economics",
                "category": "Business",
                "severity": "Medium",
                "required_details": ["Cost Per Flight", "Target Price", "Break Even Volume"]
            })
            
            # --- Foundational Questions ---
            output["foundational_questions"] = [
                "Are you a registered Private Limited company?",
                "Do you own the factory or outsource manufacturing?",
                "What is your current bank balance / runway?",
                "What represents your equity split?"
            ]

        # 2. SaaS / Platform logic
        elif "saas" in idea_lower or "platform" in idea_lower:
             output["archetype_name"] = "B2B_SaaS"
             
             output["knowledge"].append({
                "category": "Biz",
                "key": "CAC", 
                "value": "Unknown",
                "source": "ArchetypeAgent"
             })
             
             output["gaps"].append({
                "description": "Define_Pricing_Model",
                "category": "Business",
                "severity": "High"
             })
        
        # 3. Fallback
        else:
             output["archetype_name"] = "General_Startup"
             output["gaps"].append({
                 "description": "Define_MVP",
                 "category": "Product",
                 "severity": "High"
             })

        return output

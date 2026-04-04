from typing import Dict, Any, Optional
import json
from setup_engine.utils.logger import AgentLogger
from setup_engine.providers.llm_provider import LLMProvider
from setup_engine.providers.search_provider import SearchProvider
from setup_engine.utils.prompts import RESEARCH_SYSTEM_PROMPT, VERIFICATION_SYSTEM_PROMPT

class ResearchAgent:
    """
    Simulates an AI Agent that can 'Search the Web' to fill knowledge gaps.
    """
    def __init__(self, llm_provider: LLMProvider = None, search_provider: SearchProvider = None):
        self.llm = llm_provider
        self.search_tool = search_provider

    def research(self, topic: str, context: str = "") -> Optional[Dict[str, Any]]:
        """
        Input: "BVLOS India", Context: "Drone Logistics"
        Output: { "knowledge": [...], "resolved_gaps": [...] }
        """
        topic_lower = topic.lower()
        context_lower = context.lower()
        
        AgentLogger.think("ResearchAgent", f"Formulating search strategy for topic: '{topic}'...")
        
        # --- REAL RAG PATH ---
        if self.llm and self.search_tool:
            AgentLogger.think("ResearchAgent", f"Executing Real Search for '{topic}'...")
            search_query = f"{topic} {context}"
            results = self.search_tool.search(search_query)
            
            if not results:
                 AgentLogger.warning("No search results found.")
                 return None

            AgentLogger.think("ResearchAgent", f"Synthesizing {len(results)} search results...")
            
            # Format results for LLM
            snippets = "\n".join([f"- Title: {r['title']}\n  Snippet: {r['snippet']}\n  Source: {r['source']}" for r in results])
            
            prompt = f"Topic: {topic}\nContext: {context}\n\nSearch Results:\n{snippets}"
            response = self.llm.generate(prompt, RESEARCH_SYSTEM_PROMPT)
            
            try:
                clean = response.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean)
                AgentLogger.success("Research Synthesis Complete.")
                return data
            except Exception as e:
                AgentLogger.error(f"Failed to parse Research LLM response: {e}")
        
        # --- MOCK LOGIC (Fallback) ---
        
        # 1. BVLOS Search (Specific to India)
        if "bvlos" in topic_lower and "india" in context_lower:
            return {
                "knowledge": [{
                    "category": "Regulatory",
                    "key": "BVLOS_India_Regs",
                    "value": "DGCA allows BVLOS trials via Digital Sky Platform. Green zones are easier.",
                    "source": "DGCA Website (Simulated)"
                }],
                "tasks": [{
                    "title": "Register on Digital Sky Platform",
                    "description": "Required for BVLOS trials in India",
                    "priority": "High"
                }]
            }
        
        # 2. BVLOS Search (General / Fallback)
        elif "bvlos" in topic_lower:
             AgentLogger.think("ResearchAgent", "Specific region not detected. Defaulting to FAA/EASA Global Standards.")
             return {
                "knowledge": [{
                    "category": "Regulatory",
                    "key": "BVLOS_Global_Regs",
                    "value": "BVLOS generally requires special waivers (Part 107 Waiver in US, Specific Category in EU).",
                    "source": "Global Aviation Database (Simulated)"
                }]
            }

        # 3. SaaS Pricing
        if "pricing" in topic_lower and "saas" in context_lower:
             return {
                "knowledge": [{
                    "category": "Market",
                    "key": "Benchmark_Pricing",
                    "value": "$29-$99/mo is standard for this vertical.",
                    "source": "SaaSBenchmarks.com (Simulated)"
                }]
            }

        # 4. Battery / Tech
        if "battery" in topic_lower or "range" in topic_lower:
             return {
                 "knowledge": [{
                    "category": "Tech",
                    "key": "LiPo_Density",
                    "value": "Current LiPo density approx 150-180Wh/kg.",
                    "source": "BatteryUniversity (Simulated)"
                }]
             }


        return None

    def verify_claim(self, topic: str, claim: str, context: str = "") -> Dict[str, Any]:
        """
        Verifies a user's claim against external data using Real LLM or Mock Logic.
        """
        topic_lower = topic.lower()
        claim_lower = claim.lower()
        context_lower = context.lower()
        
        print(f"\n\033[96m[ResearchAgent] Verifying claim: '{claim}' on topic '{topic}'...\033[0m")

        AgentLogger.think("ResearchAgent", "Cross-referencing claim with verified industry benchmarks...")

        # --- REAL LLM VERIFICATION ---
        if self.llm:
            AgentLogger.think("ResearchAgent", "Consulting Verification Engine...")
            prompt = f"Topic: {topic}\nClaim: {claim}\nContext: {context}"
            response = self.llm.generate(prompt, VERIFICATION_SYSTEM_PROMPT)
            
            try:
                # Clean and parse JSON
                clean = response.replace("```json", "").replace("```", "").strip()
                result = json.loads(clean)
                AgentLogger.success(f"Verification Result: {result.get('is_verified')}")
                return result
            except Exception as e:
                AgentLogger.error(f"Verification Parsing Failed: {e}. Falling back to heuristics.")

        
        # --- MOCK VERIFICATION LOGIC (Fallback) ---
        
        # Scenario: BVLOS Verification
        if "bvlos" in topic_lower:
            # Check for India specific context
            is_india = "india" in context_lower or "india" in claim_lower
            
            if is_india:
                if "not needed" in claim_lower or "don't need" in claim_lower or "no" in claim_lower:
                    return {
                        "is_verified": False,
                        "correction": "DGCA regulations in India STRICTLY require BVLOS approval (O.P.A) for long-range drone logistics.",
                        "confidence": 0.95
                    }
            else:
                 # General Logic
                 if "no" in claim_lower and "long range" in context_lower:
                     return {
                        "is_verified": False,
                        "correction": "Most jurisdictions (FAA, EASA) require waivers for BVLOS.",
                        "confidence": 0.8
                    }

            if "have approval" in claim_lower or "yes" in claim_lower:
                 return {
                    "is_verified": True,
                    "correction": "Excellent. BVLOS approval is a major validaton milestone.",
                    "confidence": 0.8
                }
        
        # Scenario: Battery Range (SAFER REGEX)
        if "range" in topic_lower or "battery" in topic_lower:
            import re
            
            # EXTRACT TIME: Look for digits followed by 'min' or just digits if topic is explicitly about time
            # 1. Check for explicit time units
            time_match = re.search(r'(\d+)\s*(?:min|m|hour|hr)', claim_lower)
            minutes = 0
            
            if time_match:
                val = int(time_match.group(1))
                if "h" in time_match.group(0): val *= 60
                minutes = val
            elif "flight time" in topic_lower:
                 # If topic relies on time, extract raw digits
                 match = re.search(r'(\d+)', claim_lower)
                 if match: minutes = int(match.group(1))

            # Only validate minutes if we actually found a time value
            if minutes > 0:
                if minutes > 120: # Claiming > 2 hours
                     return {
                        "is_verified": False,
                        "correction": f"{minutes} minutes is extremely high for commercial battery tech. Are you using hybrid/Hydrogen?",
                        "confidence": 0.9
                    }
                if minutes < 10:
                     return {
                        "is_verified": False,
                        "correction": f"{minutes} minutes is likely too short for meaningful logistics.",
                        "confidence": 0.9
                    }

        # Default: Plausible
        return {
            "is_verified": True,
            "correction": "Claim appears plausible based on general market data.",
            "confidence": 0.5
        }


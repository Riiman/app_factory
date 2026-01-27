from setup_engine.core.context import ContextManager
import dataclasses
import json
from setup_engine.agents.archetype_agent import ArchetypeAgent
from setup_engine.agents.research_agent import ResearchAgent
from setup_engine.utils.logger import AgentLogger
from setup_engine.providers.search_provider import TavilySearchProvider, BingSearchProvider, DuckDuckGoSearchProvider, MockSearchProvider
from setup_engine.providers.llm_provider import AzureLLMProvider, MockLLMProvider
from setup_engine.utils.prompts import QUESTION_GENERATION_PROMPT, RESPONSE_PROCESSING_PROMPT, EVALUATION_SYSTEM_PROMPT

class Orchestrator:
    def __init__(self):
        self.context_manager = None
        self.llm_provider = None
        self.search_provider = None
        
        # 1. Initialize Real LLM
        try:
            self.llm_provider = AzureLLMProvider()
            AgentLogger.success("Orchestrator: LLM Online (Azure OpenAI)")
        except Exception:
            self.llm_provider = MockLLMProvider()
            AgentLogger.warning("Orchestrator: LLM Offline. Using Simulation.")

        # 2. Initialize Real Search
        try:
            # Priority: Tavily > Bing > DuckDuckGo
            try:
                self.search_provider = TavilySearchProvider()
                AgentLogger.success("Orchestrator: Search Online (Tavily)")
            except ValueError:
                try:
                    self.search_provider = BingSearchProvider()
                    AgentLogger.success("Orchestrator: Search Online (Bing)")
                except ValueError:
                     self.search_provider = DuckDuckGoSearchProvider()
                     AgentLogger.success("Orchestrator: Search Online (DuckDuckGo)")

        except Exception as e:
            self.search_provider = MockSearchProvider()
            AgentLogger.warning(f"Orchestrator: Search Offline ({e}). Using Simulation.")

        self.archetype_agent = ArchetypeAgent(self.llm_provider)
        self.research_agent = ResearchAgent(self.llm_provider, self.search_provider)

    def start(self, user_input: dict):
        """
        Initializes the session.
        """
        AgentLogger.system("Initializing Context & Agents...")
        self.context_manager = ContextManager(user_input)
        
        # 1. Initial Archetyping
        AgentLogger.think("Orchestrator", "Routing input to Archetype Agent for classification...")
        initial_analysis = self.archetype_agent.analyze(
            user_input.get("product_service_idea", ""),
            user_input.get("industry", "")
        )
        self.context_manager.update_from_agent(initial_analysis)
        name = initial_analysis.get("archetype_name", "Unknown")
        AgentLogger.success(f"[System] Identified Archetype: {name}")
        
        # 1.5 Blueprint Presentation
        ctx = self.context_manager.get_context()
        if ctx.requirements:
            print("\n" + "="*50)
            print("PRELIMINARY STRATEGIC BLUEPRINT")
            print("Based on your vision, here is what you will likely need:")
            print("="*50)
            
            # Group by category
            grouped = {}
            for req in ctx.requirements:
                cat = req.get("category", "General")
                if cat not in grouped: grouped[cat] = []
                grouped[cat].append(req.get("item"))
            
            for cat, items in grouped.items():
                print(f"\n\033[1m[{cat}]\033[0m")
                for item in items:
                    print(f" - [ ] {item}")
            print("\n" + "="*50 + "\n")
            
            # (Optional) Ask for confirmation could go here
            input("\033[93m[System] Press Enter to proceed with Gap Analysis...\033[0m")

    def run_loop(self):
        """
        The main Agentic Loop.
        """
        ctx = self.context_manager.get_context()
        
        # 0. Foundational Discovery (New Phase)
        if ctx.foundational_questions:
             print(f"\n" + "="*30)
             AgentLogger.system("Phase 1: Foundational Discovery")
             print("="*30)
             
             questions_to_remove = []
             for question in ctx.foundational_questions:
                 print(f"\n\033[92m[AI] {question}\033[0m")
                 user_ans = input("User: ")
                 
                 # Store answer directly in Knowledge Graph
                 # We infer category based on question keywords or just assign 'Foundational'
                 category = "Foundational"
                 if "legal" in question.lower() or "incorporated" in question.lower(): category = "Legal"
                 elif "finance" in question.lower() or "bank" in question.lower(): category = "Finance"
                 elif "factory" in question.lower() or "supply" in question.lower(): category = "Supply Chain"
                 
                 self.context_manager.context.add_knowledge(
                     category=category,
                     key=question[:30] + "...", # Shorten key
                     value=user_ans,
                     source="User_Interview"
                 )
                 questions_to_remove.append(question)
             
             # Clear questions so we don't ask again
             for q in questions_to_remove:
                 ctx.foundational_questions.remove(q)
                 
             print(f"\n" + "="*30)
             AgentLogger.system("Phase 2: Strategic Gap Analysis")
             print("="*30)

        # Infinite loop until all gaps are processed
        while True:
            # A. Check for Open Gaps
            # Prioritize: "Open" or "Discussing"
            active_gaps = [g for g in ctx.gaps if g.status in ["Open", "Discussing"]]
            
            if not active_gaps:
                print("\n\033[92m[System] No open gaps remaining. Plan is solid!\033[0m")
                print("\nSUMMARY OF GAPS:")
                for g in ctx.gaps:
                    color = "\033[92m" if g.status == "Verified_Present" else "\033[91m"
                    print(f"{color}[{g.status}] {g.description}\033[0m")
                break
                
            # Pick highest priority gap
            current_gap = active_gaps[0]
            current_gap.status = "Discussing"
            
            print(f"\n" + "-"*30)
            AgentLogger.system(f"Focus: {current_gap.description}")
            print("-"*30)
            
            AgentLogger.think("Orchestrator", f"Evaluating resolution strategy for '{current_gap.description}'...")
            
            # --- DRILL DOWN LOGIC ---
            
            # 1. Check if we need to auto-research (Only if no details gathered yet)
            if not current_gap.gathered_details and "BVLOS" in current_gap.description:
                 # Try Research First
                res = self.research_agent.research(
                    topic=current_gap.description,
                    context=f"{ctx.industry} {ctx.idea}"
                )
                if res and "knowledge" in res:
                    print(f"\033[94m[Action] Research Resolved Gap: {current_gap.description}\033[0m")
                    self.context_manager.context.mark_gap_verified(current_gap.description)
                    continue 

            # 2. Identify next missing detail
            missing_detail = None
            for detail in current_gap.required_details:
                if detail not in current_gap.gathered_details:
                    missing_detail = detail
                    break
            
            # If no missing details, we are done with this gap!
            if not missing_detail:
                # Check outcome: Are ANY details marked MISSING?
                any_missing = any(v == "MISSING" for v in current_gap.gathered_details.values())
                
                if any_missing:
                    print(f"\033[91m[System] Gap Confirmed Missing: {current_gap.description} (Some details unavailable)\033[0m")
                    self.context_manager.context.mark_gap_missing(current_gap.description)
                else:
                    print(f"\033[92m[System] All details gathered for {current_gap.description}.\033[0m")
                    self.context_manager.context.mark_gap_verified(current_gap.description)
                continue

            # 3. Ask Question about the missing detail
            question = f"Regarding '{current_gap.description}', we need to know about: **{missing_detail}**.\nCan you provide this details?"
            
            # Contextualize if possible
            if "Battery" in missing_detail:
                question = "What implies your **Battery Chemistry** (Li-Po, Li-Ion, Hydrogen)?"
            elif "Flight Time" in missing_detail:
                question = "What is your specific **Max Flight Time** in minutes?"
            
            # Smart Re-prompting
            # Smart Re-prompting
            # 3. Ask Question about the missing detail (Conversational)
            question = ""
            if self.llm_provider:
                prompt_text = QUESTION_GENERATION_PROMPT.format(
                    idea=ctx.idea,
                    industry=ctx.industry,
                    gap=current_gap.description,
                    detail=missing_detail
                )
                question = self.llm_provider.generate(prompt_text, "You are a friendly Co-Founder.")
                question = question.strip().replace('"', '')

            # Fallback if LLM fails or is missing (Simulation)
            if not question:
                 question = f"Regarding '{current_gap.description}', we need to know about: **{missing_detail}**.\nCan you provide this details?"
            
            # Smart Re-prompting
            if current_gap.attempts > 0 and current_gap.last_correction:
                 question = f"Earlier correction: {current_gap.last_correction}.\nGiven this, {question}"

            print(f"\n\033[92m[AI] {question}\033[0m")

            user_ans = input("User: ")
            
            # 4. Verify Answer (LLM-Based Processing)
            extracted_value = user_ans
            is_dont_know = False
            
            if self.llm_provider:
                try:
                    prompt = RESPONSE_PROCESSING_PROMPT.format(missing_detail=missing_detail, user_ans=user_ans)
                    res_raw = self.llm_provider.generate(prompt, "You are a JSON Parser.")
                    res = json.loads(res_raw.replace("```json", "").replace("```", "").strip())
                    
                    if res.get("category") == "DONT_KNOW":
                        is_dont_know = True
                    elif res.get("category") == "ANSWER_PROVIDED":
                        extracted_value = res.get("extracted_value") or user_ans
                        
                except Exception as e:
                    # Fallback to string match
                    normalized_ans = user_ans.lower()
                    if "don't have" in normalized_ans or "unknown" in normalized_ans or ("no " in normalized_ans and len(normalized_ans)<10):
                        is_dont_know = True

            else:
                 # Simulation Fallback
                normalized_ans = user_ans.lower()
                if "don't have" in normalized_ans or "unknown" in normalized_ans or ("no " in normalized_ans and len(normalized_ans)<10):
                    is_dont_know = True

            if is_dont_know:
                print(f"\033[91m[Action] Interpretation: User does NOT know '{missing_detail}'. Marking as MISSING.\033[0m")
                current_gap.gathered_details[missing_detail] = "MISSING"
                # If a required detail is missing, is the whole gap failed?
                # For now, we continue gathering other details, but mark gap as "Confirmed_Missing" at end if any are missing.
            
            else:
                # Real verification
                verification = self.research_agent.verify_claim(
                    topic=f"{current_gap.description} - {missing_detail}",
                    claim=extracted_value,
                    context=f"{ctx.industry} {ctx.idea}"
                )
                
                if verification["is_verified"]:
                    print(f"\033[94m[Action] Detail Verified.\033[0m")
                    current_gap.gathered_details[missing_detail] = extracted_value
                else:
                    # CHECK FOR RETRY LOOP
                    if current_gap.attempts >= 1:
                        # User is persisting with an unverified claim.
                        # Mark it as a High Risk / Dependency.
                        print(f"\033[93m[AI] Noting '{extracted_value}' as a Critical Dependency. Industry benchmarks disagree, so proving this is vital for success.\033[0m")
                        
                        # Add to Context as a Risk
                        self.context_manager.context.add_knowledge(
                            category="Risk",
                            key=f"Unproven: {missing_detail}",
                            value=f"User claims {extracted_value} (Industry standard is different). Verification failed but user insisted.",
                            source="User",
                            confidence=0.1
                        )
                        current_gap.gathered_details[missing_detail] = extracted_value # Accept it to move on
                    else:
                        print(f"\033[91m[AI] CHALLENGE: {verification['correction']}\033[0m")
                        current_gap.attempts += 1
                        current_gap.last_correction = verification['correction']
                        continue # Ask again

            
            # Check if we are done with this gap (after this detail)
            # (Loop will catch it on next iteration)

        self.finalize()

    def finalize(self):
        ctx = self.context_manager.get_context()
        
        print("\n" + "="*50)
        print("GENERATE FINAL EVALUATION REPORT")
        print("="*50)
        
        AgentLogger.think("Orchestrator", "Compiling session data for final auditing...")
        
        if self.llm_provider:
             AgentLogger.think("Orchestrator", "Generating Executive Summary & Risk Assessment...")
             
             # Prepare context
             verified_knowledge = [dataclasses.asdict(k) for k in ctx.knowledge_graph.values()]
             remaining_gaps = [dataclasses.asdict(g) for g in ctx.gaps if g.status != "Verified_Present"]
             
             prompt = f"Startup: {ctx.name}\nIdea: {ctx.idea}\nIndustry: {ctx.industry}\nKnowledge: {json.dumps(verified_knowledge)}\nGaps: {json.dumps(remaining_gaps)}"
             
             report = self.llm_provider.generate(prompt, EVALUATION_SYSTEM_PROMPT)
             
             print("\n" + report + "\n")
             
             # Save report
             try:
                 with open("startup_evaluation_report.md", "w") as f:
                     f.write(report)
                 AgentLogger.success("Report saved to 'startup_evaluation_report.md'")
             except:
                 pass
        
        else:
             print("LLM Check failed. Cannot generate report in Simulation Mode.")
             print(self.context_manager.context.to_json())

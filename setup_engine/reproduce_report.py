
import sys
import os
import dataclasses
from dotenv import load_dotenv

# Ensure setup_engine is in path
sys.path.append(os.getcwd())

from setup_engine.core.orchestrator import Orchestrator
from setup_engine.core.context import ContextManager

def main():
    load_dotenv()
    
    # 1. Initialize Orchestrator (connects to Real LLM)
    orchestrator = Orchestrator()
    if not orchestrator.llm_provider:
        print("Error: Azure LLM not connected. Cannot generate real report.")
        return

    # 2. Setup Context (Simulating the User's Session)
    initial_input = {
        "startup_name": "Droneco",
        "product_service_idea": "Building company that provides drone logistics services to quick commerce platforms",
        "industry": "Logistics"
    }
    orchestrator.context_manager = ContextManager(initial_input)
    ctx = orchestrator.context_manager.get_context()
    
    # 3. Inject Verified Knowledge (From Transcript)
    # Archetype basics
    ctx.requirements = [
        {"category": "Tech", "item": "Autonomous drone fleet management software"},
        {"category": "Regulatory", "item": "Securing BVLOS approval"},
        {"category": "Ops", "item": "Drone launch/landing pads"},
        {"category": "Business", "item": "Partnerships with quick commerce"}
    ]
    
    # Gap 1: BVLOS
    ctx.add_knowledge("Regulatory", "Target Country", "India", "User")
    ctx.add_knowledge("Regulatory", "BVLOS Status", "Regulations still not in place (User operating exp)", "User")
    ctx.mark_gap_verified("Need BVLOS (Beyond Visual Line of Sight) regulatory approval for drone flights in target regions")

    # Gap 2: Drop-off Tech
    ctx.add_knowledge("Technical", "Terrain", "Mixed houses (high rise + normal)", "User")
    ctx.add_knowledge("Technical", "Fulfillment Model", "Hybrid: Drone to Pod -> Biker to Customer", "User")
    ctx.mark_gap_verified("Choice and integration of last-mile drop-off technology")
    
    # Gap 3: Ops Protocols
    ctx.add_knowledge("Operations", "Turnaround Time", "15 mins total (User claim)", "User")
    ctx.add_knowledge("Technical", "Drone Type", "Fixed Wing VTOL (Hybrid)", "User")
    ctx.add_knowledge("Operations", "Scale/Staffing", "10km radius, 100 drones, 35 staff", "User")
    ctx.mark_gap_verified("Lack of standardized drone operational protocols")

    # Gap 4: Integration
    ctx.add_knowledge("Business", "Partnerships", "Talked to Zepto and Blinkit", "User")
    ctx.add_knowledge("Technical", "Integration Level", "No API docs yet; Built internal platform for fleet mgmt", "User")
    ctx.mark_gap_verified("Unclear commercial interest and integration readiness")
    
    # Gap 5: Launch Sites
    ctx.add_knowledge("Operations", "Site Requirements", "5x5 meter space per drone", "User")
    ctx.add_knowledge("Operations", "Emergency Procedures", "Halt in bad weather; Auto-RTL on failure", "User")
    ctx.mark_gap_verified("Logistics for establishing and maintaining drone launch/landing sites")

    # Gap 6: Business Model (The Problematic One)
    # User struggled with costs.
    # "75 rupees/delivery" -> Challenged (False)
    # "4 rupees/km" -> Challenged (False)
    # Final state: "I don't have the breakup yet" -> Verified (True as in 'admitted unknown')
    
    # We log this as a Risk/Unknown manually to match what the engine would do
    ctx.add_knowledge("Risk", "Cost Structure", "User does not have cost breakup. Claims of 10 INR/km were challenged.", "System")
    ctx.add_gap("Business model and pricing strategy", "Business", "Critical")
    # Mark it as verified implies we are 'done' discussing it, even if answer was 'I don't know'
    ctx.mark_gap_verified("Business model and pricing strategy") 

    # 4. Trigger Finalize
    print("State Injection Complete. Generating Report...")
    orchestrator.finalize()

if __name__ == "__main__":
    main()

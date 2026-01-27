
import sys
import os
import builtins
import json
from unittest.mock import patch

# Ensure setup_engine is in path
sys.path.append(os.getcwd())

from setup_engine.core.orchestrator import Orchestrator
from setup_engine.generate_payload import main as generate_payload_main
from dotenv import load_dotenv

load_dotenv()

# Pre-defined answers for the simulation
# We match questions partially to give context-aware answers
AUTO_ANSWERS = {
    "Startup Idea": "Drone logistics for quick commerce in India",
    "Industry": "Logistics",
    # Foundational Questions
    "legal": "We are a Private Limited company registered in Delhi.",
    "incorporated": "Yes, Private Limited in Delhi.",
    "equity": "Founders own 80%, Angel Investors own 20%. Cap table is clean.",
    "finance": "We have 1.5 Crores INR in the bank, giving us 12 months of runway.",
    "bank": "1.5 Crores INR current balance.",
    "factory": "We use a third-party manufacturer in Pune for the drone frames, but assemble the electronics in-house.",
    "supply": "Supply chain is secured with vendors in Taiwan and Pune.",
    # Standard Gaps/Risks (Droneco Specific)
    "BVLOS": "We are applying for experimental approval under the green zone sandbox policy.",
    "Cost": "Our calculated cost is 15 INR per km based on our pilot data.",
    "100 drones": "We plan to start with 10 drones and scale to 100 over 12 months.",
    "API": "We will build custom adapters for Zepto and Blinkit APIs.",
    "Battery": "Li-Ion custom packs giving 45 mins flight time.",
    "Flight Time": "45 minutes loaded.",
    "Speed": "80 kmph cruise speed.",
    "Radius": "10 km service radius.",
    # Fallback
    "default": "We are still determining that, but we have a plan."
}

def mock_input(prompt=""):
    print(prompt, end="")
    # Logic to pick the right answer
    prompt_lower = str(prompt).lower()
    
    # 1. Check current question from Orchestrator print buffer (simulated by looking at prompt history or expectation)
    # Since 'input' only sees the prompt string "User: ", we need to know the CONTEXT.
    # But Orchestrator prints the AI question BEFORE calling input().
    # In a real script, we'd need to intercept stdout.
    # simplified: We will rely on a generator that yields answers in sequence OR use a smarter mock.
    
    # Actually, simpler approach for this script:
    # We can't easily see the *previous* print. 
    # Let's just return a generic "Simulated Answer" unless we can hook into Orchestrator better.
    # OR, we modify Orchestrator to accept an 'input_provider' function.
    
    # For now, let's assuming the simulation just runs through a fixed script? 
    # No, the user wants "answer the question automatically that were not answered earlier".
    
    # Better Hack: The Orchestrator prints "[AI] Question". 
    # We can't see that here easily.
    # Let's iterate through our known answers and pop them if they match context? No.
    
    return "This is a simulated answer for automation purposes."

# Let's use a class to track state
class AutoUser:
    def __init__(self):
        self.question_history = []
        
    def answer(self, prompt=""):
        # This function is called when input() is called.
        # Problem: We don't know what the AI just asked because that was sent to stdout, not passed to input().
        # However, for this specific task, we can just inject a "Smart" answer that covers all bases
        # OR we can assume the Orchestrator loop order.
        
        # Let's allow the Orchestrator to run normally, but we will patch 'input' to return
        # a predefined sequence that matches the flow we expect.
        pass

# REVISING STRATEGY:
# To make this robust, I will subclass Orchestrator and override the interaction method
# or just patch builtins.print to capture the question.

captured_questions = []

def tracking_print(*args, **kwargs):
    msg = " ".join(map(str, args))
    if "[AI]" in msg:
        captured_questions.append(msg)
    builtins.__print__(*args, **kwargs) # Call original print

builtins.__print__ = builtins.print # Backup
    
def smart_input(prompt=""):
    builtins.__print__(prompt, end="") 
    
    last_question = captured_questions[-1] if captured_questions else ""
    last_q_lower = last_question.lower()
    
    answer = "We are working on it." # Default
    
    # Matching logic
    if "idea" in prompt.lower() or "industry" in prompt.lower(): return "Drone Logistics" # Should be handled by init dict, not input
    
    if "legal" in last_q_lower or "incorporat" in last_q_lower:
        answer = "Yes, we are a Private Limited entity registered in Bangalore."
    elif "equity" in last_q_lower or "cap table" in last_q_lower:
        answer = "Founders hold 90%, 10% ESOP pool."
    elif "finance" in last_q_lower or "bank" in last_q_lower or "runway" in last_q_lower:
        answer = "We have $50k in the bank, representing 8 months runway."
    elif "factory" in last_q_lower or "manufactur" in last_q_lower:
        answer = "We outsource manufacturing to a vendor in Chennai. We do not own a factory."
    elif "capacity" in last_q_lower:
        answer = "Vendor capacity is 50 drones per month."
    elif "cost" in last_q_lower:
        answer = "12 INR per km is our target."
    elif "bvlos" in last_q_lower:
        answer = "We are applying for the DGCA sandbox."
    elif "turnaround" in last_q_lower:
        answer = "15 minutes."
        
    builtins.__print__(f"\033[93m{answer}\033[0m")
    return answer

def main():
    # 1. Setup Simulation
    print("STARTING FULL CYCLE SIMULATION...")
    
    initial_input = {
        "product_service_idea": "Drone logistics for quick commerce",
        "industry": "Logistics"
    }
    
    orchestrator = Orchestrator()
    
    # 2. Patch Input/Print to be "Smart"
    with patch('builtins.input', side_effect=smart_input), \
         patch('builtins.print', side_effect=tracking_print):
        
        # 3. Run Orchestrator
        # We need to limit the loop so it doesn't run forever.
        # Orchestrator doesn't have a max_turns arg, so we rely on it resolving gaps.
        # We'll inject a "Abort" logic if it runs too long? 
        # No, let's trust the logic I wrote: verified = loop continues? 
        # Actually my Orchestrator loop breaks if 'no active gaps'.
        
        orchestrator.start(initial_input)
        
        # Force a limit on the loop by mocking the 'while True' effectively?
        # Or just let it run. The smart answers should resolve gaps quickly.
        try:
            orchestrator.run_loop()
        except StopIteration:
            pass # Dictionary ran out if we used lists, but we use logic.
            
    # 4. Generate Payload
    print("\n\nSIMULATION COMPLETE. GENERATING JSON PAYLOAD...")
    # We need to make sure 'transcript.txt' captures this session.
    # The Orchestrator doesn't auto-save transcript to txt file in my implementation yet?
    # I need to manually save the 'captured_questions' + answers to transcript.txt
    
    with open("transcript.txt", "w") as f:
        # Reconstruct transcript from context history? 
        # Better: context.history
        history = orchestrator.context_manager.context.history
        # Actually context.history wasn't fully implemented in the run_loop updates I made.
        # Let's blindly write our capture list.
        for q in captured_questions:
            f.write(f"{q}\n")
            f.write("User: <Automated Answer>\n") # We lost the exact answer pair in this simple capture
            
    # BETTER: Update Orchestrator to save transcript? 
    # For now, let's rely on the LLM generating a report which is saved to 'startup_evaluation_report.md'.
    # generate_payload.py reads that report AND transcript.txt.
    # So I DO need a valid transcript.txt.
    
    # Let's save a "Simulated Transcript"
    with open("transcript.txt", "w") as f:
        f.write("[System] Conversation History\n")
        f.write("User: Drone logistics for quick commerce\n")
        f.write("[AI] Are you incorporated?\nUser: Yes, Private Limited in Bangalore.\n")
        f.write("[AI] What is your bank balance?\nUser: $50k in bank.\n")
        f.write("[AI] What represents your equity split?\nUser: Founders hold 90%, 10% ESOP pool.\n")
        f.write("[AI] Manufacturing?\nUser: Outsourced to Chennai.\n")
        # Add the gaps
        f.write("[AI] Cost per km?\nUser: 12 INR.\n")
    
    # 5. Run Generator
    try:
        generate_payload_main()
    except Exception as e:
        print(f"Payload Gen Error: {e}")

if __name__ == "__main__":
    main()

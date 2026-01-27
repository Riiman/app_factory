from setup_engine_prototype import SetupEngine
import json
import time

def main():
    print("\n" + "="*50)
    print("Welcome to the Startup Setup Engine (Manual Test)")
    print("="*50 + "\n")
    print("This console allows you to roleplay as a Founder.")
    print("The AI Co-Founder will analyze your input and guide you.")
    print("\n[NOTE] Supported Scenarios for Prototype: 'Medical Drone', 'SaaS Platform'.\n")

    # 1. Gather Submission Data
    print("--- Step 1: Tell us about your startup ---")
    name = input("Startup Name: ")
    idea = input("What is your Product/Service Idea? ")
    industry = input("Industry (e.g., Logistics, Software): ")
    
    submission_data = {
        "startup_name": name,
        "product_service_idea": idea,
        "industry": industry,
        # Default fillers for prototype logic
        "problem_statement": "Problem statement placeholder",
        "intended_users_customers": "Target audience placeholder"
    }

    print("\n[SYSTEM] Initializing AI Engine...")
    time.sleep(1)
    
    engine = SetupEngine(submission_data)

    # 2. Analyze
    gaps = engine.analyze_gaps()
    print(f"\n[SYSTEM] Analysis Complete. Found {len(gaps)} Gaps.\n")
    
    print("--- Step 2: AI Co-Founder Conversation ---")
    input("(Press Enter to start chat...)")
    
    # 3. Simulate Interactive
    engine.run_conversation_simulation(interactive=True)
    
    print("\n" + "="*50)
    print("Setup Complete! Verifying results...")
    print("="*50 + "\n")
    
    # 4. Show Output
    output_json = engine.export_state()
    print(output_json)

if __name__ == "__main__":
    main()

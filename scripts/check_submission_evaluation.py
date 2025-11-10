import os
import sys
from flask import Flask

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Submission, Evaluation
from app.config import Config

def check_submission_evaluation(submission_id: int):
    app = create_app(Config)
    with app.app_context():
        print(f"--- Checking Evaluation for Submission ID: {submission_id} ---")
        
        submission = Submission.query.get(submission_id)
        
        if not submission:
            print(f"Error: Submission with ID {submission_id} not found.")
            return

        evaluation = Evaluation.query.filter_by(submission_id=submission.id).first()
        
        if not evaluation:
            print(f"No evaluation found for Submission ID {submission_id}.")
        else:
            print(f"\nEvaluation found for Submission ID {submission_id}:")
            print(f"  Overall Score: {evaluation.overall_score}")
            print(f"  Final Decision: {evaluation.final_decision}")
            print(f"  Overall Summary: {evaluation.overall_summary}")
            print(f"  Problem Analysis: {evaluation.problem_analysis}")
            print(f"  Solution Analysis: {evaluation.solution_analysis}")
            print(f"  Market Analysis: {evaluation.market_analysis}")
            print(f"  Growth Analysis: {evaluation.growth_analysis}")
            print(f"  Competitor Analysis: {evaluation.competitor_analysis}")
            print(f"  Risks Analysis: {evaluation.risks_analysis}")
            print(f"  Created At: {evaluation.created_at}")

        print("\n--- Check Complete ---")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python scripts/check_submission_evaluation.py <submission_id>")
        sys.exit(1)
    
    try:
        sub_id = int(sys.argv[1])
        check_submission_evaluation(sub_id)
    except ValueError:
        print("Error: Submission ID must be an integer.")
        sys.exit(1)

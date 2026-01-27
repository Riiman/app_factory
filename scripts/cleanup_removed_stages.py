"""
Cleanup Script: Remove Startups with SCOPING or CONTRACT Stages
This script removes all startups that have SCOPING or CONTRACT as their current_stage,
along with all related data (users, submissions, products, etc.)
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import (
    Startup, User, Submission, Product, Feature, 
    BusinessMonthlyData, MarketingCampaign, FundingRound,
    Investor, Task, Experiment, Artifact, Founder,
    ScopeDocument, Contract, ActivityLog, DashboardNotification
)
from config import Config

def cleanup_startups_with_removed_stages():
    """Remove all startups with SCOPING or CONTRACT stages and their related data"""
    
    app = create_app(Config)
    
    with app.app_context():
        # Find all startups with SCOPING or CONTRACT stages
        startups_to_remove = Startup.query.filter(
            Startup.current_stage.in_(['SCOPING', 'CONTRACT'])
        ).all()
        
        if not startups_to_remove:
            print("✅ No startups found with SCOPING or CONTRACT stages.")
            return
        
        print(f"Found {len(startups_to_remove)} startups with removed stages:")
        for startup in startups_to_remove:
            print(f"  - ID: {startup.id}, Name: {startup.name}, Stage: {startup.current_stage}")
        
        # Ask for confirmation
        response = input(f"\n⚠️  Are you sure you want to DELETE these {len(startups_to_remove)} startups and ALL their related data? (yes/no): ")
        
        if response.lower() != 'yes':
            print("❌ Cleanup cancelled.")
            return
        
        deleted_count = 0
        
        for startup in startups_to_remove:
            try:
                print(f"\n🗑️  Deleting startup: {startup.name} (ID: {startup.id})")
                
                # Get the user_id and submission_id before deletion
                user_id = startup.user_id
                submission_id = startup.submission_id
                
                # Delete related data (most will cascade automatically due to relationships)
                # But let's be explicit for clarity
                
                # 1. Delete products and their features
                for product in startup.products:
                    Feature.query.filter_by(product_id=product.id).delete()
                    print(f"   - Deleted features for product: {product.name}")
                
                Product.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted {len(startup.products)} products")
                
                # 2. Delete business monthly data
                BusinessMonthlyData.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted business monthly data")
                
                # 3. Delete marketing campaigns
                MarketingCampaign.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted marketing campaigns")
                
                # 4. Delete funding rounds and investors
                FundingRound.query.filter_by(startup_id=startup.id).delete()
                Investor.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted funding rounds and investors")
                
                # 5. Delete tasks, experiments, artifacts
                Task.query.filter_by(startup_id=startup.id).delete()
                Experiment.query.filter_by(startup_id=startup.id).delete()
                Artifact.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted tasks, experiments, and artifacts")
                
                # 6. Delete founders
                Founder.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted founders")
                
                # 7. Delete scope document and contract
                ScopeDocument.query.filter_by(startup_id=startup.id).delete()
                Contract.query.filter_by(startup_id=startup.id).delete()
                print(f"   - Deleted scope document and contract")
                
                # 8. Delete activity logs and notifications
                ActivityLog.query.filter_by(startup_id=startup.id).delete()
                DashboardNotification.query.filter_by(user_id=user_id).delete()
                print(f"   - Deleted activity logs and notifications")
                
                # 9. Delete the startup itself
                db.session.delete(startup)
                print(f"   - Deleted startup: {startup.name}")
                
                # 10. Delete the submission
                submission = Submission.query.get(submission_id)
                if submission:
                    db.session.delete(submission)
                    print(f"   - Deleted submission")
                
                # 11. Optionally delete the user (only if they have no other startups)
                user = User.query.get(user_id)
                if user:
                    other_startups = Startup.query.filter(
                        Startup.user_id == user_id,
                        Startup.id != startup.id
                    ).count()
                    
                    if other_startups == 0:
                        db.session.delete(user)
                        print(f"   - Deleted user: {user.email} (no other startups)")
                    else:
                        print(f"   - Kept user: {user.email} (has {other_startups} other startups)")
                
                # Commit for this startup
                db.session.commit()
                deleted_count += 1
                print(f"✅ Successfully deleted startup: {startup.name}")
                
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error deleting startup {startup.name}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        print(f"\n✅ Cleanup complete! Deleted {deleted_count} out of {len(startups_to_remove)} startups.")
        
        # Verify no startups remain with these stages
        remaining = Startup.query.filter(
            Startup.current_stage.in_(['SCOPING', 'CONTRACT'])
        ).count()
        
        if remaining == 0:
            print("✅ Verification: No startups remain with SCOPING or CONTRACT stages.")
        else:
            print(f"⚠️  Warning: {remaining} startups still have SCOPING or CONTRACT stages.")

if __name__ == '__main__':
    cleanup_startups_with_removed_stages()

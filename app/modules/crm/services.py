from app.extensions import db
from app.modules.crm.models import CrmCompany, CrmContact, CrmInteraction, InteractionType
from app.modules.email.models import UserEmailIntegration
from app.modules.email.services import EmailService
import requests
import re
from datetime import datetime

class CrmEnrichmentService:
    @staticmethod
    def enrich_company(domain):
        """
        Enriches company data based on domain.
        Uses Clearbit Logo API (free) and mocks other data for MVP.
        """
        if not domain:
            return None

        # Clean domain
        domain = domain.replace('https://', '').replace('http://', '').split('/')[0]

        logo_url = f"https://logo.clearbit.com/{domain}"
        
        # In a real production app, we would call an enrichment API like Clearbit, Hunter, or Apollo here.
        # For this demo, we will check if the logo exists (status 200) and return mock data.
        
        try:
            # Check availability (fast timeout)
            response = requests.head(logo_url, timeout=2)
            if response.status_code != 200:
                logo_url = None
        except:
            logo_url = None

        # Mock Data Generation based on domain to feel "real"
        name = domain.split('.')[0].capitalize()
        
        return {
            'name': name,
            'domain': domain,
            'logo_url': logo_url,
            'description': f"{name} is a leading company in the technology sector, innovating in software solutions.",
            'industry': "Technology",
            'employees': "50-200",
            'social': {
                'linkedin': f"https://linkedin.com/company/{name.lower()}",
                'twitter': f"https://twitter.com/{name.lower()}"
            }
        }

class CrmEmailSyncService:
    @staticmethod
    def sync_recent_emails(user_id, limit=50):
        """
        Syncs recent emails for the user and logs them as interactions if they match a contact.
        Applies 2-Tier Smart Filtering:
        1. Heuristics (blocklist, keywords)
        2. AI Classification (relevance score)
        """
        from app.services.generation_service import classify_email_content

        integration = UserEmailIntegration.query.filter_by(user_id=user_id).first()
        if not integration:
            return {"status": "error", "message": "No email integration found"}

        try:
            email_service = EmailService(integration)
            recent_emails = email_service.fetch_emails(limit=limit)
            
            synced_count = 0
            
            # Fetch User-Defined Rules (Negative List)
            # Assuming one startup for now, get rules for this startup
            # Since rules are per startup (in models.py), we need to know the startup_id.
            # But the service here takes user_id. We can find startup from user.
            from app.models import User
            from app.modules.crm.models import CrmSyncRule, SyncRuleType

            user = User.query.get(user_id)
            startup_id = user.startups[0].id if user.startups else None
            
            user_rules = []
            if startup_id:
                user_rules = CrmSyncRule.query.filter_by(startup_id=startup_id).all()
            
            # Tier 1: System Heuristic Blocklist
            BLOCKLIST_SENDERS = ['noreply', 'no-reply', 'newsletter', 'billing', 'notifications', 'updates', 'support', 'alert']
            BLOCKLIST_SUBJECTS = ['receipt', 'invoice', 'reset', 'verify', 'subscribe', 'security alert', 'login']

            for email in recent_emails:
                # Extract email address
                from_email_match = re.search(r'<(.+?)>', email['from'])
                from_email = from_email_match.group(1) if from_email_match else email['from']
                from_email_lower = from_email.lower()
                subject_lower = email['subject'].lower()

                # --- Tier 0: User-Defined Rules ---
                ignored_by_rule = False
                for rule in user_rules:
                    if rule.rule_type == SyncRuleType.EMAIL and rule.value.lower() == from_email_lower:
                        ignored_by_rule = True
                        print(f"Skipping (User Rule EMAIL): {from_email}")
                        break
                    elif rule.rule_type == SyncRuleType.DOMAIN and f"@{rule.value.lower()}" in from_email_lower:
                        ignored_by_rule = True
                        print(f"Skipping (User Rule DOMAIN): {from_email}")
                        break
                    elif rule.rule_type == SyncRuleType.SUBJECT and rule.value.lower() in subject_lower:
                        ignored_by_rule = True
                        print(f"Skipping (User Rule SUBJECT): {email['subject']}")
                        break
                
                if ignored_by_rule:
                    continue

                # --- Tier 1 Filter ---
                if any(x in from_email_lower for x in BLOCKLIST_SENDERS):
                    print(f"Skipping (Heuristic Sender): {from_email}")
                    continue
                if any(x in subject_lower for x in BLOCKLIST_SUBJECTS):
                    print(f"Skipping (Heuristic Subject): {email['subject']}")
                    continue

                # Search for Contact with this email (Optimization: Only classify if contact exists?)
                # Actually, for CRM, we only care if contact exists usually. 
                # If we want to create NEW leads from emails, that's a different feature. 
                # Let's stick to matching existing contacts for now as per plan.
                contact = CrmContact.query.filter_by(email=from_email, startup_id=1).first() 
                
                if not contact:
                    continue

                # Check if interaction already exists
                existing = CrmInteraction.query.filter_by(
                    contact_id=contact.id, 
                    email_message_id=str(email['id']) 
                ).first()

                if existing:
                    continue

                # --- Tier 2 Filter: AI Classification ---
                # Only run for matched contacts to save tokens
                classification = classify_email_content(
                    sender=email['from'],
                    subject=email['subject'],
                    snippet=email['snippet']
                )
                
                score = classification.get('relevance_score', 0)
                category = classification.get('category', 'Other')
                
                # Logic: Keep if High Score OR Critical Category
                is_relevant = score >= 6 or category in ['Opportunity', 'Meeting', 'Support', 'Legal', 'Partnership', 'Recruitment']
                
                if not is_relevant:
                    print(f"Skipping (AI Low Relevance): {score}/10 {category} - {email['subject']}")
                    continue

                # Create Interaction
                interaction = CrmInteraction(
                    startup_id=contact.startup_id,
                    contact_id=contact.id,
                    type=InteractionType.EMAIL,
                    content=f"[AI: {category} ({score}/10)]\nSubject: {email['subject']}\n\n{email['snippet']}",
                    email_message_id=str(email['id']),
                    created_by=user_id,
                    created_at=datetime.utcnow() 
                )
                db.session.add(interaction)
                synced_count += 1
            
            db.session.commit()
            return {"status": "success", "synced_count": synced_count}

        except Exception as e:
            print(f"Sync failed: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

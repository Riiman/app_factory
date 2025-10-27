from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid
from openai import AzureOpenAI
from typing import Dict, Any
import io

app = Flask(__name__)
CORS(app)

DATA_DIR = 'submissions'
DOCUMENTS_DIR = 'generated_documents'
PROGRESS_DIR = 'progress_tracking'

for directory in [DATA_DIR, DOCUMENTS_DIR, PROGRESS_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# Azure OpenAI Configuration
AZURE_OPENAI_CONFIG = {
    'api_key': os.getenv('AZURE_OPENAI_API_KEY', 'your-api-key-here'),
    'endpoint': os.getenv('AZURE_OPENAI_ENDPOINT', 'your-endpoint-here'),
    'deployment_name': os.getenv('AZURE_DEPLOYMENT_NAME', 'gpt-4.1'),
    'api_version': '2024-08-01-preview'
}

class IncubatorGuideGenerator:
    """Generates comprehensive incubator guide documents using Azure OpenAI."""
    
    def __init__(self, api_key: str, endpoint: str, deployment_name: str, api_version: str = "2024-08-01-preview"):
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )
        self.deployment_name = deployment_name
    
    def safe_get(self, data: Dict, *keys, default: str = "Not specified"):
        """Safely get nested dictionary values with a default."""
        try:
            for key in keys:
                data = data[key]
            return data if data else default
        except (KeyError, TypeError):
            return default
    
    def generate_founder_specs(self, startup_data: Dict[str, Any]) -> str:
        """Stage 1: Generate detailed founder specifications and team analysis."""
        stage_1 = startup_data['stages']['1']['data']
        stage_7 = startup_data['stages']['7']['data']
        stage_8 = startup_data['stages']['8']['data']
        
        prompt = f"""You are an expert startup analyst for an incubator program. Analyze the following founder and startup information to create a comprehensive FOUNDER SPECS section for an incubator guide.

STARTUP INFORMATION:
- Name: {stage_1.get('startupName', 'N/A')}
- Founded: {stage_1.get('foundingYear', 'N/A')}
- Current Stage: {stage_1.get('currentStage', 'N/A')}
- Team Size: {stage_1.get('numberOfFounders', 'N/A')} founders, {stage_1.get('teamMembers', 'N/A')} total members
- Location: {stage_1.get('headquarters', 'N/A')}

FOUNDER BACKGROUND:
{stage_7.get('founderBackground', 'Not provided')}

TEAM COMPOSITION:
{stage_7.get('teamRoles', 'Not provided')}

PRIOR EXPERIENCE:
{stage_7.get('priorExperience', 'Not provided')}

SKILL GAPS:
{stage_7.get('skillGaps', 'Not provided')}

LOOKING FOR:
{stage_7.get('lookingFor', 'Not provided')}

SUPPORT NEEDS:
{', '.join(stage_8.get('supportTypes', []))}

COMPANY OVERVIEW:
{stage_1.get('companyOverview', 'Not provided')}

Generate a detailed FOUNDER SPECS section that includes:
1. **Founder Profile & Background**
2. **Team Composition & Roles**
3. **Capability Gaps & Hiring Needs**
4. **Support Requirements from Incubator**
5. **Founder Development Plan**

Make the analysis actionable, specific, and directly tied to building the MVP and launching successfully."""

        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": "You are an expert startup analyst and incubator advisor with deep experience in evaluating founding teams and structuring support programs."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2500
        )
        
        return response.choices[0].message.content
    
    def generate_product_scope(self, startup_data: Dict[str, Any]) -> str:
        """Stage 2: Generate detailed MVP product scope and technical specifications."""
        stage_2 = startup_data['stages']['2']['data']
        stage_3 = startup_data['stages']['3']['data']
        stage_6 = startup_data['stages']['6']['data']
        
        funding_status = stage_6.get('fundingRaised', 'Not specified')
        
        prompt = f"""You are a senior product architect and technical lead for an incubator program. Create a detailed PRODUCT SCOPE document for MVP development.

PROBLEM & SOLUTION:
- Problem Statement: {stage_2.get('problemStatement', 'N/A')}
- Target Audience: {stage_2.get('targetAudience', 'N/A')}
- Value Proposition: {stage_2.get('valueProposition', 'N/A')}
- Core Innovation: {stage_2.get('coreInnovation', 'N/A')}

PRODUCT DETAILS:
- Description: {stage_3.get('productDescription', 'N/A')}
- Product Type: {stage_3.get('productType', 'N/A')}
- Development Stage: {stage_3.get('developmentStage', 'N/A')}

TECH STACK:
{stage_3.get('techStack', 'Not provided')}

AI/ML COMPONENTS:
{stage_3.get('aiMlComponents', 'Not provided')}

TECHNICAL GOALS:
{stage_3.get('technicalGoals', 'Not provided')}

TECHNICAL CHALLENGES:
{stage_3.get('technicalChallenges', 'Not provided')}

Generate a comprehensive PRODUCT SCOPE section with:
1. **MVP Vision & Objectives**
2. **Core Features Specification**
3. **Technical Architecture**
4. **AI/ML Implementation Roadmap**
5. **Development Phases & Timeline**
6. **Technical Risk Mitigation**
7. **Resource Requirements**"""

        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": "You are a senior product architect and technical lead specializing in MVP development for startups."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3500
        )
        
        return response.choices[0].message.content
    
    def generate_gtm_strategy(self, startup_data: Dict[str, Any]) -> str:
        """Stage 3: Generate detailed Go-To-Market strategy."""
        stage_2 = startup_data['stages']['2']['data']
        stage_4 = startup_data['stages']['4']['data']
        stage_5 = startup_data['stages']['5']['data']
        stage_6 = startup_data['stages']['6']['data']
        
        prompt = f"""You are a seasoned GTM strategist and growth advisor for early-stage startups. Create a comprehensive, actionable GO-TO-MARKET STRATEGY.

TARGET MARKET:
- Target Market: {stage_4.get('targetMarket', 'N/A')}
- Market Size: {stage_4.get('marketSize', 'N/A')}
- Early Adopters: {stage_4.get('earlyAdopters', 'N/A')}

COMPETITIVE LANDSCAPE:
- Competitors: {stage_4.get('competitors', 'N/A')}
- Differentiation: {stage_4.get('differentiation', 'N/A')}

BUSINESS MODEL:
- Model Type: {stage_5.get('businessModel', 'N/A')}
- Revenue Streams: {stage_5.get('revenueStreams', 'N/A')}
- Pricing Strategy: {stage_5.get('pricingStrategy', 'N/A')}

Generate a detailed, executable GTM STRATEGY with:
1. **Market Entry Strategy**
2. **Customer Acquisition Strategy (0-6 Months)**
3. **Positioning & Messaging Framework**
4. **Launch Roadmap**
5. **Growth Tactics & Experiments**
6. **Partnerships & Ecosystem Strategy**
7. **Budget Breakdown & Resource Allocation**
8. **Metrics & Success Framework**
9. **Risk Mitigation & Contingencies**"""

        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": "You are an expert GTM strategist specializing in early-stage startup launches."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        return response.choices[0].message.content
    
    def compile_final_document(self, startup_data: Dict[str, Any], founder_specs: str, 
                               product_scope: str, gtm_strategy: str) -> str:
        """Compile all sections into a final formatted document."""
        stage_1 = startup_data['stages']['1']['data']
        
        document = f"""
{'='*80}
INCUBATOR PROGRAM GUIDE
{'='*80}

Startup: {stage_1.get('startupName', 'N/A')}
Website: {stage_1.get('websiteUrl', 'N/A')}
Document Generated: {datetime.now().strftime('%B %d, %Y')}
Program: TurningIdeas Incubation Cohort 2026

{'='*80}
EXECUTIVE SUMMARY
{'='*80}

{stage_1.get('companyOverview', 'N/A')}

This document serves as a comprehensive guide for the incubator program to:
1. Understand the founding team capabilities and support needs
2. Build and launch the MVP with clearly defined scope and specifications
3. Execute an effective go-to-market strategy to achieve initial traction

{'='*80}
SECTION 1: FOUNDER SPECS
{'='*80}

{founder_specs}

{'='*80}
SECTION 2: PRODUCT SCOPE & MVP SPECIFICATIONS
{'='*80}

{product_scope}

{'='*80}
SECTION 3: GO-TO-MARKET STRATEGY
{'='*80}

{gtm_strategy}

{'='*80}
END OF DOCUMENT
{'='*80}
"""
        return document
    
    def generate_complete_guide(self, startup_data: Dict[str, Any]) -> str:
        """Main method to generate the complete incubator guide."""
        print("Generating Founder Specs section...")
        founder_specs = self.generate_founder_specs(startup_data)
        
        print("Generating Product Scope section...")
        product_scope = self.generate_product_scope(startup_data)
        
        print("Generating GTM Strategy section...")
        gtm_strategy = self.generate_gtm_strategy(startup_data)
        
        print("Compiling final document...")
        final_document = self.compile_final_document(
            startup_data, founder_specs, product_scope, gtm_strategy
        )
        
        return final_document

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/submit-stage', methods=['POST'])
def submit_stage():
    """Save individual stage data"""
    try:
        data = request.json
        submission_id = data.get('submission_id')
        stage = data.get('stage')
        stage_data = data.get('data')
        
        if not submission_id:
            submission_id = str(uuid.uuid4())
        
        file_path = os.path.join(DATA_DIR, f'{submission_id}.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                submission = json.load(f)
        else:
            submission = {
                'submission_id': submission_id,
                'created_at': datetime.now().isoformat(),
                'stages': {},
                'status': 'in_progress'
            }
        
        submission['stages'][stage] = {
            'data': stage_data,
            'completed_at': datetime.now().isoformat()
        }
        submission['updated_at'] = datetime.now().isoformat()
        submission['current_stage'] = stage
        
        with open(file_path, 'w') as f:
            json.dump(submission, f, indent=2)
        
        return jsonify({
            'success': True,
            'submission_id': submission_id,
            'message': f'Stage {stage} saved successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/submit-final', methods=['POST'])
def submit_final():
    """Mark submission as complete and trigger document generation"""
    try:
        data = request.json
        submission_id = data.get('submission_id')
        
        file_path = os.path.join(DATA_DIR, f'{submission_id}.json')
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                submission = json.load(f)
            
            submission['status'] = 'completed'
            submission['completed_at'] = datetime.now().isoformat()
            
            # Initialize progress tracking
            progress_data = {
                'submission_id': submission_id,
                'mvp_development': {
                    'status': 'not_started',
                    'progress_percentage': 0,
                    'phases': [
                        {'name': 'Foundation', 'status': 'pending', 'progress': 0},
                        {'name': 'Core Features', 'status': 'pending', 'progress': 0},
                        {'name': 'AI Integration', 'status': 'pending', 'progress': 0},
                        {'name': 'Testing & Launch', 'status': 'pending', 'progress': 0}
                    ],
                    'milestones': []
                },
                'gtm_strategy': {
                    'status': 'not_started',
                    'progress_percentage': 0,
                    'phases': [
                        {'name': 'Pre-launch', 'status': 'pending', 'progress': 0},
                        {'name': 'Launch Week', 'status': 'pending', 'progress': 0},
                        {'name': 'Early Traction (M1-2)', 'status': 'pending', 'progress': 0},
                        {'name': 'Growth Acceleration (M3-4)', 'status': 'pending', 'progress': 0},
                        {'name': 'Scale & Optimize (M5-6)', 'status': 'pending', 'progress': 0}
                    ],
                    'metrics': {
                        'active_users': 0,
                        'revenue': 0,
                        'cac': 0,
                        'ltv': 0
                    },
                    'milestones': []
                },
                'document_generated': False,
                'last_updated': datetime.now().isoformat()
            }
            
            progress_file = os.path.join(PROGRESS_DIR, f'{submission_id}.json')
            with open(progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
            
            with open(file_path, 'w') as f:
                json.dump(submission, f, indent=2)
            
            return jsonify({
                'success': True,
                'message': 'Submission completed successfully',
                'data': submission
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-document/<submission_id>', methods=['POST'])
def generate_document(submission_id):
    """Generate startup incubator guide document"""
    try:
        file_path = os.path.join(DATA_DIR, f'{submission_id}.json')
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        with open(file_path, 'r') as f:
            startup_data = json.load(f)
        
        # Initialize generator
        generator = IncubatorGuideGenerator(
            api_key=AZURE_OPENAI_CONFIG['api_key'],
            endpoint=AZURE_OPENAI_CONFIG['endpoint'],
            deployment_name=AZURE_OPENAI_CONFIG['deployment_name']
        )
        
        # Generate document
        document = generator.generate_complete_guide(startup_data)
        
        # Save document
        doc_path = os.path.join(DOCUMENTS_DIR, f'{submission_id}_guide.txt')
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(document)
        
        # Update progress tracking
        progress_file = os.path.join(PROGRESS_DIR, f'{submission_id}.json')
        if os.path.exists(progress_file):
            with open(progress_file, 'r') as f:
                progress_data = json.load(f)
            
            progress_data['document_generated'] = True
            progress_data['document_path'] = doc_path
            progress_data['last_updated'] = datetime.now().isoformat()
            
            with open(progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': 'Document generated successfully',
            'document_path': doc_path
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/download-document/<submission_id>', methods=['GET'])
def download_document(submission_id):
    """Download generated startup guide document"""
    try:
        doc_path = os.path.join(DOCUMENTS_DIR, f'{submission_id}_guide.txt')
        
        if os.path.exists(doc_path):
            return send_file(doc_path, as_attachment=True, download_name=f'startup_guide_{submission_id}.txt')
        else:
            return jsonify({'success': False, 'error': 'Document not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/dashboard/<submission_id>', methods=['GET'])
def get_dashboard_data(submission_id):
    """Get complete dashboard data for a startup"""
    try:
        # Get submission data
        submission_path = os.path.join(DATA_DIR, f'{submission_id}.json')
        if not os.path.exists(submission_path):
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        with open(submission_path, 'r') as f:
            submission_data = json.load(f)
        
        # Get progress data
        progress_path = os.path.join(PROGRESS_DIR, f'{submission_id}.json')
        progress_data = {}
        if os.path.exists(progress_path):
            with open(progress_path, 'r') as f:
                progress_data = json.load(f)
        
        # Check if document exists
        doc_path = os.path.join(DOCUMENTS_DIR, f'{submission_id}_guide.txt')
        document_available = os.path.exists(doc_path)
        
        return jsonify({
            'success': True,
            'data': {
                'submission': submission_data,
                'progress': progress_data,
                'document_available': document_available
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update-progress/<submission_id>', methods=['POST'])
def update_progress(submission_id):
    """Update progress tracking for MVP or GTM"""
    try:
        data = request.json
        progress_type = data.get('type')  # 'mvp_development' or 'gtm_strategy'
        updates = data.get('updates')
        
        progress_path = os.path.join(PROGRESS_DIR, f'{submission_id}.json')
        
        if not os.path.exists(progress_path):
            return jsonify({'success': False, 'error': 'Progress tracking not initialized'}), 404
        
        with open(progress_path, 'r') as f:
            progress_data = json.load(f)
        
        if progress_type in progress_data:
            progress_data[progress_type].update(updates)
            progress_data['last_updated'] = datetime.now().isoformat()
            
            with open(progress_path, 'w') as f:
                json.dump(progress_data, f, indent=2)
            
            return jsonify({
                'success': True,
                'message': 'Progress updated successfully',
                'data': progress_data
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid progress type'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Simple login endpoint (placeholder for future authentication)"""
    try:
        data = request.json
        email = data.get('email')
        submission_id = data.get('submission_id')
        
        # For now, just validate that the submission exists
        submission_path = os.path.join(DATA_DIR, f'{submission_id}.json')
        
        if os.path.exists(submission_path):
            with open(submission_path, 'r') as f:
                submission_data = json.load(f)
            
            # Simple validation - check if email matches
            stage_1 = submission_data.get('stages', {}).get('1', {}).get('data', {})
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'submission_id': submission_id,
                'startup_name': stage_1.get('startupName', 'Unknown')
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

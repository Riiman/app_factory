import os
import json
from openai import AzureOpenAI
from datetime import datetime
from typing import Dict, Any

class IncubatorGuideGenerator:
    """
    Generates comprehensive incubator guide documents using Azure OpenAI.
    Uses multi-stage approach for detailed, structured output.
    """
    
    def __init__(self, api_key: str, endpoint: str, deployment_name: str, api_version: str = "2024-08-01-preview"):
        """
        Initialize Azure OpenAI client.
        
        Args:
            api_key: Azure OpenAI API key
            endpoint: Azure OpenAI endpoint URL
            deployment_name: Name of the deployed model
            api_version: API version to use
        """
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )
        self.deployment_name = deployment_name
    
    def load_startup_data(self, json_file_path: str) -> Dict[str, Any]:
        """Load startup data from JSON file."""
        with open(json_file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def safe_get(self, data: Dict, *keys, default: str = "Not specified"):
        """Safely get nested dictionary values with a default."""
        try:
            for key in keys:
                data = data[key]
            return data if data else default
        except (KeyError, TypeError):
            return default
    
    def generate_founder_specs(self, startup_data: Dict[str, Any]) -> str:
        """
        Stage 1: Generate detailed founder specifications and team analysis.
        """
        # Extract relevant data with safe access
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
   - Detailed analysis of founder experience and expertise
   - Key strengths that position them for success
   - Leadership capabilities assessment

2. **Team Composition & Roles**
   - Current team structure with role clarity
   - Skills inventory and capabilities map
   - Team dynamics assessment

3. **Capability Gaps & Hiring Needs**
   - Critical skill gaps that must be addressed
   - Prioritized hiring roadmap with timeline
   - Co-founder and advisor requirements

4. **Support Requirements from Incubator**
   - Technical support needs with specifics
   - Mentorship and advisory requirements
   - Resource allocation recommendations (cloud credits, tools, etc.)

5. **Founder Development Plan**
   - Skills development priorities for founders
   - Training and upskilling recommendations
   - Network building opportunities

Make the analysis actionable, specific, and directly tied to building the MVP and launching successfully. Be honest about gaps but constructive in recommendations."""

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
        """
        Stage 2: Generate detailed MVP product scope and technical specifications.
        """
        # Extract relevant data with safe access
        stage_2 = startup_data['stages']['2']['data']
        stage_3 = startup_data['stages']['3']['data']
        stage_6 = startup_data['stages']['6']['data']
        # fundingRaised is in stage 6, not stage 5
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

CURRENT METRICS:
- Active Users: {stage_6.get('activeUsers', 'N/A')}
- Key Metrics to Track: {stage_6.get('keyMetrics', 'N/A')}

TECHNICAL GOALS:
{stage_6.get('technicalGoals', 'Not provided')}

TECHNICAL CHALLENGES:
{stage_6.get('technicalChallenges', 'Not provided')}

FUNDING STATUS:
{funding_status}

Generate a comprehensive PRODUCT SCOPE section with:

1. **MVP Vision & Objectives**
   - Clear MVP definition and success criteria
   - What's included vs. what's deferred to post-MVP
   - Time-bound goals (3, 6, 9 months)

2. **Core Features Specification**
   - Must-have features for MVP (prioritized list)
   - Detailed functional requirements for each feature
   - User stories and acceptance criteria
   - Features explicitly excluded from MVP (nice-to-haves for v2)

3. **Technical Architecture**
   - System architecture diagram description
   - Frontend specifications and component structure
   - Backend architecture and API design
   - Database schema and data models
   - Infrastructure and deployment strategy

4. **AI/ML Implementation Roadmap**
   - Detailed ML component breakdown
   - Data requirements and collection strategy
   - Model development and training approach
   - Integration architecture
   - Performance benchmarks and success metrics

5. **Development Phases & Timeline**
   - Phase 1: Foundation (weeks 1-4) - specific deliverables
   - Phase 2: Core features (weeks 5-10) - specific deliverables
   - Phase 3: AI integration (weeks 11-14) - specific deliverables
   - Phase 4: Testing & launch prep (weeks 15-16) - specific deliverables

6. **Technical Risk Mitigation**
   - Identified technical risks with mitigation strategies
   - Dependency management approach
   - Testing and quality assurance plan
   - Security and compliance requirements

7. **Resource Requirements**
   - Development team composition and allocation
   - Cloud infrastructure and estimated costs
   - Third-party services and API costs
   - Tools and software licenses needed

Make specifications crisp, unambiguous, and ready for development team execution. Consider funding constraints - this is a bootstrapped/early-stage startup."""

        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": "You are a senior product architect and technical lead specializing in MVP development for startups. You excel at creating clear, actionable technical specifications."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3500
        )
        
        return response.choices[0].message.content
    
    def generate_gtm_strategy(self, startup_data: Dict[str, Any]) -> str:
        """
        Stage 3: Generate detailed Go-To-Market strategy.
        """
        # Extract relevant data with safe access
        stage_2 = startup_data['stages']['2']['data']
        stage_4 = startup_data['stages']['4']['data']
        stage_5 = startup_data['stages']['5']['data']
        stage_6 = startup_data['stages']['6']['data']
        stage_8 = startup_data['stages']['8']['data']
        
        prompt = f"""You are a seasoned GTM strategist and growth advisor for early-stage startups. Create a comprehensive, actionable GO-TO-MARKET STRATEGY.

TARGET MARKET:
- Target Market: {stage_4.get('targetMarket', 'N/A')}
- Market Size: {stage_4.get('marketSize', 'N/A')}
- Early Adopters: {stage_4.get('earlyAdopters', 'N/A')}

COMPETITIVE LANDSCAPE:
- Competitors: {stage_4.get('competitors', 'N/A')}
- Differentiation: {stage_4.get('differentiation', 'N/A')}
- Barriers to Entry: {stage_4.get('barriers', 'N/A')}

CUSTOMER ACQUISITION:
- Reach Strategy: {stage_4.get('customerReach', 'N/A')}
- Target CAC: {stage_5.get('cac', 'N/A')}
- Estimated LTV: {stage_5.get('ltv', 'N/A')}

BUSINESS MODEL:
- Model Type: {stage_5.get('businessModel', 'N/A')}
- Revenue Streams: {stage_5.get('revenueStreams', 'N/A')}
- Pricing Strategy: {stage_5.get('pricingStrategy', 'N/A')}
- Current Revenue: {stage_5.get('currentRevenue', 'N/A')}

FUNDING STATUS:
{stage_6.get('fundingRaised', 'Not specified')}

MILESTONES:
- Next Milestones: {stage_6.get('nextMilestones', 'N/A')}
- Expected Outcomes: {stage_8.get('expectedOutcomes', 'N/A')}

TARGET AUDIENCE:
{stage_2.get('targetAudience', 'N/A')}

VALUE PROPOSITION:
{stage_2.get('valueProposition', 'N/A')}

Generate a detailed, executable GTM STRATEGY with:

1. **Market Entry Strategy**
   - Initial target segment (ICP - Ideal Customer Profile)
   - Geographic focus and expansion plan
   - Beachhead market strategy
   - Why this segment first (evidence-based reasoning)

2. **Customer Acquisition Strategy (0-6 Months)**
   - Channel strategy with specific tactics for each:
     * Digital channels (SEO, content, social media)
     * Partnership channels (specific targets)
     * Community and network effects
     * Events and outreach programs
   - Budget allocation by channel (realistic for funding status)
   - Expected CAC by channel
   - Weekly/monthly acquisition targets

3. **Positioning & Messaging Framework**
   - Core positioning statement
   - Value propositions for each customer segment
   - Key messaging pillars
   - Competitive differentiation messaging
   - Objection handling framework

4. **Launch Roadmap (Pre-launch to Month 6)**
   - Pre-launch activities (weeks -4 to 0)
   - Launch week activities and milestones
   - Month 1-2: Early traction focus
   - Month 3-4: Growth acceleration
   - Month 5-6: Scale and optimize
   - Specific metrics targets for each phase

5. **Growth Tactics & Experiments**
   - 10 specific growth experiments to run (prioritized)
   - Success metrics for each experiment
   - Resource requirements and timeline
   - Learning objectives from each

6. **Partnerships & Ecosystem Strategy**
   - Strategic partnership targets (specific names/types)
   - Partnership value propositions
   - Partnership activation plan
   - Integration and co-marketing opportunities

7. **Budget Breakdown & Resource Allocation**
   - Detailed 6-month marketing budget
   - Tool and platform costs
   - Content and creative production costs
   - Paid acquisition budget by channel
   - Team requirements (roles and allocation)

8. **Metrics & Success Framework**
   - North Star Metric definition
   - Key Performance Indicators (KPIs) by stage
   - Weekly reporting dashboard structure
   - Success criteria for each milestone
   - When to pivot vs. persevere signals

9. **Risk Mitigation & Contingencies**
   - Market adoption risks and mitigation
   - Competitive response scenarios
   - Budget constraints and low-cost alternatives
   - Plan B strategies if primary channels don't work

Make every recommendation actionable, budget-conscious, and realistic for a bootstrapped/early-stage startup. Avoid generic advice - be specific with tactics, timelines, and expected outcomes."""

        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": "You are an expert GTM strategist specializing in early-stage startup launches. You provide specific, actionable, budget-conscious growth strategies."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        return response.choices[0].message.content
    
    def compile_final_document(self, startup_data: Dict[str, Any], 
                               founder_specs: str, 
                               product_scope: str, 
                               gtm_strategy: str) -> str:
        """
        Compile all sections into a final formatted document.
        """
        stage_1 = startup_data['stages']['1']['data']
        stage_6 = startup_data['stages']['6']['data']
        stage_8 = startup_data['stages']['8']['data']
        
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

APPENDIX: KEY STARTUP DATA
{'='*80}

**Funding Status:** {stage_6.get('fundingRaised', 'Not specified')}
**Accelerator Status:** {stage_6.get('acceleratorExperience', 'Not specified')}
**Short-term Goals:** {stage_8.get('shortTermGoals', 'Not specified')}

**Contact Information:**
- LinkedIn: {stage_1.get('founderLinkedIn', 'Not provided')}
- Location: {stage_1.get('headquarters', 'Not provided')}

{'='*80}
END OF DOCUMENT
{'='*80}
"""
        return document
    
    def generate_complete_guide(self, json_file_path: str, output_file_path: str = None) -> str:
        """
        Main method to generate the complete incubator guide.
        
        Args:
            json_file_path: Path to the input JSON file
            output_file_path: Optional path to save the output document
        
        Returns:
            The complete guide document as a string
        """
        print("Loading startup data...")
        startup_data = self.load_startup_data(json_file_path)
        
        print("Generating Founder Specs section...")
        founder_specs = self.generate_founder_specs(startup_data)
        
        print("Generating Product Scope section...")
        product_scope = self.generate_product_scope(startup_data)
        
        print("Generating GTM Strategy section...")
        gtm_strategy = self.generate_gtm_strategy(startup_data)
        
        print("Compiling final document...")
        final_document = self.compile_final_document(
            startup_data, 
            founder_specs, 
            product_scope, 
            gtm_strategy
        )
        
        # Save to file if path provided
        if output_file_path:
            with open(output_file_path, 'w', encoding='utf-8') as f:
                f.write(final_document)
            print(f"Document saved to: {output_file_path}")
        
        return final_document


# USAGE EXAMPLE
if __name__ == "__main__":
    # Configuration - replace with your Azure OpenAI details
    AZURE_OPENAI_API_KEY = '34UiAg4mBJHEpL9os7yZvoBXvjR0xi4bPJpDudahV4LSyqOEhpXZJQQJ99BJACYeBjFXJ3w3AAABACOGE6u8'
    AZURE_OPENAI_ENDPOINT = "https://codeforgeopenai.openai.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview"
    DEPLOYMENT_NAME = "gpt-4.1"
    
    # Initialize generator
    generator = IncubatorGuideGenerator(
        api_key=AZURE_OPENAI_API_KEY,
        endpoint=AZURE_OPENAI_ENDPOINT,
        deployment_name=DEPLOYMENT_NAME
    )
    
    # Generate the guide
    guide_document = generator.generate_complete_guide(
        json_file_path="97ce70ee-5ba3-4092-a7f6-d80ff2471619.json",
        output_file_path="VentureXit_Incubator_Guide.txt"
    )
    
    print("\n" + "="*80)
    print("GENERATION COMPLETE!")
    print("="*80)
    print(f"\nDocument preview (first 500 characters):\n{guide_document[:500]}...")

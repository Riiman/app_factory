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
        stage_1 = self.safe_get(startup_data, 'stages', '1', 'data', default={})
        stage_7 = self.safe_get(startup_data, 'stages', '7', 'data', default={})
        stage_8 = self.safe_get(startup_data, 'stages', '8', 'data', default={})
        
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
        stage_2 = self.safe_get(startup_data, 'stages', '2', 'data', default={})
        stage_3 = self.safe_get(startup_data, 'stages', '3', 'data', default={})
        
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
        stage_4 = self.safe_get(startup_data, 'stages', '4', 'data', default={})
        stage_5 = self.safe_get(startup_data, 'stages', '5', 'data', default={})
        
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
        stage_1 = self.safe_get(startup_data, 'stages', '1', 'data', default={})
        
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

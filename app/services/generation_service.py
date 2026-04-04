import os
from app import db
from app.models import Startup, ScopeDocument, Product, Feature, ProductMetric, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, MarketingOverview
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
import json
from datetime import datetime, timedelta
from app.services.notification_service import publish_update
from app.services.image_service import generate_marketing_image

# Remove extract_json_from_string function, as model_kwargs will handle JSON output

def generate_startup_assets(startup_id, generate_product=True, generate_gtm=True):
    """
    Generates product, features, metrics, marketing campaigns, and content calendar
    for a startup based on its scope document.
    """
    startup = Startup.query.get(startup_id)
    if not startup or not startup.scope_document:
        print(f"--- [Generation Task] Error: Startup or scope document not found for ID {startup_id}. ---")
        return

    scope_content = startup.scope_document.content

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=4000,
        model_kwargs={"response_format": {"type": "json_object"}} # Enable JSON mode
    )

    product = None
    if generate_product:
        # --- Generate Product and Features ---
        print(f"--- [Generation Task] Generating Product for startup ID: {startup_id} ---")
        product_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define a product with comprehensive details. "
            "Also, define a comprehensive list of features for the MVP and immediate roadmap. \n\n"
            "For the product, provide:\n"
            "- 'product_name': Product name\n"
            "- 'product_description': Detailed product description\n"
            "- 'customer_segment': Description of target customers (who will use this product)\n"
            "- 'unique_value_prop': Core unique value proposition (what makes this product special)\n"
            "- 'tech_stack': Array of suggested technologies/frameworks (e.g., ['React', 'Node.js', 'PostgreSQL'])\n\n"
            "For each feature, provide:\n"
            "- 'name': Feature title\n"
            "- 'description': Detailed explanation\n"
            "- 'user_story': 'As a [role], I want [action] so that [result]'\n"
            "- 'acceptance_criteria': Bullet points of verifiable criteria\n"
            "- 'priority': 1 (Critical) to 5 (Low)\n"
            "- 'rice_scores': Object with keys 'reach' (1-10), 'impact' (1-10), 'confidence' (0-100), 'effort' (1-10)\n\n"
            "Output a JSON object with keys 'product_name', 'product_description', 'customer_segment', 'unique_value_prop', 'tech_stack', and 'features' (array of objects).\n\n"
            "Scope Document:\n{scope_content}"
        )
        product_chain = product_prompt | llm
        product_json_str = product_chain.invoke({"scope_content": scope_content}).content
        
        try:
            product_data = json.loads(product_json_str)

            product = Product(
                startup_id=startup.id,
                name=product_data.get('product_name'),
                description=product_data.get('product_description'),
                customer_segment=product_data.get('customer_segment'),
                unique_value_prop=product_data.get('unique_value_prop'),
                tech_stack=product_data.get('tech_stack'),
                created_at=datetime.utcnow()
            )
            db.session.add(product)
            db.session.flush() # to get product.id

            from app.models import FeatureStatus # ensure import
            
            for feature_data in product_data.get('features', []):
                # Handle both string (legacy) and object (new) formats
                if isinstance(feature_data, str):
                    feature = Feature(
                        product_id=product.id,
                        name=feature_data,
                        status=FeatureStatus.BACKLOG,
                        priority=3,
                        created_at=datetime.utcnow(),
                        created_by=startup.user_id # Assign creator
                    )
                else:
                    feature = Feature(
                        product_id=product.id,
                        name=feature_data.get('name'),
                        description=feature_data.get('description'),
                        user_story=feature_data.get('user_story'),
                        acceptance_criteria=feature_data.get('acceptance_criteria'),
                        priority=feature_data.get('priority', 3),
                        status=FeatureStatus.BACKLOG,
                        created_at=datetime.utcnow(),
                        created_by=startup.user_id
                    )
                    
                    # RICE Scoring
                    rice = feature_data.get('rice_scores', {})
                    if rice:
                        feature.rice_reach = rice.get('reach')
                        feature.rice_impact = rice.get('impact')
                        feature.rice_confidence = rice.get('confidence')
                        feature.rice_effort = rice.get('effort')
                        
                        # Calculate Score: (R * I * C%) / E
                        try:
                            if feature.rice_effort and feature.rice_effort > 0:
                                score = (feature.rice_reach * feature.rice_impact * (feature.rice_confidence / 100)) / feature.rice_effort
                                feature.rice_score = round(score, 2)
                                
                                # Generate effort estimate (T-shirt sizing) based on RICE effort
                                effort_map = {1: 'XS', 2: 'S', 3: 'M', 4: 'L', 5: 'L'}
                                if feature.rice_effort <= 2:
                                    feature.effort_estimate = effort_map.get(feature.rice_effort, 'XS')
                                elif feature.rice_effort <= 4:
                                    feature.effort_estimate = 'M'
                                elif feature.rice_effort <= 6:
                                    feature.effort_estimate = 'L'
                                else:
                                    feature.effort_estimate = 'XL'
                        except:
                            pass

                db.session.add(feature)
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Error: Failed to decode JSON for product generation for startup ID: {startup_id}. Raw output: {product_json_str} ---")
            return

        # Notify product generated
        try:
            publish_update("product_generated", 
                           {"startup_id": startup.id, "product": product.to_dict()}, 
                           rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
             print(f"Error publishing product_generated event: {e}")


        # --- Generate Product Metrics ---
        metrics_data = [] # Initialize metrics_data to an empty list
        metrics_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define 3-5 key product metrics to track for the MVP. \n"
            "For each metric, provide:\n"
            "- 'metric_name': Name of the metric (e.g., 'Daily Active Users')\n"
            "- 'target_value': Suggested target/goal value (numeric)\n"
            "- 'unit': Unit of measurement (e.g., 'users', '%', '$', 'sessions')\n"
            "- 'period': Tracking period ('daily', 'weekly', 'monthly', 'quarterly')\n\n"
            "Output a JSON object with a 'metrics' key containing an array of metric objects.\n\n"
            "Scope Document:\n{scope_content}"
        )
        metrics_chain = metrics_prompt | llm
        metrics_json_str = metrics_chain.invoke({"scope_content": scope_content}).content
        
        try:
            raw_metrics_output = json.loads(metrics_json_str)
            if isinstance(raw_metrics_output, list):
                metrics_data = raw_metrics_output
            elif isinstance(raw_metrics_output, dict) and "metrics" in raw_metrics_output and isinstance(raw_metrics_output["metrics"], list):
                metrics_data = raw_metrics_output["metrics"]
            else:
                print(f"--- [Generation Task] Warning: Metrics data is not a list or a dictionary with a list under 'metrics' key for startup ID: {startup_id}. Raw output: {metrics_json_str} ---")
                
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for metrics generation for startup ID: {startup_id}. Raw output: {metrics_json_str} ---")

        if metrics_data:
            for metric_obj in metrics_data:
                # Handle both string (legacy) and object (new) formats
                if isinstance(metric_obj, str):
                    # Legacy format: just metric name
                    metric = ProductMetric(
                        product_id=product.id,
                        metric_name=metric_obj,
                        date_recorded=datetime.utcnow()
                    )
                elif isinstance(metric_obj, dict):
                    # New format: structured metric object
                    metric = ProductMetric(
                        product_id=product.id,
                        metric_name=metric_obj.get('metric_name'),
                        target_value=metric_obj.get('target_value'),
                        unit=metric_obj.get('unit'),
                        period=metric_obj.get('period'),
                        date_recorded=datetime.utcnow()
                    )
                else:
                    print(f"--- [Generation Task] Warning: Metric item is not a string or dict for startup ID: {startup_id}. Item: {metric_obj} ---")
                    continue
                    
                db.session.add(metric)


    if generate_gtm:
        # --- Generate Marketing Campaigns ---
        print(f"--- [Generation Task] Generating GTM for startup ID: {startup_id} ---")
        campaigns_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define 2-3 high-level marketing campaigns. "
            "For each campaign, provide a name and objective. "
            "Output a JSON array of objects, each with 'name' (string) and 'objective' (string) keys, e.g., [{{'name': 'Campaign 1', 'objective': '...'}}].\n\n"
            "Scope Document:\n{scope_content}"
        )
        campaigns_chain = campaigns_prompt | llm
        campaigns_json_str = campaigns_chain.invoke({"scope_content": scope_content}).content
        campaigns_data = [] # Initialize campaigns_data to an empty list
        
        try:
            raw_campaigns_output = json.loads(campaigns_json_str)
            if isinstance(raw_campaigns_output, list):
                campaigns_data = raw_campaigns_output
            elif isinstance(raw_campaigns_output, dict) and "campaigns" in raw_campaigns_output and isinstance(raw_campaigns_output["campaigns"], list):
                campaigns_data = raw_campaigns_output["campaigns"]
            else:
                print(f"--- [Generation Task] Warning: Campaigns data is not a list or a dictionary with a list under 'campaigns' key for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")

        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for marketing campaigns for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")
        
        if campaigns_data:
            for campaign_data_item in campaigns_data:
                if isinstance(campaign_data_item, dict):
                    campaign = MarketingCampaign(
                        startup_id=startup.id,
                        product_id=product.id if product else None,  # Link to generated product
                        campaign_name=campaign_data_item.get('name'),
                        objective=campaign_data_item.get('objective'),
                        created_by=startup.user_id,
                        content_mode=True, # Set content_mode to True
                        start_date=datetime.utcnow()
                    )
                    db.session.add(campaign)
                    db.session.flush() # to get campaign.id

                    # --- Generate Content Calendar ---
                    content_calendar_prompt = PromptTemplate.from_template(
                        "For the '{campaign_name}' marketing campaign, generate a content calendar with 3-5 content ideas. "
                        "For each content item, provide:\n"
                        "1. 'title' (string): A catchy headline.\n"
                        "2. 'description' (string): The caption or body copy.\n"
                        "3. 'platform' (string): Best platform for this content (e.g., LinkedIn, Instagram, Blog).\n"
                        "4. 'image_idea' (string): A detailed visual description for an AI image generator to create an accompanying image.\n\n"
                        "Output a JSON array of objects, e.g., [{{'title': '...', 'description': '...', 'platform': 'LinkedIn', 'image_idea': 'A professional photo of...'}}].\n\n"
                        "Campaign Objective:\n{campaign_objective}"
                    )
                    content_calendar_chain = content_calendar_prompt | llm
                    content_calendar_json_str = content_calendar_chain.invoke({
                        "campaign_name": campaign.campaign_name,
                        "campaign_objective": campaign.objective
                    }).content
                    content_calendar_data = [] # Initialize content_calendar_data to an empty list
                    
                    try:
                        raw_content_calendar_output = json.loads(content_calendar_json_str)
                        if isinstance(raw_content_calendar_output, list):
                            content_calendar_data = raw_content_calendar_output
                        elif isinstance(raw_content_calendar_output, dict) and "content_calendar" in raw_content_calendar_output and isinstance(raw_content_calendar_output["content_calendar"], list):
                            content_calendar_data = raw_content_calendar_output["content_calendar"]
                        elif isinstance(raw_content_calendar_output, dict) and "content" in raw_content_calendar_output and isinstance(raw_content_calendar_output["content"], list):
                            content_calendar_data = raw_content_calendar_output["content"]
                        else:
                            print(f"--- [Generation Task] Warning: Content calendar data is not a list or a dictionary with a list under 'content_calendar' key for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                        
                        if content_calendar_data:
                            content_calendar = MarketingContentCalendar(
                                campaign_id=campaign.campaign_id,
                                title=f"Content Calendar for {campaign.campaign_name}",
                                description=f"Scheduled content for {campaign.campaign_name} campaign",
                                owner_id=startup.user_id,
                                start_date=datetime.utcnow()
                            )
                            db.session.add(content_calendar)
                            db.session.flush() # to get content_calendar.id

                            publish_date = datetime.utcnow()
                            last_publish_date = None
                            for item_data in content_calendar_data:
                                if isinstance(item_data, dict):
                                    channel = item_data.get('platform', 'General')
                                    
                                    # Infer content_type from channel
                                    content_type_map = {
                                        'LinkedIn': 'Social Post',
                                        'Instagram': 'Social Post',
                                        'Facebook': 'Social Post',
                                        'Twitter': 'Social Post',
                                        'X': 'Social Post',
                                        'Blog': 'Blog Article',
                                        'Email': 'Email Campaign',
                                        'YouTube': 'Video',
                                        'TikTok': 'Video'
                                    }
                                    content_type = content_type_map.get(channel, 'Post')
                                    
                                    content_item = MarketingContentItem(
                                        calendar_id=content_calendar.calendar_id,
                                        title=item_data.get('title'),
                                        content_type=content_type,  # Inferred from channel
                                        content_brief=item_data.get('description'), # Map description to brief
                                        content_body=None, # Leave body empty for generation
                                        channel=channel, # Map platform to channel
                                        media_type='image' if item_data.get('image_idea') else 'text_only',
                                        image_prompt=item_data.get('image_idea'),
                                        created_by=startup.user_id,
                                        publish_date=publish_date,
                                        created_at=datetime.utcnow()
                                    )
                                    
                                    # Track last publish date for calendar end_date
                                    if last_publish_date is None or publish_date > last_publish_date:
                                        last_publish_date = publish_date
                                    
                                    # Generate Image if prompt exists
                                    if content_item.image_prompt:
                                        image_url = generate_marketing_image(content_item.image_prompt)
                                        content_item.image_url = image_url

                                    db.session.add(content_item)
                                    publish_date += timedelta(days=3)
                                else:
                                    print(f"--- [Generation Task] Warning: Content item is not a dictionary for campaign '{campaign.campaign_name}'. Item: {item_data} ---")
                            
                            # Set calendar end_date based on last publish date
                            if last_publish_date:
                                content_calendar.end_date = last_publish_date
                            
                            # --- Update Campaign with Channel and End Date ---
                            # Aggregate unique channels from content items
                            channels = set()
                            last_publish_date = None
                            for item in content_calendar.content_items:
                                if item.channel:
                                    channels.add(item.channel)
                                if item.publish_date:
                                    if last_publish_date is None or item.publish_date > last_publish_date:
                                        last_publish_date = item.publish_date
                            
                            # Update campaign with aggregated data
                            if channels:
                                campaign.channel = ", ".join(sorted(channels))
                            if last_publish_date:
                                # Add 7 days buffer after last publish date
                                campaign.end_date = last_publish_date + timedelta(days=7)
                            
                        else:
                            print(f"--- [Generation Task] Warning: No content calendar data to process for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                    except json.JSONDecodeError:
                        print(f"--- [Generation Task] Warning: Failed to decode JSON for content calendar for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                else:
                    print(f"--- [Generation Task] Warning: Campaign item is not a dictionary for startup ID: {startup_id}. Item: {campaign_data_item} ---")
        else:
            print(f"--- [Generation Task] Warning: No campaigns data to process for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")

        # Notify campaigns generated
        try:
            # Re-fetch campaigns to ensure we have all data if needed, or just send a signal
            campaigns = MarketingCampaign.query.filter_by(startup_id=startup.id).all()
            if campaigns:
                publish_update("campaigns_generated", 
                               {"startup_id": startup.id, "campaigns": [c.to_dict() for c in campaigns]}, 
                               rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
            print(f"Error publishing campaigns_generated event: {e}")


        # --- Generate Brand Identity (Positioning + Voice) ---
        brand_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define the brand identity for the startup.\n"
            "1. Write a concise positioning statement (single sentence).\n"
            "2. Define the Tone of Voice (e.g., Professional, Witty, Empathetic).\n"
            "3. Identify the Brand Archetype (e.g., The Creator, The Ruler).\n"
            "4. List 3 key Target Audiences.\n"
            "5. List 3 Key Messaging Pillars.\n\n"
            "Output a JSON object with keys:\n"
            "- 'positioning_statement' (string)\n"
            "- 'brand_details' (object with keys: 'tone_of_voice' (string), 'brand_archetype' (string), 'target_audience' (list of strings), 'key_messaging_pillars' (list of strings)).\n\n"
            "Scope Document:\n{scope_content}"
        )
        brand_chain = brand_prompt | llm
        brand_json_str = brand_chain.invoke({"scope_content": scope_content}).content

        try:
            brand_data = json.loads(brand_json_str)
            positioning_statement = brand_data.get('positioning_statement')
            brand_details = brand_data.get('brand_details')

            if positioning_statement or brand_details:
                marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
                if not marketing_overview:
                    marketing_overview = MarketingOverview(startup_id=startup.id)
                    db.session.add(marketing_overview)
                
                if positioning_statement:
                    marketing_overview.positioning_statement = positioning_statement
                
                if brand_details:
                    marketing_overview.brand_details = brand_details
                
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for brand identity for startup ID: {startup_id}. Raw output: {brand_json_str} ---")


    db.session.commit()
    
    publish_update("assets_generated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])
    
    print(f"--- [Generation Task] Successfully generated assets for startup ID: {startup.id} ---")

def generate_ad_hoc_content(startup_id, topic, channel, content_type='text_only'):
    """
    Generates a single ad-hoc content item for a startup.
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        print(f"--- [Ad-Hoc Task] Error: Startup not found for ID {startup_id}. ---")
        return None

    # Get Brand Voice context
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    brand_context = ""
    if marketing_overview and marketing_overview.brand_details:
        details = marketing_overview.brand_details
        brand_context = (
            f"Tone: {details.get('tone_of_voice', 'Professional')}.\n"
            f"Target Audience: {', '.join(details.get('target_audience', []))}.\n"
            f"Brand Archetype: {details.get('brand_archetype', 'N/A')}."
        )

    # Find or Create "Ad-Hoc" Campaign and Calendar
    ad_hoc_campaign = MarketingCampaign.query.filter_by(startup_id=startup.id, campaign_name="Ad-Hoc Content").first()
    if not ad_hoc_campaign:
        ad_hoc_campaign = MarketingCampaign(
            startup_id=startup.id,
            campaign_name="Ad-Hoc Content",
            objective="To store single, quick-create content items.",
            created_by=startup.user_id,
            content_mode=True,
            start_date=datetime.utcnow()
        )
        db.session.add(ad_hoc_campaign)
        db.session.flush()

    ad_hoc_calendar = MarketingContentCalendar.query.filter_by(campaign_id=ad_hoc_campaign.campaign_id).first()
    if not ad_hoc_calendar:
        ad_hoc_calendar = MarketingContentCalendar(
            campaign_id=ad_hoc_campaign.campaign_id,
            title="Ad-Hoc Content Calendar",
            description="Calendar for ad-hoc items",
            owner_id=startup.user_id,
            start_date=datetime.utcnow()
        )
        db.session.add(ad_hoc_calendar)
        db.session.flush()
    
    # Initialize LLM
    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=2000,
        model_kwargs={"response_format": {"type": "json_object"}}
    )

    # Generate Content
    prompt = PromptTemplate.from_template(
        "Generate a marketing content item for specific channel.\n"
        "Brand Context:\n{brand_context}\n\n"
        "Topic: {topic}\n"
        "Channel: {channel}\n"
        "Content Type: {content_type}\n\n"
        "If content type implies an image (like 'Post with Image'), provide a detailed 'image_idea' prompt for DALL-E.\n"
        "Output JSON with keys: 'title', 'content_body', 'image_idea' (optional)."
    )
    
    chain = prompt | llm
    result_json = chain.invoke({
        "brand_context": brand_context,
        "topic": topic,
        "channel": channel,
        "content_type": content_type
    }).content

    try:
        data = json.loads(result_json)
        
        content_item = MarketingContentItem(
            calendar_id=ad_hoc_calendar.calendar_id,
            title=data.get('title', f"Ad-Hoc: {topic[:20]}..."),
            content_body=data.get('content_body'),
            channel=channel,
            media_type='image' if data.get('image_idea') else 'text_only',
            image_prompt=data.get('image_idea'),
            created_by=startup.user_id,
            publish_date=datetime.utcnow(),
            status='DRAFT'
        )

        if content_item.image_prompt:
            image_url = generate_marketing_image(content_item.image_prompt)
            content_item.image_url = image_url

        db.session.add(content_item)
        db.session.commit()
        
        return content_item.to_dict()

    except Exception as e:
        print(f"Error generating ad-hoc content: {e}")
        return None

def generate_final_content(startup_id, content_id):
    """
    Generates the final content body for a content item based on its brief and optional brand context.
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        print(f"--- [Generate Content] Error: Startup not found for ID {startup_id}. ---")
        return None

    content_item = MarketingContentItem.query.get(content_id)
    if not content_item:
        print(f"--- [Generate Content] Error: Content item not found for ID {content_id}. ---")
        return None

    # Get Brand Voice context
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    brand_context = ""
    if marketing_overview and marketing_overview.brand_details:
        details = marketing_overview.brand_details
        brand_context = (
            f"Tone: {details.get('tone_of_voice', 'Professional')}.\n"
            f"Target Audience: {', '.join(details.get('target_audience', []))}.\n"
            f"Brand Archetype: {details.get('brand_archetype', 'N/A')}."
        )

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=2000,
    )

    prompt = PromptTemplate.from_template(
        "You are an expert content creator. Generate the final, publication-ready content body for a marketing post.\n\n"
        "Brand Identity:\n{brand_context}\n\n"
        "Content Channel: {channel} (Format the content appropriately for this specific platform, e.g., hashtags for Twitter/Instagram, subject line if Email).\n"
        "Content Type: {content_type}\n"
        "Content Brief/Instruction: {content_brief}\n\n"
        "Task: Write the final content body text. Do not include 'Title:' or metadata, just the actual post content."
    )

    chain = prompt | llm
    result = chain.invoke({
        "brand_context": brand_context,
        "channel": content_item.channel or "General",
        "content_type": content_item.content_type or "Post",
        "content_brief": content_item.content_brief or content_item.title
    }).content

    # Clean up result (remove quotes if wrapped)
    final_content = result.strip().strip('"')

    content_item.content_body = final_content
    content_item.status = 'DRAFT' # Ensure it's in draft mode after generation
    db.session.commit()

    return content_item.to_dict()
def generate_campaign_content_calendar(startup_id, campaign_id):
    """
    Generates a smart content calendar for a campaign based on brand context,
    channel best practices, and campaign objectives.
    """
    startup = Startup.query.get(startup_id)
    campaign = MarketingCampaign.query.get(campaign_id)
    
    if not startup or not campaign:
        print(f"--- [Generation Task] Error: Startup {startup_id} or Campaign {campaign_id} not found. ---")
        return

    # 1. Gather Context
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    brand_context = ""
    if marketing_overview and marketing_overview.brand_details:
        details = marketing_overview.brand_details
        brand_context = (
            f"Tone: {details.get('tone_of_voice', 'Professional')}.\n"
            f"Target Audience: {', '.join(details.get('target_audience', []))}.\n"
            f"Brand Archetype: {details.get('brand_archetype', 'N/A')}."
        )

    product_context = ""
    if campaign.product_id:
        product = Product.query.get(campaign.product_id)
        if product:
             product_context = f"Product Name: {product.name}\nDescription: {product.description}"
    
    # Startup Context (fallback or addition)
    startup_context = ""
    if startup.scope_document:
         # Using a truncated version of scope if needed, or just relying on brand/product
         # Let's use the startup description if available, otherwise rely on scope content snippet
         pass


    # 2. Prepare Prompt
    # Strict channel enforcement
    channels = campaign.channel # "LinkedIn, Facebook" string
    start_date = campaign.start_date.strftime('%Y-%m-%d') if campaign.start_date else datetime.utcnow().strftime('%Y-%m-%d')

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=4000,
        model_kwargs={"response_format": {"type": "json_object"}}
    )

    prompt = PromptTemplate.from_template(
        "You are an expert Social Media Manager. Create a content calendar for a marketing campaign.\n\n"
        "--- Context ---\n"
        "Campaign Name: {campaign_name}\n"
        "Objective: {objective}\n"
        "Start Date: {start_date}\n"
        "Brand Identity: {brand_context}\n"
        "Product/Service Context: {product_context}\n\n"
        "--- Constraints ---\n"
        "1. **Strictly** generate content ONLY for these channels: {channels}.\n"
        "2. **Smart Scheduling**: Schedule posts based on best practices (e.g., LinkedIn 3x/week, verify gaps). "
        "Calculate 'publish_date' for each item starting from {start_date}.\n"
        "3. **Content Mix**: ongoing engagement + promotional.\n\n"
        "--- Output ---\n"
        "Return a JSON object with a key 'content_calendar' containing a list of items.\n"
        "Each item must have:\n"
        "- 'title': Catchy headline.\n"
        "- 'content_brief': Description of the post content.\n"
        "- 'channel': One of the allowed channels.\n"
        "- 'media_type': 'image', 'video', or 'text_only'.\n"
        "- 'image_idea': (Optional) detailed prompt for image generation if media_type is image.\n"
        "- 'publish_date': YYYY-MM-DD string.\n"
    )

    chain = prompt | llm
    
    try:
        print(f"--- [Generation Task] Generating calendar for Campaign {campaign.campaign_name}... ---")
        result_json = chain.invoke({
            "campaign_name": campaign.campaign_name,
            "objective": campaign.objective,
            "start_date": start_date,
            "brand_context": brand_context,
            "product_context": product_context,
            "channels": channels
        }).content
        
        data = json.loads(result_json)
        items = data.get('content_calendar', [])

        if not items:
            print("--- [Generation Task] Warning: No items generated. ---")
            return

        # 3. Save to DB
        # Ensure Calendar Exists
        calendar = MarketingContentCalendar.query.filter_by(campaign_id=campaign.campaign_id).first()
        if not calendar:
            calendar = MarketingContentCalendar(
                campaign_id=campaign.campaign_id,
                title=f"Content Calendar: {campaign.campaign_name}",
                owner_id=startup.user_id,
                start_date=campaign.start_date
            )
            db.session.add(calendar)
            db.session.flush()

        for item in items:
            p_date = datetime.strptime(item.get('publish_date'), '%Y-%m-%d').date()
            
            content_item = MarketingContentItem(
                calendar_id=calendar.calendar_id,
                title=item.get('title'),
                content_brief=item.get('content_brief'),
                channel=item.get('channel'),
                media_type=item.get('media_type', 'text_only'),
                image_prompt=item.get('image_idea'),
                publish_date=p_date,
                status='DRAFT',
                created_by=startup.user_id
            )

            # Generate image if needed
            if content_item.image_prompt and content_item.media_type == 'image':
                 try:
                     image_url = generate_marketing_image(content_item.image_prompt)
                     content_item.image_url = image_url
                 except Exception as img_err:
                     print(f"Failed to generate image: {img_err}")

            db.session.add(content_item)

        db.session.commit()
        
        # Publish update
        publish_update("calendar_generated", {"startup_id": startup.id, "campaign_id": campaign.campaign_id}, rooms=[f"user_{startup.user_id}", "admin"])
        print(f"--- [Generation Task] Success: Generated {len(items)} items. ---")

    except Exception as e:
        print(f"--- [Generation Task] Error: {e} ---")
        import traceback
        traceback.print_exc()

def classify_email_content(sender, subject, snippet):
    """
    Classifies an email to determine if it's relevant for the CRM.
    Returns a dict with 'category' and 'relevance_score'.
    """
    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.0, # Deterministic
        max_tokens=200,
        model_kwargs={"response_format": {"type": "json_object"}}
    )

    prompt = PromptTemplate.from_template(
        "Analyze this email metadata to see if it is relevant business communication for a CRM.\n\n"
        "Sender: {sender}\n"
        "Subject: {subject}\n"
        "Snippet: {snippet}\n\n"
        "Categories: 'Opportunity' (Sales/Lead), 'Meeting' (Scheduling), 'Support' (Help), 'Internal' (Team), 'Newsletter' (Marketing), 'Spam', 'Recruitment', 'Partnership' (BizDev/Vendor), 'Legal' (Contracts/Admin), 'Other'.\n"
        "Score: 0-10 (10 = Critical Business Value, 5 = Neutral/Routine, 0 = Spam/Noise).\n"
        "Criteria for High Score (>5): Sales leads, important partnerships, legal/contracts, urgent support, investor relations.\n\n"
        "Output JSON with keys: 'category' (string), 'relevance_score' (integer)."
    )
    
    chain = prompt | llm
    
    try:
        result_json = chain.invoke({
            "sender": sender,
            "subject": subject,
            "snippet": snippet
        }).content
        return json.loads(result_json)
    except Exception as e:
        print(f"Classification Error: {e}")
        # Default fallback
        return {"category": "Other", "relevance_score": 5}

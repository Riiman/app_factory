"""
Example: How to use V4 Integration Helper in V3 Developer

This shows how to integrate V4 components into the V3 Developer agent.
"""

# In developer.py __init__:
# self.v4_helper = None

# In developer_node, after startup_id is available:
if not self.v4_helper or self.v4_helper.startup_id != startup_id:
    from ...v4.integration_helper import V4IntegrationHelper
    self.v4_helper = V4IntegrationHelper(startup_id)

# Example 1: Query similar successful missions before starting a task
similar_missions = self.v4_helper.query_similar_missions(
    mission_type=current_mission.get('type', 'general'),
    task_description=next_task['description'],
    k=3
)

if similar_missions:
    # Add to task context
    similar_context = "\\n\\nSimilar successful approaches:\\n"
    for i, mission in enumerate(similar_missions, 1):
        similar_context += f"{i}. {mission.get('content', '')[:200]}...\\n"
    
    if "task_context" not in next_task:
        next_task["task_context"] = []
    next_task["task_context"].append(similar_context)

# Example 2: Use enhanced prompting (if enabled)
enhanced_prompt = self.v4_helper.build_enhanced_prompt(
    task=next_task,
    mission=current_mission,
    project_info={"name": "MyApp", "tech_stack": ["React", "Node.js"]},
    strategy_guidance=strategy_guidance  # From safety coordinator
)

if enhanced_prompt:
    # Use enhanced_prompt instead of system_prompt
    system_prompt = enhanced_prompt

# Example 3: Record task success
if task_completed_successfully:
    self.v4_helper.record_success(
        mission_type=current_mission.get('type', 'general'),
        task_description=next_task['description'],
        approach=f"Used {tool_name}",
        execution_time=execution_time,
        quality_score=8.5
    )

# Example 4: Record task failure
if task_failed:
    self.v4_helper.record_failure(
        mission_type=current_mission.get('type', 'general'),
        task_description=next_task['description'],
        approach=f"Attempted {tool_name}",
        error_message=error_message,
        execution_time=execution_time
    )

# Example 5: Use code patterns
pattern = self.v4_helper.get_code_pattern("express_rest_endpoint")
if pattern:
    # Use pattern as reference or template
    pass

# Example 6: Multi-pass code generation (if enabled)
generated_code = self.v4_helper.generate_code_multipass(
    task_description="Create user authentication endpoint",
    language="javascript",
    context={"complexity": "medium"}
)

if generated_code:
    # Use generated_code
    pass

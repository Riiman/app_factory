"""
Example: Integrating V4 Safety Systems with V3 Developer

This shows how to integrate the new V4 safety systems into the existing V3 Developer agent.
"""

from app.startup_builder.v4.safety import CircuitBreakerCoordinator, CircuitBreakerConfig
from app.startup_builder.v4.safety.safety_coordinator import SafetyCoordinator
from app.startup_builder.v4.knowledge import StrategyMemory

# Example integration in V3 Developer's developer_node method

def enhanced_developer_node_example(self, state, injected_result=None):
    """
    Enhanced developer_node with V4 safety systems.
    
    This is an example of how to integrate V4 safety into V3.
    """
    
    # Initialize V4 safety systems
    safety = SafetyCoordinator(
        circuit_config=CircuitBreakerConfig(
            max_identical_calls=3,
            max_consecutive_failures=5,
            max_calls_per_task=50,
            max_cost_usd=5.0,
            max_time_seconds=300
        )
    )
    
    safety.start_task()
    
    # Get current task
    next_task = self._get_next_task(state)
    
    # Load failed attempts into strategy memory
    if next_task.get("failed_attempts"):
        for attempt in next_task["failed_attempts"]:
            safety.record_tool_failure(
                tool_name=attempt.get("action"),
                args=attempt.get("command", {}),
                error_type=attempt.get("error", {}).get("error_type", "Unknown"),
                error_message=attempt.get("error", {}).get("error_message", ""),
                attempt_number=attempt.get("attempt_number", 0)
            )
    
    # Get strategy guidance for LLM
    strategy_guidance = safety.get_strategy_guidance()
    
    # Inject into system prompt
    system_prompt = self._build_system_prompt(next_task)
    system_prompt += strategy_guidance
    
    # Tool execution loop
    messages = [HumanMessage(content=self._build_user_prompt(next_task))]
    
    while True:
        # Check safety before LLM call
        safety_status = safety.check_safety()
        if not safety_status.safe:
            # Safety violation - escalate
            return {
                "status": "failed",
                "reason": f"Safety violation: {', '.join(safety_status.violations)}",
                "logs": [f"Safety system blocked execution: {v}" for v in safety_status.violations]
            }
        
        # Call LLM
        res = self.copilot.act(system_prompt, messages, tools=tools)
        
        # Record LLM call (estimate tokens for now)
        safety.record_llm_call(
            model="gemini-pro",
            input_tokens=len(system_prompt) // 4,  # Rough estimate
            output_tokens=len(str(res)) // 4,
            purpose="code_generation"
        )
        
        ai_msg = res["content"]
        messages.append(ai_msg)
        
        # Process tool calls
        if ai_msg.tool_calls:
            for tool_call in ai_msg.tool_calls:
                tool_name = tool_call["name"]
                args = tool_call["args"]
                
                # CHECK: Should this tool call be allowed?
                allowed, reason = safety.check_tool_call(tool_name, args)
                
                if not allowed:
                    # Tool call blocked by safety system
                    self.copilot.emit_thought(
                        f"⚠️ Tool call blocked: {reason}",
                        "developer"
                    )
                    
                    # Inject feedback into conversation
                    feedback = f"""
SYSTEM HALT: {reason}

You MUST try a DIFFERENT approach. Consider:
1. Using a different tool
2. Changing the parameters significantly
3. Calling `run_diagnosis` for expert analysis

DO NOT retry the same approach that was just blocked.
"""
                    messages.append(HumanMessage(content=feedback))
                    continue  # Skip this tool call
                
                # Execute tool
                selected_tool = next((t for t in tools if t.name == tool_name), None)
                if selected_tool:
                    tool_result = selected_tool.invoke(args)
                    
                    # Record tool call
                    safety.record_tool_call(tool_name, args, tool_result)
                    
                    # Check if it failed
                    if self._is_failure(tool_result):
                        error_info = self._extract_error_info(tool_name, str(args), tool_result)
                        safety.record_tool_failure(
                            tool_name=tool_name,
                            args=args,
                            error_type=error_info.get("error_type", "Unknown"),
                            error_message=error_info.get("error_message", ""),
                            attempt_number=next_task.get("attempt_count", 0)
                        )
                    
                    messages.append(ToolMessage(content=tool_result, tool_call_id=tool_call["id"]))
        
        else:
            # No tool calls - check for completion
            break
    
    # Get final safety status
    final_status = safety.get_status_summary()
    self.copilot.emit_thought(f"Safety Summary:\n{final_status}", "developer")
    
    return {
        "status": "coding",
        "logs": ["Task completed with V4 safety systems"]
    }


# Example: Using Safety Coordinator standalone

def example_usage():
    """Example of using Safety Coordinator"""
    
    # Initialize
    safety = SafetyCoordinator()
    safety.start_task()
    
    # Simulate tool calls
    for i in range(5):
        tool_name = "read_process_logs"
        args = {"alias": "expo_mobile_8083"}
        
        # Check if allowed
        allowed, reason = safety.check_tool_call(tool_name, args)
        
        if not allowed:
            print(f"❌ Blocked: {reason}")
            break
        
        # Simulate execution
        result = "empty output"
        safety.record_tool_call(tool_name, args, result)
        print(f"✅ Call {i+1} executed")
    
    # Check overall safety
    status = safety.check_safety()
    print(f"\nSafety Status: {'✅ Safe' if status.safe else '⚠️ Violations'}")
    print(f"Violations: {status.violations}")
    print(f"Warnings: {status.warnings}")
    
    # Get summary
    print(f"\n{safety.get_status_summary()}")


if __name__ == "__main__":
    example_usage()

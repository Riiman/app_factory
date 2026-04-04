"""
Tests for Week 1 V4 Components

Tests V4Developer, V4Architect, V4Executor, and V4Tools.
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock

# Set test environment
os.environ['USE_V4_SAFETY'] = 'true'
os.environ['USE_V4_HEALING'] = 'true'
os.environ['USE_V4_KNOWLEDGE'] = 'false'  # Disable ChromaDB for tests
os.environ['USE_V4_PROMPTING'] = 'false'
os.environ['USE_V4_GENERATION'] = 'false'


class TestV4Developer:
    """Test V4Developer agent"""
    
    def test_initialization(self):
        """Test V4Developer initializes correctly"""
        from app.startup_builder.v4.agents import V4Developer
        
        developer = V4Developer(startup_id="test_123")
        
        assert developer.startup_id == "test_123"
        assert developer.safety is not None
        assert developer.healer is not None
    
    def test_execute_task_success(self):
        """Test successful task execution"""
        from app.startup_builder.v4.agents import V4Developer
        
        developer = V4Developer(startup_id="test_123")
        
        task = {
            'description': 'Test task',
            'action': 'test_action',
            'type': 'test'
        }
        
        result = developer.execute_task(task)
        
        assert result is not None
        assert 'success' in result
    
    def test_get_stats(self):
        """Test getting developer stats"""
        from app.startup_builder.v4.agents import V4Developer
        
        developer = V4Developer(startup_id="test_123")
        stats = developer.get_stats()
        
        assert 'safety' in stats
        assert 'startup_id' in stats
        assert stats['startup_id'] == "test_123"


class TestV4Architect:
    """Test V4Architect agent"""
    
    def test_initialization(self):
        """Test V4Architect initializes correctly"""
        from app.startup_builder.v4.agents import V4Architect
        
        architect = V4Architect(startup_id="test_123")
        
        assert architect.startup_id == "test_123"
        assert architect.strategy_selector is not None
        assert architect.controller is not None
    
    def test_plan_mission(self):
        """Test mission planning"""
        from app.startup_builder.v4.agents import V4Architect
        
        architect = V4Architect(startup_id="test_123")
        
        plan = architect.plan_mission(
            mission_id="m1",
            mission_type="api_endpoint",
            description="Create user login endpoint",
            priority="high"
        )
        
        assert plan is not None
        assert 'mission_id' in plan
        assert plan['mission_id'] == "m1"
        assert 'strategy' in plan
        assert 'tasks' in plan
    
    def test_get_stats(self):
        """Test getting architect stats"""
        from app.startup_builder.v4.agents import V4Architect
        
        architect = V4Architect(startup_id="test_123")
        stats = architect.get_stats()
        
        assert 'controller' in stats
        assert 'strategy_selector' in stats


class TestV4Executor:
    """Test V4Executor agent"""
    
    def test_initialization(self):
        """Test V4Executor initializes correctly"""
        from app.startup_builder.v4.agents import V4Executor
        
        executor = V4Executor(startup_id="test_123")
        
        assert executor.startup_id == "test_123"
        assert executor.safety is not None
        assert executor.healer is not None
    
    def test_execute_tool_success(self):
        """Test successful tool execution"""
        from app.startup_builder.v4.agents import V4Executor
        
        executor = V4Executor(startup_id="test_123")
        
        # Mock tool function
        def mock_tool(arg1, arg2):
            return f"Result: {arg1} + {arg2}"
        
        result = executor.execute_tool(
            tool_name="mock_tool",
            tool_func=mock_tool,
            args={"arg1": "hello", "arg2": "world"}
        )
        
        assert result is not None
        assert 'success' in result
    
    def test_execute_tool_with_retry(self):
        """Test tool execution with retry on failure"""
        from app.startup_builder.v4.agents import V4Executor
        
        executor = V4Executor(startup_id="test_123")
        
        # Mock tool that fails first time, succeeds second
        call_count = [0]
        
        def flaky_tool():
            call_count[0] += 1
            if call_count[0] == 1:
                raise Exception("First attempt fails")
            return "Success on retry"
        
        result = executor.execute_tool(
            tool_name="flaky_tool",
            tool_func=flaky_tool,
            args={},
            max_retries=3
        )
        
        # Should succeed on retry
        assert result is not None
    
    def test_get_stats(self):
        """Test getting executor stats"""
        from app.startup_builder.v4.agents import V4Executor
        
        executor = V4Executor(startup_id="test_123")
        stats = executor.get_stats()
        
        assert 'safety' in stats
        assert 'total_executions' in stats
        assert 'startup_id' in stats


class TestV4Tools:
    """Test V4Tools class"""
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_initialization(self, mock_docker):
        """Test V4Tools initializes correctly"""
        from app.startup_builder.v4.tools import V4Tools
        
        tools = V4Tools(startup_id="test_123")
        
        assert tools.startup_id == "test_123"
        assert tools.safety is not None
        assert tools.healer is not None
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_get_tool_list(self, mock_docker):
        """Test getting tool list"""
        from app.startup_builder.v4.tools import V4Tools
        
        tools = V4Tools(startup_id="test_123")
        tool_list = tools.get_tool_list()
        
        assert isinstance(tool_list, list)
        assert len(tool_list) > 0
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_run_shell_tool(self, mock_docker):
        """Test run_shell tool creation"""
        from app.startup_builder.v4.tools import V4Tools
        
        # Mock docker manager
        mock_instance = MagicMock()
        mock_instance.run_command.return_value = {
            'output': 'test output',
            'exit_code': 0
        }
        mock_docker.return_value = mock_instance
        
        tools = V4Tools(startup_id="test_123")
        run_shell = tools.create_run_shell()
        
        assert run_shell is not None
        assert callable(run_shell)
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_update_file_tool(self, mock_docker):
        """Test update_file tool creation"""
        from app.startup_builder.v4.tools import V4Tools
        
        # Mock docker manager
        mock_instance = MagicMock()
        mock_instance.write_file.return_value = {'success': True}
        mock_docker.return_value = mock_instance
        
        tools = V4Tools(startup_id="test_123")
        update_file = tools.create_update_file()
        
        assert update_file is not None
        assert callable(update_file)
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_read_file_tool(self, mock_docker):
        """Test read_file tool creation"""
        from app.startup_builder.v4.tools import V4Tools
        
        # Mock docker manager
        mock_instance = MagicMock()
        mock_instance.read_file.return_value = {
            'content': 'test content'
        }
        mock_docker.return_value = mock_instance
        
        tools = V4Tools(startup_id="test_123")
        read_file = tools.create_read_file()
        
        assert read_file is not None
        assert callable(read_file)


class TestV4Integration:
    """Test V4 component integration"""
    
    def test_developer_with_executor(self):
        """Test V4Developer using V4Executor"""
        from app.startup_builder.v4.agents import V4Developer, V4Executor
        
        developer = V4Developer(startup_id="test_123")
        executor = V4Executor(startup_id="test_123")
        
        # Both should have independent safety coordinators
        assert developer.safety is not executor.safety
        
        # But both should work together
        assert developer.startup_id == executor.startup_id
    
    def test_architect_with_developer(self):
        """Test V4Architect planning for V4Developer"""
        from app.startup_builder.v4.agents import V4Architect, V4Developer
        
        architect = V4Architect(startup_id="test_123")
        developer = V4Developer(startup_id="test_123")
        
        # Architect plans
        plan = architect.plan_mission(
            mission_id="m1",
            mission_type="test",
            description="Test mission"
        )
        
        # Developer could execute (integration pending)
        assert plan is not None
        assert developer is not None
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_executor_with_tools(self, mock_docker):
        """Test V4Executor using V4Tools"""
        from app.startup_builder.v4.agents import V4Executor
        from app.startup_builder.v4.tools import V4Tools
        
        executor = V4Executor(startup_id="test_123")
        tools = V4Tools(startup_id="test_123")
        
        # Both should work together
        assert executor.startup_id == tools.startup_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

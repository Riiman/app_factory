"""
Tests for Week 2 V4 Components

Tests workflows and routes.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock

# Set test environment
import os
os.environ['USE_V4_SAFETY'] = 'true'
os.environ['USE_V4_HEALING'] = 'true'
os.environ['USE_V4_KNOWLEDGE'] = 'false'


class TestMissionExecutor:
    """Test MissionExecutor workflow"""
    
    def test_initialization(self):
        """Test MissionExecutor initializes correctly"""
        from app.startup_builder.v4.workflows import MissionExecutor
        
        executor = MissionExecutor(startup_id="test_123")
        
        assert executor.startup_id == "test_123"
        assert executor.architect is not None
        assert executor.developer is not None
        assert executor.executor is not None
        assert executor.tools is not None
    
    def test_execute_mission(self):
        """Test mission execution"""
        from app.startup_builder.v4.workflows import MissionExecutor
        
        executor = MissionExecutor(startup_id="test_123")
        
        result = executor.execute_mission(
            mission_id="m1",
            mission_type="test",
            description="Test mission",
            priority="medium"
        )
        
        assert result is not None
        assert 'mission_id' in result
        assert result['mission_id'] == "m1"
        assert 'success' in result
        assert 'metrics' in result
    
    def test_get_stats(self):
        """Test getting executor stats"""
        from app.startup_builder.v4.workflows import MissionExecutor
        
        executor = MissionExecutor(startup_id="test_123")
        stats = executor.get_stats()
        
        assert 'startup_id' in stats
        assert 'architect' in stats
        assert 'developer' in stats
        assert 'executor' in stats


class TestTaskExecutor:
    """Test TaskExecutor workflow"""
    
    def test_initialization(self):
        """Test TaskExecutor initializes correctly"""
        from app.startup_builder.v4.workflows import TaskExecutor
        
        executor = TaskExecutor(startup_id="test_123")
        
        assert executor.startup_id == "test_123"
        assert executor.executor is not None
        assert executor.tools is not None
    
    @patch('app.startup_builder.v4.tools.v4_tools.DockerManager')
    def test_execute_task(self, mock_docker):
        """Test task execution"""
        from app.startup_builder.v4.workflows import TaskExecutor
        
        # Mock docker manager
        mock_instance = MagicMock()
        mock_instance.read_file.return_value = {'content': 'test content'}
        mock_docker.return_value = mock_instance
        
        executor = TaskExecutor(startup_id="test_123")
        
        result = executor.execute_task(
            task_type="read_file",
            task_data={"path": "test.txt"}
        )
        
        assert result is not None
        assert 'success' in result
        assert 'metrics' in result
    
    def test_get_stats(self):
        """Test getting task executor stats"""
        from app.startup_builder.v4.workflows import TaskExecutor
        
        executor = TaskExecutor(startup_id="test_123")
        stats = executor.get_stats()
        
        assert 'startup_id' in stats
        assert 'executor' in stats


class TestV4Routes:
    """Test V4 API routes"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        
        with app.test_client() as client:
            yield client
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/builder/v4/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'healthy'
        assert data['version'] == '4.0.0'
        assert 'features' in data
    
    def test_start_mission_missing_fields(self, client):
        """Test start mission with missing fields"""
        response = client.post(
            '/api/builder/v4/start',
            json={}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['status'] == 'error'
        assert 'Missing required fields' in data['error']
    
    def test_execute_task_missing_fields(self, client):
        """Test execute task with missing fields"""
        response = client.post(
            '/api/builder/v4/task',
            json={}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['status'] == 'error'
        assert 'Missing required fields' in data['error']


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

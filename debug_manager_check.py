import sys
import unittest.mock
from unittest.mock import MagicMock

# MOCK BEFORE IMPORTS
sys.modules['app.extensions'] = MagicMock()
sys.modules['app.models'] = MagicMock()
mock_startup = MagicMock()
mock_startup.container_name = "test_v3_live_container"
sys.modules['app.models'].Startup.query.get.return_value = mock_startup

from app.startup_builder.manager import DockerManager

print("Initializing Manager...")
dm = DockerManager()
startup_id = "live_test_v3"

print("Checking Container...")
# Should be fast since we started it manually
status = dm.ensure_container(startup_id, stack_type="MERN", container_name="test_v3_live_container")
print(f"Ensure Status: {status}")

print("Writing Test File...")
res = dm.write_file(startup_id, "test_file.txt", "Hello Debug", container_name="test_v3_live_container")
print(f"Write Result: {res}")

print("Reading Test File...")
read = dm.read_file(startup_id, "test_file.txt", container_name="test_v3_live_container")
print(f"Read content: {read.get('content')}")

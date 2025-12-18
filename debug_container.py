from app.startup_builder.manager import DockerManager
import logging

logging.basicConfig(level=logging.INFO)

print("Starting Docker Setup...")
dm = DockerManager()
startup_id = "test_v3_live_container"
res = dm.ensure_container("live_test_v3", stack_type="MERN", container_name="test_v3_live_container")
print(f"Result: {res}")

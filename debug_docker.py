from app.startup_builder.manager import DockerManager

manager = DockerManager()
startup_id = "2" # Assuming this is the ID
print(f"Testing run_command for startup_id: {startup_id}")

# Test 1: Simple failure
print("\n--- Test 1: 'false' ---")
result = manager.run_command(startup_id, "false")
print(f"Result: {result}")

# Test 2: npm install (which we know fails)
print("\n--- Test 2: 'npm install' ---")
result = manager.run_command(startup_id, "npm install")
print(f"Result: {result}")

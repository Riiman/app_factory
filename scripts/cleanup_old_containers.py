#!/usr/bin/env python3
"""
Simplified cleanup script to remove all old Docker containers with startup_dev_* pattern.
This version doesn't require the Flask app to be running.
"""
import docker
import sys

def cleanup_containers():
    """Stop and remove all containers matching startup_dev_* pattern."""
    try:
        client = docker.from_env()
    except Exception as e:
        print(f"Error connecting to Docker: {e}")
        print("\nMake sure Docker is running and you have permission to access it.")
        return False
    
    # List all containers (including stopped ones)
    all_containers = client.containers.list(all=True)
    
    removed_count = 0
    startup_containers = []
    
    for container in all_containers:
        if container.name.startswith('startup_dev_'):
            startup_containers.append(container)
    
    if not startup_containers:
        print("No containers found matching 'startup_dev_*' pattern.")
        return True
    
    print(f"\nFound {len(startup_containers)} container(s) to remove:\n")
    for container in startup_containers:
        print(f"  - {container.name} (status: {container.status})")
    
    print()
    for container in startup_containers:
        try:
            if container.status == 'running':
                print(f"Stopping {container.name}...")
                container.stop(timeout=5)
            print(f"Removing {container.name}...")
            container.remove()
            removed_count += 1
            print(f"✓ Removed {container.name}\n")
        except Exception as e:
            print(f"✗ Error removing {container.name}: {e}\n")
    
    print(f"Total containers removed: {removed_count}/{len(startup_containers)}")
    return True

if __name__ == '__main__':
    print("=" * 60)
    print("Docker Container Cleanup Script")
    print("=" * 60)
    print("\nThis script will stop and remove all Docker containers")
    print("with names starting with 'startup_dev_'")
    print()
    
    response = input("Do you want to continue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Aborted.")
        sys.exit(0)
    
    print("\n" + "=" * 60)
    print("Cleaning up Docker containers...")
    print("=" * 60)
    
    if cleanup_containers():
        print("\n" + "=" * 60)
        print("✓ Cleanup completed successfully!")
        print("=" * 60)
        print("\nNote: You should also run the database migration to add")
        print("the container_name field to the Startup model:")
        print("  flask db upgrade")
    else:
        print("\n✗ Cleanup failed")
        sys.exit(1)

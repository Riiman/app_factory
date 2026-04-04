#!/bin/bash

# V4 System Deployment Script
# Deploys V4 autonomous code generation system

set -e

echo "========================================="
echo "V4 Autonomous System Deployment"
echo "========================================="
echo ""

# Parse arguments
ENVIRONMENT=${1:-staging}
STARTUP_ID=${2:-}

echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Validate environment
echo "[1/5] Validating environment..."
python3 << 'EOF'
import sys
from app.startup_builder.v4.deployment import V4DeploymentManager

manager = V4DeploymentManager('$ENVIRONMENT')
result = manager.validate_environment()

if not result['success']:
    print("❌ Environment validation failed:")
    for check, details in result['checks'].items():
        if not details['passed']:
            print(f"  - {check}: {details}")
    sys.exit(1)

print("✅ Environment validation passed")
EOF

# Step 2: Install dependencies
echo ""
echo "[2/5] Installing dependencies..."
pip install -q chromadb 2>/dev/null || echo "⚠️  ChromaDB installation failed (optional)"

# Step 3: Deploy configuration
echo ""
echo "[3/5] Deploying configuration..."
python3 << 'EOF'
from app.startup_builder.v4.deployment import V4DeploymentManager

manager = V4DeploymentManager('$ENVIRONMENT')
result = manager.deploy_configuration()

if result['success']:
    print(f"✅ Configuration deployed: {result['env_file']}")
else:
    print(f"❌ Configuration deployment failed: {result.get('error')}")
    sys.exit(1)
EOF

# Step 4: Run migration (if startup_id provided)
if [ -n "$STARTUP_ID" ]; then
    echo ""
    echo "[4/5] Running migration for startup $STARTUP_ID..."
    python3 << EOF
from app.startup_builder.v4.deployment import V4MigrationTool

tool = V4MigrationTool('temp_workspaces/$STARTUP_ID')
result = tool.run_full_migration(
    '$STARTUP_ID',
    'temp_workspaces/$STARTUP_ID/artifacts/missions.json'
)

if result['success']:
    print("✅ Migration completed successfully")
    for step in result['steps']:
        print(f"  - {step['step']}: {'✅' if step['result']['success'] else '❌'}")
else:
    print("❌ Migration failed")
    sys.exit(1)
EOF
else
    echo ""
    echo "[4/5] Skipping migration (no startup_id provided)"
fi

# Step 5: Health check
echo ""
echo "[5/5] Running health check..."
python3 << 'EOF'
from app.startup_builder.v4.deployment import V4DeploymentManager

manager = V4DeploymentManager('$ENVIRONMENT')
result = manager.run_health_check()

if result['success']:
    print("✅ Health check passed")
    for check, details in result['checks'].items():
        print(f"  - {check}: {'✅' if details['passed'] else '❌'}")
else:
    print("❌ Health check failed")
    for check, details in result['checks'].items():
        if not details['passed']:
            print(f"  - {check}: {details.get('error', 'failed')}")
    sys.exit(1)
EOF

echo ""
echo "========================================="
echo "✅ V4 Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Set environment variables from .env.v4"
echo "2. Monitor system with V4Monitor"
echo "3. Enable optional features as needed:"
echo "   - USE_V4_KNOWLEDGE=true (requires ChromaDB)"
echo "   - USE_V4_PROMPTING=true"
echo "   - USE_V4_GENERATION=true"
echo ""

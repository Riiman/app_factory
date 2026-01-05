# V4 Pure Architecture - Quick Start Guide

## Overview

The V4 pure architecture eliminates the V3 layer completely, providing a cleaner, safer, and more maintainable system with safety, healing, and intelligence built-in at every layer.

---

## Architecture

```
V4 Agents (Developer, Architect, Executor)
    ↓
V4 Tools (with built-in safety & healing)
    ↓
Docker Manager
```

**No V3 wrapper complexity!**

---

## Quick Start

### 1. Deploy V4 System

```bash
# Run deployment script
./scripts/deploy_v4_pure.sh staging

# This will:
# - Validate environment
# - Run tests
# - Set environment variables
# - Perform health check
```

### 2. Start Server

```bash
export FLASK_APP=app
flask run
```

### 3. Test V4 Endpoints

```bash
# Health check
curl http://localhost:5000/api/builder/v4/health

# Start a mission
curl -X POST http://localhost:5000/api/builder/v4/start \
  -H "Content-Type: application/json" \
  -d '{
    "startup_id": "123",
    "mission": "Create login page",
    "mission_type": "ui_component",
    "priority": "high"
  }'
```

---

## API Endpoints

### POST /api/builder/v4/start
Start a V4 mission with full orchestration

**Request:**
```json
{
  "startup_id": "123",
  "mission": "Create user authentication",
  "mission_type": "api_endpoint",
  "priority": "high",
  "options": {
    "safety_level": "high",
    "auto_heal": true
  }
}
```

### POST /api/builder/v4/task
Execute a single task

**Request:**
```json
{
  "startup_id": "123",
  "task_type": "run_shell",
  "task_data": {
    "command": "npm install"
  }
}
```

### GET /api/builder/v4/stats/:startup_id
Get V4 system statistics

### GET /api/builder/v4/health
Health check

---

## Environment Variables

### Core Features (Always Enabled)
```bash
export USE_V4_SAFETY=true    # Circuit breakers, limits
export USE_V4_HEALING=true   # Auto-healing, retry
```

### Optional Features (Opt-in)
```bash
export USE_V4_KNOWLEDGE=true     # Learning from executions
export USE_V4_PROMPTING=true     # Enhanced prompting
export USE_V4_GENERATION=true    # Multi-pass generation
```

---

## Components

### V4 Agents
- **V4Developer** - Task execution with safety & healing
- **V4Architect** - Mission planning with strategy selection
- **V4Executor** - Tool execution with retry logic

### V4 Workflows
- **MissionExecutor** - Orchestrates complete missions
- **TaskExecutor** - Executes individual tasks

### V4 Tools
- `run_shell` - Execute commands with healing
- `update_file` - Update files with verification
- `read_file` - Read files with caching
- `list_files` - List directory contents

---

## Safety Features

### Built-in at Every Layer
- ✅ Circuit breakers (prevent infinite loops)
- ✅ Resource monitoring (CPU, memory, time)
- ✅ Cost tracking (LLM budgets)
- ✅ Strategy memory (prevent retrying failures)

### Automatic Healing
- ✅ Root cause analysis
- ✅ Fix generation
- ✅ Automatic retry with fixes
- ✅ Healing guidance in responses

---

## Monitoring

### Get Statistics
```bash
curl http://localhost:5000/api/builder/v4/stats/123
```

**Response includes:**
- Safety stats (violations, warnings)
- Execution metrics (success rate, time)
- Agent stats (developer, architect, executor)
- Cost tracking

---

## Migration from V3

### Option 1: Gradual Migration (Recommended)
Use V3 compatibility layer:
```bash
# V3 endpoint uses V4 internally
POST /api/builder/v3/start
```

### Option 2: Direct Migration
Switch to V4 endpoints:
```bash
# Use V4 endpoints directly
POST /api/builder/v4/start
```

---

## Testing

### Run All Tests
```bash
# Week 1 (agents & tools)
pytest tests/test_v4_week1.py -v

# Week 2 (workflows & routes)
pytest tests/test_v4_week2.py -v
```

### Test Coverage
- ✅ V4Developer (3 tests)
- ✅ V4Architect (3 tests)
- ✅ V4Executor (4 tests)
- ✅ V4Tools (2 tests)
- ✅ MissionExecutor (3 tests)
- ✅ TaskExecutor (3 tests)

---

## Troubleshooting

### Health Check Fails
```bash
# Check server is running
curl http://localhost:5000/api/builder/v4/health

# Check logs
tail -f logs/app.log
```

### Mission Execution Fails
Check response for healing guidance:
```json
{
  "success": false,
  "error": "...",
  "healing_guidance": "Try this instead: ..."
}
```

---

## Production Deployment

### 1. Run Tests
```bash
./scripts/deploy_v4_pure.sh production
```

### 2. Set Production Variables
```bash
export FLASK_ENV=production
export USE_V4_SAFETY=true
export USE_V4_HEALING=true
```

### 3. Start Server
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
```

### 4. Monitor
```bash
# Watch health
watch -n 5 'curl -s http://localhost:5000/api/builder/v4/health'

# Watch stats
watch -n 10 'curl -s http://localhost:5000/api/builder/v4/stats/123'
```

---

## Benefits

✅ **Cleaner Architecture** - No V3 wrapper  
✅ **Better Safety** - Built-in at every layer  
✅ **Easier Maintenance** - Single codebase  
✅ **Automatic Healing** - Errors fixed automatically  
✅ **Production Ready** - Tested and verified  

---

## Support

For issues or questions:
1. Check health endpoint
2. Review logs
3. Check healing guidance in responses
4. Review test results

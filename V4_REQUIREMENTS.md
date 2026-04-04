# V4 System - Package Requirements

## Required Packages (Already Installed)

**Good news:** V4 uses only packages you already have installed!

```
# Core dependencies (already in your environment)
- Python 3.8+
- langchain
- langchain_google_genai
- pytest (for testing)
```

**No new packages required for core V4 functionality!**

---

## Optional Packages

These are **completely optional** and only needed if you enable specific features:

### 1. ChromaDB (for Knowledge Base)
**Only needed if:** `USE_V4_KNOWLEDGE=true`

```bash
pip install chromadb
```

**Note:** Currently has config issues (8 tests fail), so we recommend keeping it disabled:
```bash
USE_V4_KNOWLEDGE=false  # Default
```

### 2. mypy (for Type Checking)
**Only needed if:** You want enhanced type validation

```bash
pip install mypy
```

**Note:** V4 gracefully degrades if mypy is not available. Not required.

### 3. flake8/pylint (for Linting)
**Only needed if:** You want enhanced lint validation

```bash
pip install flake8 pylint
```

**Note:** V4 gracefully degrades if these are not available. Not required.

---

## Recommended Installation (Remote Server)

### Minimal (Recommended)
**Install nothing new** - V4 core features work with existing packages!

```bash
# No installation needed!
# Just set environment variables:
export USE_V4_SAFETY=true
export USE_V4_HEALING=true
```

### Optional (If You Want Advanced Features)
```bash
# Only if you want to try knowledge base (has known issues)
pip install chromadb

# Only if you want enhanced validation
pip install mypy flake8 pylint
```

---

## What Works Without New Packages

✅ **Circuit Breakers** - No new packages needed  
✅ **Self-Healing** - No new packages needed  
✅ **Strategy Memory** - No new packages needed  
✅ **Resource Monitoring** - No new packages needed  
✅ **Cost Tracking** - No new packages needed  
✅ **Verification (basic)** - No new packages needed  
✅ **Enhanced Prompting** - No new packages needed  
✅ **Multi-Pass Generation** - No new packages needed  
✅ **Mission Controller** - No new packages needed  

**Only needs new packages:**
⚠️ Knowledge Base (ChromaDB) - Optional, has issues  
⚠️ Type checking (mypy) - Optional, gracefully degrades  
⚠️ Linting (flake8/pylint) - Optional, gracefully degrades  

---

## Deployment Commands

### Option 1: Deploy with No New Packages (Recommended)
```bash
# On remote server
cd /path/to/your/app

# Set environment variables
export USE_V4_SAFETY=true
export USE_V4_HEALING=true
export USE_V4_KNOWLEDGE=false
export USE_V4_PROMPTING=true
export USE_V4_GENERATION=true

# Restart your application
# (however you normally restart it)
```

### Option 2: Deploy with Optional Packages
```bash
# On remote server
cd /path/to/your/app

# Install optional packages
pip install chromadb mypy flake8 pylint

# Set environment variables
export USE_V4_SAFETY=true
export USE_V4_HEALING=true
export USE_V4_KNOWLEDGE=true  # Now enabled
export USE_V4_PROMPTING=true
export USE_V4_GENERATION=true

# Restart your application
```

---

## Summary

**For remote server deployment:**

1. **Install nothing new** (recommended)
2. **Set environment variables** (see above)
3. **Restart your app**
4. **V4 is ready!**

The core V4 features (safety, healing, prompting, generation) work with your existing packages. Only the knowledge base needs ChromaDB, which is optional and currently has known issues.

**Bottom line: You can deploy V4 to your remote server right now without installing any new packages!** 🚀

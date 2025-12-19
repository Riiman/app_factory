# Universal V3 Builder Image
# Base: Python 3.11 (Slim)
FROM python:3.11-slim-bookworm

# Prevent Python bufferering
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# System Dependencies & Node.js
# We use a multi-stage-ish approach or just run the setup script for Node.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Basic Python Tools
RUN pip install --upgrade pip && \
    pip install flake8 requests

# Set Working Directory
WORKDIR /app

# Expose common ports
EXPOSE 3000 8000 8080 5000 5173

# Keep Alive
CMD ["tail", "-f", "/dev/null"]

# Python Data Science Stack Dockerfile
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install common data science libraries
RUN pip install --no-cache-dir \
    pandas \
    numpy \
    scikit-learn \
    matplotlib \
    seaborn \
    jupyter \
    flask \
    fastapi \
    uvicorn \
    flake8

# Set working directory
WORKDIR /app

# Default command
CMD ["tail", "-f", "/dev/null"]

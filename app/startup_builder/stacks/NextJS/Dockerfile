# Next.js Stack Dockerfile
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g create-next-app

# Set working directory
WORKDIR /app

# Default command
CMD ["tail", "-f", "/dev/null"]

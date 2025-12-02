# MERN Stack Dockerfile
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g nodemon create-react-app express-generator

# Set host to 0.0.0.0 to allow external access
ENV HOST=0.0.0.0

# Set working directory
WORKDIR /app

# Default command
CMD ["tail", "-f", "/dev/null"]

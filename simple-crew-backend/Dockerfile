# Build backend image with Python 3.12 and Node.js 20
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (required for Node-based MCPs) and Playwright browsers/deps (Google Chrome)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npx playwright install --with-deps chrome \
    && mv /opt/google/chrome/chrome /opt/google/chrome/chrome.real \
    && echo '#!/bin/bash\n/opt/google/chrome/chrome.real --no-sandbox "$@"' > /opt/google/chrome/chrome \
    && chmod +x /opt/google/chrome/chrome \
    && rm -rf /var/lib/apt/lists/*

# Install uv via pip (more reliable than ghcr.io if blocked)
RUN pip install uv

# Set working directory
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies
RUN uv sync --frozen --no-install-project

# Copy the rest of the application
COPY . .

# Create an empty .env file so Python doesn't crash
RUN touch .env

# Expose port
EXPOSE 8000

# Run the backend
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

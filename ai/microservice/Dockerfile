# Dockerfile for ML Microservice
# Optimized for Google Cloud Run deployment

# Use official Python runtime as base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Cloud Run will inject PORT env variable)
ENV PORT=8080
EXPOSE 8080

# Run the application
# Cloud Run will provide PORT env variable
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}

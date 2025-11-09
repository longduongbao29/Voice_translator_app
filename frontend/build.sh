#!/bin/bash

# Build script for frontend Docker image

echo "Building Voice Translator Frontend Docker Image..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Build the Docker image
docker build -t voice-translator-frontend:latest .

if [ $? -eq 0 ]; then
    echo "✅ Frontend Docker image built successfully!"
    echo "Image: voice-translator-frontend:latest"
else
    echo "❌ Failed to build frontend Docker image"
    exit 1
fi

echo "You can now run the complete stack with: docker-compose up -d"
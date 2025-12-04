#!/bin/bash

# Ladybug Hosting v7 - Simple Startup Script

echo "🐞 Starting Ladybug Hosting v7..."

# Set default environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/ladybug-hosting-v7}
export JWT_SECRET=${JWT_SECRET:-ladybug-default-secret-change-me}

# Create necessary directories
mkdir -p logs uploads

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Start the application
echo "🚀 Starting server..."
node server.js
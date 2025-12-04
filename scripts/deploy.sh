#!/bin/bash

# Ladybug Hosting v7 - Deployment Script
# This script handles deployment to Render.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ladybug-hosting-v7"
NODE_VERSION="18"
BUILD_DIR="dist"

echo -e "${BLUE}🐞 Ladybug Hosting v7 Deployment Script${NC}"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js ${NODE_VERSION} or higher.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION_CURRENT=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION_CURRENT', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION_CURRENT is too old. Please upgrade to ${REQUIRED_VERSION} or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version check passed: $NODE_VERSION_CURRENT${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Run linting
echo -e "${YELLOW}🔍 Running code linting...${NC}"
npm run lint

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Linting failed. Please fix linting errors before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code linting passed${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed. Please fix failing tests before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}"

# Build assets if needed
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Application built successfully${NC}"

# Check environment variables
echo -e "${YELLOW}🔧 Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration before deployment.${NC}"
fi

# Check required environment variables
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables: ${MISSING_VARS[*]}${NC}"
    echo -e "${YELLOW}Please configure these variables in your .env file.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration is valid${NC}"

# Check Render CLI
if ! command -v render &> /dev/null; then
    echo -e "${YELLOW}📥 Render CLI not found. Installing...${NC}"
    npm install -g @render/cli
fi

# Check if logged in to Render
if ! render whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please log in to Render.com:${NC}"
    render login
fi

# Deploy to Render
echo -e "${YELLOW}🚀 Deploying to Render.com...${NC}"

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ render.yaml configuration file not found${NC}"
    exit 1
fi

# Deploy the application
render deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${BLUE}🐞 Ladybug Hosting v7 is now live on Render.com${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Post-deployment verification
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
sleep 10

# Get the deployment URL
APP_URL=$(render ps $APP_NAME --json | jq -r '.[0].service.url' 2>/dev/null || echo "")

if [ ! -z "$APP_URL" ]; then
    echo -e "${GREEN}✅ Application URL: $APP_URL${NC}"
    
    # Health check
    echo -e "${YELLOW}🏥 Performing health check...${NC}"
    if curl -f -s "$APP_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed - Application is running correctly${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed - Application may still be starting up${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not retrieve application URL${NC}"
fi

echo -e "${BLUE}🎉 Deployment complete!${NC}"
echo "======================================"
echo -e "${BLUE}🐞 Ladybug Hosting v7${NC}"
echo -e "${GREEN}Version: 7.0.0${NC}"
echo -e "${GREEN}Status: Deployed${NC}"
echo -e "${GREEN}Platform: Render.com${NC}"
echo "======================================"
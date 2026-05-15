#!/bin/bash
set -e

echo "🚀 LearningoPK Backend Deployment Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found${NC}"
    echo "Please run this script from the learningopk directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env from .env.production.example"
    exit 1
fi

echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin main

echo -e "${YELLOW}Building and starting services...${NC}"
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

echo -e "${YELLOW}Cleaning up old images...${NC}"
docker system prune -f --volumes

echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 15

echo -e "${YELLOW}Running health check...${NC}"
if curl -sSf http://localhost:3001/api/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful! Backend is healthy.${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "Check logs with: docker compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"

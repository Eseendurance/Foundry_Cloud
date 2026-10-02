#!/bin/bash

echo "================================================="
echo " Starting Native Foundry Cloud Deployment Pipeline"
echo "================================================="

# 1. Stop active containers
echo "[1/4] Stopping existing containers..."
docker-compose down

# 2. Build and start services in detached mode
echo "[2/4] Building production images with raw multimedia engines..."
docker-compose build --no-cache
docker-compose up -d

# 3. Apply Prisma database migrations inside container
echo "[3/4] Running PostgreSQL database migrations..."
docker exec -it foundry-cloud-app npx prisma db push --schema=platform/prisma/schema.prisma

# 4. Display active container status
echo "[4/4] System Deployment Complete!"
docker-compose ps
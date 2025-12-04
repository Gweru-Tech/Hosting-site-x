#!/bin/bash

# Ladybug Hosting v7 - Restore Script
# Automated restore from backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/backups/ladybug-hosting-v7"

# Usage information
usage() {
    echo -e "${BLUE}🐞 Ladybug Hosting v7 - Restore Script${NC}"
    echo "======================================"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 ladybug_backup_20240115_143022_full.tar.gz"
    echo "  $0 /path/to/backup/ladybug_backup_20240115_143022_full.tar.gz"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*_full.tar.gz 2>/dev/null | tail -5 || echo "No backups found"
    exit 1
}

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Backup file not specified${NC}"
    usage
fi

BACKUP_FILE="$1"

# Handle relative paths
if [[ ! "$BACKUP_FILE" == /* ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    usage
fi

echo -e "${BLUE}🐞 Ladybug Hosting v7 - Restore System${NC}"
echo "======================================"
echo -e "${YELLOW}📂 Restoring from: $BACKUP_FILE${NC}"

# Create temporary directory for extraction
TEMP_DIR="/tmp/ladybug_restore_$(date +%s)"
mkdir -p "$TEMP_DIR"

# Extract backup
echo -e "${YELLOW}📦 Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find backup components
BACKUP_NAME=$(basename "$BACKUP_FILE" | sed 's/_full\.tar\.gz//')
DB_DIR="$TEMP_DIR/database/${BACKUP_NAME}"
UPLOADS_FILE="$TEMP_DIR/${BACKUP_NAME}_uploads.tar.gz"
LOGS_FILE="$TEMP_DIR/${BACKUP_NAME}_logs.tar.gz"
CONFIG_FILE="$TEMP_DIR/${BACKUP_NAME}_config.tar.gz"
MANIFEST_FILE="$TEMP_DIR/${BACKUP_NAME}_manifest.json"

# Verify backup integrity
echo -e "${YELLOW}🔍 Verifying backup integrity...${NC}"
if [ -f "$MANIFEST_FILE" ]; then
    echo -e "${GREEN}✅ Manifest found: $(jq -r '.timestamp' "$MANIFEST_FILE")${NC}"
    echo -e "${GREEN}✅ Version: $(jq -r '.version' "$MANIFEST_FILE")${NC}"
else
    echo -e "${RED}❌ Error: Backup manifest not found${NC}"
    exit 1
fi

# Stop application services
echo -e "${YELLOW}⏸️  Stopping application services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop all || true
fi

if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    docker-compose down || true
fi

# Restore database
if [ -d "$DB_DIR" ]; then
    echo -e "${YELLOW}🗄️  Restoring database...${NC}"
    if [ ! -z "$MONGODB_URI" ]; then
        mongorestore --uri="$MONGODB_URI" --drop --dir="$DB_DIR"
        echo -e "${GREEN}✅ Database restored${NC}"
    else
        echo -e "${YELLOW}⚠️  MONGODB_URI not set, skipping database restore${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database backup not found, skipping${NC}"
fi

# Restore uploads
if [ -f "$UPLOADS_FILE" ]; then
    echo -e "${YELLOW}📁 Restoring uploads...${NC}"
    tar -xzf "$UPLOADS_FILE"
    echo -e "${GREEN}✅ Uploads restored${NC}"
else
    echo -e "${YELLOW}⚠️  Uploads backup not found, skipping${NC}"
fi

# Restore logs
if [ -f "$LOGS_FILE" ]; then
    echo -e "${YELLOW}📋 Restoring logs...${NC}"
    tar -xzf "$LOGS_FILE"
    echo -e "${GREEN}✅ Logs restored${NC}"
else
    echo -e "${YELLOW}⚠️  Logs backup not found, skipping${NC}"
fi

# Restore configuration (with confirmation)
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚙️  Restoring configuration files...${NC}"
    read -p "This will overwrite your current configuration files. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tar -xzf "$CONFIG_FILE"
        echo -e "${GREEN}✅ Configuration restored${NC}"
    else
        echo -e "${YELLOW}⚠️  Configuration restore skipped${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Configuration backup not found, skipping${NC}"
fi

# Clean up temporary directory
rm -rf "$TEMP_DIR"

# Restart application services
echo -e "${YELLOW}▶️  Restarting application services...${NC}"
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    docker-compose up -d
elif command -v pm2 &> /dev/null && [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    npm start &
fi

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed - Application is running correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - Application may still be starting up${NC}"
fi

echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo -e "${BLUE}🎉 Your Ladybug Hosting v7 instance has been restored from backup.${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify your configuration settings"
echo "2. Check that all bots are running correctly"
echo "3. Test user functionality"
echo "4. Review logs for any issues"
#!/bin/bash

# Ladybug Hosting v7 - Backup Script
# Automated backup and recovery system

set -e

# Configuration
BACKUP_DIR="/backups/ladybug-hosting-v7"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="ladybug_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐞 Ladybug Hosting v7 - Backup System${NC}"
echo "======================================"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/database"
mkdir -p "${BACKUP_DIR}/uploads"
mkdir -p "${BACKUP_DIR}/logs"
mkdir -p "${BACKUP_DIR}/config"

# Backup MongoDB
echo -e "${YELLOW}📦 Backing up MongoDB database...${NC}"
if [ ! -z "$MONGODB_URI" ]; then
    mongodump --uri="$MONGODB_URI" --out="${BACKUP_DIR}/database/${BACKUP_NAME}"
    echo -e "${GREEN}✅ MongoDB backup completed${NC}"
else
    echo -e "${YELLOW}⚠️  MONGODB_URI not set, skipping database backup${NC}"
fi

# Backup uploads directory
if [ -d "uploads" ]; then
    echo -e "${YELLOW}📦 Backing up user uploads...${NC}"
    tar -czf "${BACKUP_DIR}/uploads/${BACKUP_NAME}_uploads.tar.gz" uploads/
    echo -e "${GREEN}✅ Uploads backup completed${NC}"
fi

# Backup logs
if [ -d "logs" ]; then
    echo -e "${YELLOW}📦 Backing up application logs...${NC}"
    tar -czf "${BACKUP_DIR}/logs/${BACKUP_NAME}_logs.tar.gz" logs/
    echo -e "${GREEN}✅ Logs backup completed${NC}"
fi

# Backup configuration files
echo -e "${YELLOW}📦 Backing up configuration files...${NC}"
tar -czf "${BACKUP_DIR}/config/${BACKUP_NAME}_config.tar.gz" \
    .env \
    render.yaml \
    docker-compose.yml \
    package.json \
    ecosystem.config.js \
    2>/dev/null || true
echo -e "${GREEN}✅ Configuration backup completed${NC}"

# Create backup manifest
echo -e "${YELLOW}📄 Creating backup manifest...${NC}"
cat > "${BACKUP_DIR}/${BACKUP_NAME}_manifest.json" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "7.0.0",
  "components": {
    "database": true,
    "uploads": $([ -d "uploads" ] && echo "true" || echo "false"),
    "logs": $([ -d "logs" ] && echo "true" || echo "false"),
    "config": true
  },
  "files": [
    $([ ! -z "$MONGODB_URI" ] && echo "&quot;database/${BACKUP_NAME}/&quot;,")
    $([ -d "uploads" ] && echo "&quot;uploads/${BACKUP_NAME}_uploads.tar.gz&quot;,")
    $([ -d "logs" ] && echo "&quot;logs/${BACKUP_NAME}_logs.tar.gz&quot;,")
    "&quot;config/${BACKUP_NAME}_config.tar.gz&quot;",
    "&quot;${BACKUP_NAME}_manifest.json&quot;"
  ],
  "checksums": {}
}
EOF

# Generate checksums
echo -e "${YELLOW}🔐 Generating checksums...${NC}"
cd "${BACKUP_DIR}"
find . -name "${BACKUP_NAME}*" -type f -exec sha256sum {} \; > "${BACKUP_NAME}_checksums.txt"
echo -e "${GREEN}✅ Checksums generated${NC}"

# Create compressed archive
echo -e "${YELLOW}🗜️  Creating compressed archive...${NC}"
tar -czf "${BACKUP_NAME}_full.tar.gz" \
    database/${BACKUP_NAME}/ \
    uploads/${BACKUP_NAME}_uploads.tar.gz \
    logs/${BACKUP_NAME}_logs.tar.gz \
    config/${BACKUP_NAME}_config.tar.gz \
    ${BACKUP_NAME}_manifest.json \
    ${BACKUP_NAME}_checksums.txt \
    2>/dev/null || true

echo -e "${GREEN}✅ Full backup archive created${NC}"

# Clean up old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "*_full.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*_manifest.json" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*_checksums.txt" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "ladybug_backup_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

echo -e "${GREEN}✅ Old backups cleaned up${NC}"

# Backup statistics
BACKUP_SIZE=$(du -sh "${BACKUP_NAME}_full.tar.gz" | cut -f1)
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "*_full.tar.gz" | wc -l)

echo -e "${BLUE}📊 Backup Statistics:${NC}"
echo "   Backup Name: ${BACKUP_NAME}"
echo "   Size: ${BACKUP_SIZE}"
echo "   Location: ${BACKUP_DIR}/${BACKUP_NAME}_full.tar.gz"
echo "   Total Backups: ${BACKUP_COUNT}"
echo "   Retention Period: ${RETENTION_DAYS} days"

echo -e "${GREEN}✅ Backup completed successfully!${NC}"

# Optional: Upload to cloud storage (if configured)
if [ ! -z "$AWS_S3_BUCKET" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo -e "${YELLOW}☁️  Uploading to AWS S3...${NC}"
    aws s3 cp "${BACKUP_NAME}_full.tar.gz" "s3://${AWS_S3_BUCKET}/backups/"
    echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
fi

if [ ! -z "$GCS_BUCKET" ] && [ ! -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo -e "${YELLOW}☁️  Uploading to Google Cloud Storage...${NC}"
    gsutil cp "${BACKUP_NAME}_full.tar.gz" "gs://${GCS_BUCKET}/backups/"
    echo -e "${GREEN}✅ Backup uploaded to GCS${NC}"
fi

echo -e "${BLUE}🎉 Backup process complete!${NC}"
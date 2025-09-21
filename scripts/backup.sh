#!/bin/bash
# Database backup script for TrailGuide PWA
set -e

# Configuration
DB_HOST="postgres"
DB_PORT="5432"
DB_NAME="trailguide_production"
DB_USER="trailguide_prod"
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# Create backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/trailguide_backup_${TIMESTAMP}.sql"

echo "Starting database backup..."
echo "Backup file: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform database backup
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-password --verbose --clean --if-exists --create > "${BACKUP_FILE}"

# Compress the backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Database backup completed: ${BACKUP_FILE}"

# Cleanup old backups
echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "trailguide_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "Remaining backups:"
ls -lah "${BACKUP_DIR}"/trailguide_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup process completed successfully!"
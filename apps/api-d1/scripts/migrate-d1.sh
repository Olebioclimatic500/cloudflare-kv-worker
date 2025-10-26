#!/bin/bash

# Script to run D1 migrations
# 
# ⚠️ LOCAL DEVELOPMENT ONLY - NOT FOR CLOUDFLARE WORKERS
# This script runs on your local machine using wrangler CLI
# This script is NOT bundled or deployed to Cloudflare Workers
#
# Usage: ./scripts/migrate-d1.sh [--remote]

echo "Running D1 migrations..."

# Check if we're in the correct directory
if [ ! -f "wrangler.jsonc" ]; then
    echo "Error: wrangler.jsonc not found. Please run this script from the apps/api-d1 directory."
    exit 1
fi

# Determine if running on remote or local
REMOTE_FLAG=""
if [ "$1" == "--remote" ]; then
    REMOTE_FLAG="--remote"
    echo "Running on REMOTE database..."
else
    REMOTE_FLAG="--local"
    echo "Running on LOCAL database..."
fi

# Run the migration
echo "Applying migration: 001_create_kv_table.sql"
bunx wrangler d1 execute MY_DB $REMOTE_FLAG --file=./migrations/001_create_kv_table.sql

echo "Migration completed!"

# Optional: Show table info
echo ""
echo "Database schema:"
bunx wrangler d1 execute MY_DB $REMOTE_FLAG --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='kv_store';"

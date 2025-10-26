# KV to D1 Migration Guide

This document describes the migration from Cloudflare KV to D1 database for the API service.

## Overview

The API has been migrated from using Cloudflare KV storage to D1 (SQLite) database while maintaining the same REST API interface. This provides several benefits:

- **Strong consistency** instead of eventual consistency
- **No rate limits** (KV has 1 write/second per key limit)
- **Transaction support** for bulk operations
- **Better query capabilities** with SQL

## Migration Steps

### 1. Run Database Migration

Before starting the worker, you need to create the database schema:

```bash
cd apps/api-d1
./scripts/migrate-d1.sh
```

This creates the `kv_store` table with the following schema:

```sql
CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    metadata TEXT,
    expiration INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### 2. Deploy the Worker

Deploy the updated worker code:

```bash
bun run deploy
```

### 3. Data Migration (if needed)

If you have existing data in KV that needs to be migrated to D1, you can write a migration script that:
1. Lists all keys from KV
2. Gets each key with metadata
3. Inserts into D1 using the same structure

## Key Differences

### Performance
- D1 may have slightly higher latency for simple key lookups compared to KV
- D1 excels at batch operations and complex queries
- No rate limiting on writes

### Consistency
- D1 provides strong consistency (immediate read-after-write)
- KV provides eventual consistency with global replication

### Features
- D1 supports transactions for atomic bulk operations
- Expired entries need manual cleanup (can be automated with a cron trigger)
- Better support for complex queries and filtering

## API Compatibility

The REST API remains 100% compatible. All endpoints work exactly the same:
- `GET /api/v1/kv/:key` - Get single value
- `POST /api/v1/kv/batch` - Batch get values
- `PUT /api/v1/kv/:key` - Write value
- `DELETE /api/v1/kv/:key` - Delete value
- `GET /api/v1/kv` - List keys
- etc.

## Testing

Test the migration by:
1. Running the worker locally: `bun run dev`
2. Testing all CRUD operations
3. Verifying TTL/expiration functionality
4. Testing batch operations
5. Checking pagination on list operations

## Rollback

To rollback to KV:
1. Keep the original KV namespace binding
2. Revert the code changes
3. Redeploy the original version

## Monitoring

Monitor the following after migration:
- Response times (may differ from KV)
- Error rates
- D1 query performance
- Database size growth

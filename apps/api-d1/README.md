# Cloudflare D1 Worker API (KV-Compatible)

A high-performance REST API that provides Cloudflare KV-compatible interface using D1 (SQLite) database as the storage backend.

## Features

- **KV-Compatible API**: Drop-in replacement for Cloudflare KV with the same REST API
- **D1 Backend**: Uses Cloudflare D1 for strong consistency and SQL capabilities
- **No Rate Limits**: Unlike KV (1 write/second per key), D1 has no such limitations
- **Metadata Support**: Attach custom metadata to any key-value pair
- **TTL Support**: Set expiration times for automatic cleanup
- **Batch Operations**: Get/write multiple values in a single request
- **Pagination**: List keys with prefix filtering and cursor-based pagination
- **HMAC Authentication**: Secure API access with HMAC-SHA256 signatures

## Setup

### 1. Prerequisites

- Node.js 18+
- Cloudflare account with D1 access
- Wrangler CLI installed

### 2. Install Dependencies

```bash
bun install
```

**Note**: The postinstall script will automatically check and apply the database migration to your local D1 database.

### 3. Create D1 Database

```bash
# Create a new D1 database
wrangler d1 create my-kv-database

# Update wrangler.jsonc with the database ID
```

### 4. Configure Authentication

Create a `.dev.vars` file:

```
AUTH_SECRET_KEY=your-secret-key-here
```

### 5. Start Development Server

```bash
bun run dev
```

The database migration will have been applied automatically during installation. If you need to run it manually, use `bun run migrate`.

## API Endpoints

All endpoints maintain compatibility with the original KV API:

- `GET /api/v1/kv/:key` - Get single value
- `POST /api/v1/kv/batch` - Batch get multiple values
- `GET /api/v1/kv/:key/metadata` - Get value with metadata
- `POST /api/v1/kv/batch/metadata` - Batch get with metadata
- `GET /api/v1/kv` - List keys with pagination
- `PUT /api/v1/kv/:key` - Write single key-value pair
- `POST /api/v1/kv` - Create key-value pair
- `POST /api/v1/kv/bulk` - Bulk write multiple pairs
- `DELETE /api/v1/kv/:key` - Delete single key
- `POST /api/v1/kv/bulk/delete` - Bulk delete keys

## D1 vs KV Comparison

| Feature | Cloudflare KV | D1 (This Implementation) |
|---------|---------------|--------------------------|
| Consistency | Eventually consistent | Strongly consistent |
| Rate Limits | 1 write/second per key | No rate limits |
| Global Replication | Yes | No (single region) |
| Query Capabilities | Key-only | Full SQL support |
| Transactions | No | Yes |
| Storage Limit | 25 GB per namespace | 10 GB per database |

## Deployment

```bash
# Deploy to Cloudflare Workers (with automatic migration check)
bun run deploy

# Skip migration check and force deploy
bun run deploy:force
```

**Note**: The `deploy` command automatically checks if the remote database schema is up to date and prompts you to run the migration if needed. Use `deploy:force` to skip this check.

## Migration from KV

See [MIGRATION.md](MIGRATION.md) for detailed migration instructions from Cloudflare KV to D1.

## Performance Considerations

- D1 may have slightly higher latency for simple key lookups compared to KV
- D1 excels at batch operations due to transaction support
- No rate limiting means better performance for write-heavy workloads
- Consider implementing application-level caching for frequently accessed keys

## Development

- `bun install` - Install dependencies and run local DB migration
- `bun run dev` - Start development server
- `bun run migrate` - Run local database migration manually
- `bun run migrate:remote` - Run remote database migration
- `bun run cf-typegen` - Generate TypeScript types
- `bun run deploy` - Deploy with automatic migration check
- `bun run deploy:force` - Deploy without migration check

## Cloudflare Workers Compatibility

✅ **100% Workers Compatible**

All Worker runtime code (`src/`) uses only Cloudflare Workers-compatible APIs:
- No Node.js dependencies
- No file system access
- Uses D1, Web Crypto, and Web Standards APIs only

The `scripts/` directory contains local development tools that run on your machine and are **not** deployed to Cloudflare Workers.

See [WORKERS_COMPATIBILITY.md](WORKERS_COMPATIBILITY.md) for detailed information.

## License

MIT

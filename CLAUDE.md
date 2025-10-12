# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers KV API service built with Hono framework. It provides a RESTful API interface for interacting with Cloudflare KV (Key-Value) storage, including operations for reading, writing, listing, and deleting key-value pairs with support for metadata and bulk operations.

## Common Development Commands

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun run dev

# Deploy to Cloudflare Workers (with minification)
bun run deploy

# Generate TypeScript types from Worker configuration
bun run cf-typegen
```

## Architecture & Key Components

### Technology Stack
- **Runtime**: Cloudflare Workers (edge computing platform)
- **Framework**: Hono v4.9+ (lightweight web framework optimized for edge)
- **Language**: TypeScript with strict mode enabled
- **Package Manager**: Bun
- **Development Tool**: Wrangler (Cloudflare's CLI for Workers)

### Core Architecture

1. **Single Entry Point**: All functionality is in `src/index.ts` which exports a Hono application configured with CloudflareBindings for type safety.

2. **KV Namespace Binding**: The worker is bound to a KV namespace `CF_WORKER_API_KV` (ID: b7a69f2afeed4d4d9d8517244cf3de07) configured in `wrangler.jsonc`.

3. **Base Path**: All API endpoints are prefixed with `/api/v1`.

4. **Environment Variables**: Development secrets are stored in `.dev.vars` (e.g., AUTH_SECRET_KEY for potential authentication).

## API Endpoint Structure

The API provides comprehensive CRUD operations for Cloudflare KV:

### Read Operations
- `GET /api/v1/kv/:key` - Get single value with optional JSON parsing
- `POST /api/v1/kv/batch` - Batch get multiple values (max 100 keys)
- `GET /api/v1/kv/:key/metadata` - Get value with metadata
- `POST /api/v1/kv/batch/metadata` - Batch get with metadata
- `GET /api/v1/kv` - List keys with pagination support

### Write Operations
- `PUT /api/v1/kv/:key` - Write single key-value pair with optional TTL/metadata
- `POST /api/v1/kv/bulk` - Bulk write (max 10,000 pairs) with retry logic

### Delete Operations
- `DELETE /api/v1/kv/:key` - Delete single key
- `POST /api/v1/kv/bulk/delete` - Bulk delete keys

## Key Implementation Patterns

### Error Handling
- All endpoints use try-catch blocks with consistent error response format
- Rate limiting errors (429) are handled with specific messages
- Bulk operations include retry logic with exponential backoff for rate limits

### Type Safety
- Uses CloudflareBindings interface for environment variable typing
- Consistent use of TypeScript interfaces for request/response types
- Strict TypeScript configuration with ESNext target

### Request Validation
- Key validation: checks for empty, ".", "..", and max length (512 bytes)
- Array size limits: 100 keys for batch reads, 10,000 for bulk writes
- TTL validation: minimum 60 seconds for expirationTtl

### Response Patterns
- Consistent JSON response structure with success indicators
- HTTP status codes: 201 (created), 207 (partial success), 404 (not found), 429 (rate limit), 500 (server error)
- Bulk operations return detailed results per key

## Development Considerations

### When modifying the KV API:
1. Maintain consistent error handling patterns across all endpoints
2. Respect Cloudflare KV limits (1 write/second per key, key size limits)
3. Always validate input parameters before KV operations
4. Use appropriate TypeScript types from CloudflareBindings

### Testing locally:
- Use `wrangler dev` to test with local KV namespace simulation
- The `.dev.vars` file contains development environment variables
- Test rate limiting behavior with bulk operations

### Deployment:
- Code is automatically minified during deployment
- Ensure `wrangler.jsonc` has correct KV namespace binding
- Update compatibility_date when using new Workers features
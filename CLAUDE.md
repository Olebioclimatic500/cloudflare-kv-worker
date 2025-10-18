# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cloudflare KV Monorepo** - A high-performance REST API for Cloudflare KV storage built with Turborepo, Hono, and TypeScript. The API runs on Cloudflare's edge network and provides dual authentication, batch operations, bulk operations, metadata support, TTL support, and cursor-based pagination.

**Key Stack**: Bun (package manager), Turborepo (monorepo orchestration), Hono v4.9+ (edge framework), Valibot (validation), Cloudflare Workers (runtime).

## Repository Structure

```
cloudflare-kv-worker/
├── apps/
│   ├── api/                    # Main Cloudflare Workers API
│   │   ├── src/index.ts        # Complete API implementation (monolithic)
│   │   ├── wrangler.jsonc      # Cloudflare config + KV namespace binding
│   │   ├── package.json        # API dependencies
│   │   └── examples/           # Authentication examples
│   └── next-example/           # Next.js app example (consumer)
├── packages/
│   └── typescript-sdk/         # SDK placeholder (coming soon)
├── turbo.json                  # Turborepo task orchestration
├── package.json                # Root workspace config
└── bun.lock                     # Dependency lock file
```

**Important**: The API is implemented as a single monolithic file (`src/index.ts` ~1572 lines) rather than modularized components.

## Architecture Highlights

### Monolithic API Design
All API logic lives in `apps/api/src/index.ts`. The file is organized as:
1. **HMAC Authentication Middleware** - Bearer token or HMAC-SHA256 signature verification (5-minute timestamp window)
2. **Validation Schemas** - Valibot schemas for all request/response types
3. **OpenAPI Documentation** - Built with Hono OpenAPI + Scalar UI for interactive docs
4. **Route Handlers** - Organized by operation type (read, write, delete)

### API Base Path
All endpoints are under `/api/v1` and include:
- **Read**: Single get, batch get, list with pagination, metadata retrieval
- **Write**: Single put, bulk write with exponential backoff retry logic
- **Delete**: Single delete, bulk delete
- **Docs**: OpenAPI spec and interactive Scalar UI

### Authentication Methods
1. **Bearer Token** - Simple: `Authorization: Bearer <AUTH_SECRET_KEY>`
2. **HMAC-SHA256** - Secure: `X-Signature` + `X-Timestamp` headers with message signing (`METHOD + PATH + TIMESTAMP + BODY`)

### Key Constraints & Limits
- Key size: 1-512 characters (cannot be "." or "..")
- Batch read: max 100 keys
- Bulk write: max 10,000 pairs with auto-retry on rate limits
- TTL minimum: 60 seconds
- Write rate: 1 per second per key
- HMAC timestamp window: 5 minutes

### Environment & Configuration
- **Binding**: `CF_WORKER_API_KV` - KV namespace bound in `wrangler.jsonc`
- **Secret**: `AUTH_SECRET_KEY` - Stored in `.dev.vars` (local) or via `wrangler secret put` (production)
- **Placement Mode**: Smart (optimized edge placement)

## Common Development Commands

### Root Level (Turborepo)
```bash
bun install              # Install all dependencies
bun run dev              # Start all apps in dev mode
bun run build            # Build all packages
bun run deploy           # Deploy API to Cloudflare
bun run lint             # Lint all packages
bun run test             # Run all tests
bun run format           # Format code
```

### API-Specific (apps/api/)
```bash
cd apps/api

# Development
bun run dev              # Start local dev server (http://localhost:8787/api/v1)
bun run cf-typegen       # Generate TypeScript types from Cloudflare bindings

# Deployment
bun run build            # Dry-run build to dist/ directory
bun run deploy           # Deploy to Cloudflare (minified)
```

### Testing & Verification
```bash
# Test authentication with examples
node apps/api/examples/hmac-auth-example.js

# Access interactive API docs
# http://localhost:8787/api/v1/docs

# Access OpenAPI spec
# http://localhost:8787/api/v1/openapi
```

## Local Development Setup

1. **Create .dev.vars** in `apps/api/`:
   ```env
   AUTH_SECRET_KEY=your-development-secret-key
   ```

2. **Generate Types**:
   ```bash
   cd apps/api
   bun run cf-typegen
   ```

3. **Start Dev Server**:
   ```bash
   bun run dev  # from root
   ```

4. **Access**:
   - API: `http://localhost:8787/api/v1`
   - Interactive Docs: `http://localhost:8787/api/v1/docs`
   - OpenAPI Spec: `http://localhost:8787/api/v1/openapi`

## Key Files & Their Purposes

| File | Purpose |
|------|---------|
| [apps/api/src/index.ts](apps/api/src/index.ts) | Complete API implementation with all routes, validation, and auth |
| [apps/api/wrangler.jsonc](apps/api/wrangler.jsonc) | Cloudflare Workers config, KV namespace binding, placement |
| [apps/api/package.json](apps/api/package.json) | Dependencies: Hono, Valibot, Scalar, Zod, Cloudflare types |
| [turbo.json](turbo.json) | Task definitions for build, dev, deploy, lint, test, format |
| [README.md](README.md) | User-facing documentation with quick start and API overview |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup and contribution guidelines |

## Important Patterns & Conventions

### Error Handling
- Consistent try-catch blocks in all handlers
- JSON error responses with `error` field and optional `hint`
- Appropriate HTTP status codes: 201 (created), 207 (multi-status for partial success), 404, 401, 429 (rate limit), 500

### Validation with Valibot
- All inputs validated with Valibot schemas
- Async custom validators for complex checks (e.g., key format, array sizes)
- Schema composition for reusable validation logic

### Response Format
- Single operations: `{ success: boolean, data?: T, error?: string }`
- Bulk operations: `{ success: boolean, total: number, successful: number, failed: number, results: T[] }`
- Consistent structure across all endpoints

### Retry Logic
- Bulk write operations include exponential backoff for rate limit handling
- Automatic retry on 429 status (Cloudflare rate limit)
- Max retries with backoff: 1000ms, 2000ms, 4000ms

### Metadata & TTL
- All endpoints support optional metadata object (user-defined JSON)
- TTL support via `expiration_ttl` (seconds) or `expiration` (Unix timestamp)
- Metadata retrieved via dedicated endpoints or batch metadata operations

## Deployment Workflow

1. **Set Secret** (production):
   ```bash
   wrangler secret put AUTH_SECRET_KEY
   ```

2. **Update URLs** in [apps/api/src/index.ts](apps/api/src/index.ts):
   - Add production server URL to OpenAPI `servers` array

3. **Deploy**:
   ```bash
   bun run deploy
   ```

4. **Verify**:
   - Test endpoints with production URL
   - Check interactive docs at `https://your-worker.workers.dev/api/v1/docs`

## Testing Strategy

**Current Status**: No automated tests present. Verification uses:
1. **Interactive Docs** - Manual testing via Scalar UI at `/api/v1/docs`
2. **Authentication Examples** - `node examples/hmac-auth-example.js`
3. **Edge Cases** - Test manually via API (rate limits, invalid keys, TTL expiration)

## Notes for Future Development

- **Monolithic Design**: All code in single file. Consider modularization if exceeding 2000 lines
- **No Database**: Uses only Cloudflare KV. Add R2 or D1 support via `wrangler.jsonc` if needed
- **No Tests**: Add test suite (Vitest/Bun test) for validation schemas and middleware
- **SDK Placeholder**: `packages/typescript-sdk/` ready for client library development
- **Next.js Example**: `apps/next-example/` demonstrates API consumer integration

## Useful Resources

- [Hono Documentation](https://hono.dev/) - Lightweight web framework
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare KV API](https://developers.cloudflare.com/kv/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [Valibot](https://valibot.dev/) - Runtime validation library
- [Scalar API Reference](https://github.com/scalar/scalar) - API documentation UI

# Cloudflare KV Monorepo

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://dub.sh/L1aS7JO)

A high-performance REST API for Cloudflare KV storage built with Turborepo, Hono, and TypeScript. This monorepo contains the API implementation, a Next.js example application, and a TypeScript SDK.

## Project Structure

```
cloudflare-kv-worker/
├── apps/
│   ├── api/               # Cloudflare KV Worker API (Hono + TypeScript)
│   └── next-example/      # Next.js example application using the API
├── packages/
│   └── typescript-sdk/    # TypeScript/JavaScript client SDK
├── docs/
│   └── AUTH.md           # Authentication documentation
├── examples/
│   └── hmac-auth-example.js  # HMAC authentication examples
├── turbo.json            # Turborepo configuration
└── package.json          # Root workspace configuration
```

## Features

- **Dual Authentication** - HMAC-SHA256 signatures or Bearer token authentication
- **Batch Operations** - Read up to 100 keys in a single request
- **Bulk Operations** - Write up to 10,000 key-value pairs at once with automatic retry logic
- **Metadata Support** - Attach custom metadata to any key-value pair
- **TTL Support** - Set expiration times for automatic key cleanup
- **Pagination** - List keys with prefix filtering and cursor-based pagination
- **Interactive Documentation** - Beautiful Scalar API reference with examples
- **Type Safety** - Full TypeScript support with strict typing
- **Edge Computing** - Runs on Cloudflare's global network for ultra-low latency

## Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Contributing](#contributing)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.2.23+ installed
- Cloudflare account with Workers access
- KV namespace created

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd cloudflare-kv-worker

# Install dependencies (all workspaces)
bun install

# Set up local environment
echo 'AUTH_SECRET_KEY=dev-secret-key-change-in-production' > apps/api/.dev.vars

# Start all development servers
bun run dev
```

This will start:
- **API**: http://localhost:8787/api/v1
- **Next.js Example**: http://localhost:3000 (if configured)
- **Interactive API Docs**: http://localhost:8787/api/v1/docs

For detailed development setup, see [CONTRIBUTING.md](CONTRIBUTING.md)

## API Documentation

### Interactive Documentation

Visit the **Scalar API Reference** for interactive documentation with live examples:

```
http://localhost:8787/api/v1/docs
```

Features:
- Complete API reference with examples
- Built-in authentication testing
- Code examples in JavaScript, Node.js, Python, Shell
- Beautiful modern UI with dark mode
- Search functionality

### OpenAPI Specification

Access the raw OpenAPI 3.0 specification:

```
http://localhost:8787/api/v1/openapi
```

## Authentication

All API endpoints require authentication using either:
- **Bearer Token** - Simple API key in Authorization header
- **HMAC-SHA256 Signature** - Secure request signing with timestamp validation

For complete authentication documentation, setup instructions, and security best practices, see [docs/AUTH.md](docs/AUTH.md).

## Examples & SDK Usage

### Next.js Example Application

The `apps/next-example` directory contains a fully functional Next.js application that demonstrates:
- API integration with the Cloudflare KV Worker
- TypeScript client usage
- Real-time data updates and caching
- Example components using the KV API

Run the example:

```bash
cd apps/next-example
bun run dev
```

### TypeScript SDK

The `packages/typescript-sdk` provides a type-safe client library for consuming the API:

```typescript
import { KVClient } from '@cloudflare/kv-sdk';

const client = new KVClient({
  apiUrl: 'https://your-worker.workers.dev/api/v1',
  authToken: 'your-auth-token',
});

// Set a value
await client.put('key', 'value', { metadata: { custom: 'data' } });

// Get a value
const data = await client.get('key');

// Batch operations
await client.bulkPut([
  { key: 'key1', value: 'value1' },
  { key: 'key2', value: 'value2' },
]);
```

## Deployment

### 1. Set Secrets

```bash
# Set your authentication secret
wrangler secret put AUTH_SECRET_KEY
# Enter your secret when prompted
```

### 2. Update Configuration

Edit `apps/api/wrangler.jsonc` to update:
- Worker name
- KV namespace ID (if using a different namespace)
- Routes and domains
- Environment variables

### 3. Deploy

```bash
bun run deploy
```

Your API will be deployed to:
```
https://your-worker.your-subdomain.workers.dev
```

### 4. Update Production URLs

After deployment, update the server URLs in `apps/api/src/index.ts`:

```typescript
servers: [
  { url: 'http://localhost:8787', description: 'Local Development Server' },
  { url: 'https://your-worker.your-subdomain.workers.dev', description: 'Production Server' },
]
```

## Rate Limits & Constraints

| Operation | Limit |
|-----------|-------|
| Write operations | 1 write/second per key |
| Batch read | 100 keys per request |
| Bulk write | 10,000 pairs per request |
| Bulk delete | No limit |
| Key size | 1-512 characters |
| Timestamp window (HMAC) | 5 minutes |

## Security Best Practices

1. **Use HTTPS in Production** - Never send credentials over HTTP
2. **Rotate Secrets Regularly** - Update your `AUTH_SECRET_KEY` periodically
3. **Prefer HMAC for Sensitive Operations** - Provides request integrity and replay protection
4. **Keep Secrets Secure** - Never commit `.dev.vars` or hardcode secrets
5. **Use Wrangler Secrets** - Store production secrets with `wrangler secret put`

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message here",
  "hint": "Optional helpful hint"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `207` - Multi-Status (partial success in bulk operations)
- `400` - Bad Request
- `401` - Unauthorized (authentication failed)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Hono Framework](https://hono.dev/)
- [Scalar API Documentation](https://github.com/scalar/scalar)
- [Interactive API Docs](http://localhost:8787/api/v1/docs) - Try the API live
- [Authentication Section](#authentication) - Complete auth guide with examples

## License

MIT

## Development

This project uses [Turborepo](https://turbo.build) for managing the monorepo with workspaces at `apps/*` and `packages/*`.

### Workspace Structure

- **apps/api** - Cloudflare Workers API built with Hono
- **apps/next-example** - Next.js application demonstrating API usage
- **packages/typescript-sdk** - Reusable TypeScript client library

### Available Commands

```bash
# Install all dependencies
bun install

# Development (run all apps/packages in dev mode)
bun run dev

# Build all packages
bun run build

# Deploy API to Cloudflare
bun run deploy

# Lint all packages
bun run lint

# Format all code
bun run format

# Run tests
bun run test

# Generate TypeScript types from Cloudflare config
bun run cf-typegen
```

### Working with Specific Workspaces

```bash
# Develop API only
cd apps/api
bun run dev

# Develop Next.js example
cd apps/next-example
bun run dev

# Work with SDK
cd packages/typescript-sdk
bun run build
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [Interactive Documentation](http://localhost:8787/api/v1/docs)
- Review the [Authentication Section](#authentication) in this README

---

Built with Cloudflare Workers, Hono, and TypeScript

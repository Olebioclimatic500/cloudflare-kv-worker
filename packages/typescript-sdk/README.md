# Cloudflare KV TypeScript SDK

> ⚠️ **SERVER-SIDE ONLY**: This SDK is designed exclusively for server-side use. Do not use in browser/client-side applications.

TypeScript/JavaScript SDK for interacting with the Cloudflare KV Worker API with Bearer token and HMAC authentication support.

## Installation

```bash
npm install @cloudflare-kv/typescript-sdk
# or
bun add @cloudflare-kv/typescript-sdk
```

## Supported Environments

This SDK is designed for server-side use in:
- Node.js (v18+)
- Deno
- Bun
- Cloudflare Workers
- Other server-side JavaScript runtimes

The SDK will automatically prevent usage in browser environments to protect your credentials.

## Authentication Methods

This SDK supports two authentication methods:

1. **Bearer Token** (Recommended) - Simple token-based auth
2. **HMAC Signature** - Cryptographic signature-based auth for server-to-server communication

### Basic Usage

Use Bearer token authentication for most server-side applications:

#### Easy Setup with Environment Variables

```typescript
import { createServerClientFromEnv, KVClient } from '@cloudflare-kv/typescript-sdk';

// Method 1: Using the helper function (recommended)
// Expects: KV_API_URL and KV_API_TOKEN environment variables
const client = createServerClientFromEnv();

// Method 2: Using the static method
const client = KVClient.fromEnv();

// Method 3: Custom environment variable names
const client = createServerClientFromEnv({
  urlKey: 'MY_KV_URL',      // instead of KV_API_URL
  tokenKey: 'MY_KV_TOKEN',   // instead of KV_API_TOKEN
  timeoutKey: 'MY_TIMEOUT'   // instead of KV_API_TIMEOUT (optional)
});
```

#### Manual Configuration

```typescript
import { createServerClient } from '@cloudflare-kv/typescript-sdk';

const client = createServerClient({
  baseUrl: 'https://your-worker.workers.dev',
  token: process.env.KV_API_TOKEN, // Store securely in environment variables
});

// Use the client
await client.put('user:123', { name: 'John Doe' });
const user = await client.get('user:123');
```

### HMAC Authentication (Advanced)

For server-to-server communication, you can use HMAC authentication:

```typescript
import { KVClient } from '@cloudflare-kv/typescript-sdk';

const client = new KVClient({
  baseUrl: 'https://your-worker.workers.dev',
  auth: {
    type: 'hmac',
    secretKey: process.env.HMAC_SECRET_KEY,
  },
});
```

The SDK automatically generates a unique HMAC signature for each request using the current timestamp and request details.

## API Reference

```typescript
// Write a value
await client.put('user:123', { name: 'John Doe' });

// Read a value
const value = await client.get('user:123');

// Delete a value
await client.delete('user:123');

// List keys
const keys = await client.list({ prefix: 'user:' });
```

## Development

This package is part of the Cloudflare KV monorepo. See the root README for development instructions.
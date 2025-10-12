# Cloudflare KV TypeScript SDK

TypeScript/JavaScript SDK for interacting with the Cloudflare KV Worker API with support for both server-side and browser authentication.

## Installation

```bash
npm install @cloudflare-kv/typescript-sdk
# or
bun add @cloudflare-kv/typescript-sdk
```

## Authentication Methods

This SDK supports two authentication methods:

1. **Bearer Token** (Server-side) - Simple token-based auth for secure server environments
2. **HMAC Signature** (Client-side) - Cryptographic signature-based auth for browser/client applications

### Server-Side Usage (Node.js, Deno, Bun)

Use Bearer token authentication for server-side applications where you can securely store secrets:

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

### Client-Side Usage (Browser, React, Vue, etc.)

Use HMAC authentication for browser applications. **The SDK automatically generates a unique HMAC signature for every request**:

```typescript
import { createBrowserClient } from '@cloudflare-kv/typescript-sdk';

const client = createBrowserClient({
  baseUrl: 'https://your-worker.workers.dev',
  secretKey: process.env.REACT_APP_AUTH_SECRET_KEY, // Use same AUTH_SECRET_KEY as your Worker
});

// Every request gets a unique signature automatically!
await client.put('preferences:user123', { theme: 'dark' });  // Signature A + Timestamp A
await client.get('preferences:user123');                       // Signature B + Timestamp B
await client.delete('old:data');                              // Signature C + Timestamp C
```

#### How HMAC Works (Automatic):

1. **Each request generates**: New timestamp (`Date.now()`)
2. **SDK creates message**: `METHOD + PATH + TIMESTAMP + BODY`
3. **Signature calculated**: `HMAC-SHA256(secretKey, message)`
4. **Headers added**: `X-Signature` and `X-Timestamp`
5. **Server validates**: Signature match + timestamp within 5 minutes

**No manual work needed - just create the client and use it!**

## Basic Usage

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
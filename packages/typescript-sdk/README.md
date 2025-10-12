# Cloudflare KV TypeScript SDK

TypeScript/JavaScript SDK for interacting with the Cloudflare KV Worker API.

## Installation

```bash
npm install @cloudflare-kv/typescript-sdk
# or
bun add @cloudflare-kv/typescript-sdk
```

## Usage

```typescript
import { KVClient } from '@cloudflare-kv/typescript-sdk';

const client = new KVClient({
  baseUrl: 'https://your-worker.workers.dev',
  authToken: 'your-secret-key'
});

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
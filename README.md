# Cloudflare KV Worker API

A high-performance REST API for managing Cloudflare KV (Key-Value) storage at the edge, built with Hono and TypeScript.

## 🚀 Features

- **🔐 Dual Authentication** - HMAC-SHA256 signatures or Bearer token authentication
- **📦 Batch Operations** - Read up to 100 keys in a single request
- **🔄 Bulk Operations** - Write up to 10,000 key-value pairs at once with automatic retry logic
- **🏷️ Metadata Support** - Attach custom metadata to any key-value pair
- **⏱️ TTL Support** - Set expiration times for automatic key cleanup
- **🔍 Pagination** - List keys with prefix filtering and cursor-based pagination
- **📚 Interactive Documentation** - Beautiful Scalar API reference with examples
- **🎯 Type Safety** - Full TypeScript support with strict typing
- **⚡ Edge Computing** - Runs on Cloudflare's global network for ultra-low latency

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Examples](#examples)
- [Development](#development)
- [Deployment](#deployment)

## 🏁 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- Cloudflare account with Workers access
- KV namespace created

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd cloudflare-kv-worker

# Install dependencies
bun install

# Set up environment variables
echo 'AUTH_SECRET_KEY=your-secret-key-here' > .dev.vars

# Generate types
bun run cf-typegen

# Start development server
bun run dev
```

The API will be available at `http://localhost:8787/api/v1`

## 📚 API Documentation

### Interactive Documentation

Visit the **Scalar API Reference** for interactive documentation with live examples:

```
http://localhost:8787/api/v1/docs
```

Features:
- 📖 Complete API reference with examples
- 🔐 Built-in authentication testing
- 💻 Code examples in JavaScript, Node.js, Python, Shell
- ✨ Beautiful modern UI with dark mode
- 🔍 Search functionality

### OpenAPI Specification

Access the raw OpenAPI 3.0 specification:

```
http://localhost:8787/api/v1/openapi
```

## 🔐 Authentication

All API endpoints (except `/docs`, `/openapi`, and `/`) require authentication using one of two methods.

### Method 1: Bearer Token (Simple)

The easiest way to authenticate. Simply include your `AUTH_SECRET_KEY` as a Bearer token.

**cURL Example:**
```bash
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:8787/api/v1/kv/user:123
```

**JavaScript/Fetch Example:**
```javascript
fetch('http://localhost:8787/api/v1/kv/user:123', {
  headers: {
    'Authorization': 'Bearer your-secret-key'
  }
});
```

**Python Example:**
```python
import requests

response = requests.get(
    'http://localhost:8787/api/v1/kv/user:123',
    headers={'Authorization': 'Bearer your-secret-key'}
)
```

---

### Method 2: HMAC-SHA256 Signature (Secure)

More secure method that prevents replay attacks and ensures request integrity.

**Required Headers:**
- `X-Signature`: HMAC-SHA256 hex signature
- `X-Timestamp`: Unix timestamp in milliseconds

**Signature Generation Steps:**

1. Create the message to sign:
   ```
   MESSAGE = METHOD + PATH + TIMESTAMP + BODY
   ```

2. Generate HMAC-SHA256 signature:
   ```
   SIGNATURE = HMAC-SHA256(SECRET_KEY, MESSAGE)
   ```

3. Convert to hexadecimal string

**JavaScript/Node.js Example:**
```javascript
import crypto from 'crypto';

const method = 'POST';
const path = '/api/v1/kv';
const timestamp = Date.now().toString();
const body = JSON.stringify({ key: 'test', value: 'data' });
const secretKey = 'your-secret-key';

// Create message
const message = method + path + timestamp + body;

// Generate signature
const signature = crypto.createHmac('sha256', secretKey)
  .update(message)
  .digest('hex');

// Make request
fetch('http://localhost:8787/api/v1/kv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature,
    'X-Timestamp': timestamp
  },
  body: body
});
```

**Python Example:**
```python
import hmac
import hashlib
import time
import json
import requests

method = 'POST'
path = '/api/v1/kv'
timestamp = str(int(time.time() * 1000))
body_dict = {'key': 'test', 'value': 'data'}
body = json.dumps(body_dict)
secret_key = 'your-secret-key'

# Create message
message = method + path + timestamp + body

# Generate signature
signature = hmac.new(
    secret_key.encode(),
    message.encode(),
    hashlib.sha256
).hexdigest()

# Make request
response = requests.post(
    'http://localhost:8787/api/v1/kv',
    headers={
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp
    },
    data=body
)
```

**Bash/cURL Example:**
```bash
#!/bin/bash

METHOD="POST"
PATH="/api/v1/kv"
TIMESTAMP=$(date +%s000)
BODY='{"key":"test","value":"data"}'
SECRET_KEY="your-secret-key"

# Generate signature
MESSAGE="${METHOD}${PATH}${TIMESTAMP}${BODY}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$SECRET_KEY" | sed 's/^.* //')

# Make request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Timestamp: $TIMESTAMP" \
  -d "$BODY" \
  http://localhost:8787/api/v1/kv
```

---

### Timestamp Validation

HMAC requests include timestamp validation to prevent replay attacks:

- Timestamp must be in **milliseconds** (e.g., `1735689600000`)
- Timestamp must be within **5 minutes** of server time
- Ensure your system clock is synchronized

**Timestamp Error:**
```json
{
  "error": "Request timestamp expired. Ensure your clock is synchronized."
}
```

---

### Authentication Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Missing authentication | Add `Authorization` or `X-Signature` + `X-Timestamp` headers |
| 401 | Invalid authentication token | Verify your `AUTH_SECRET_KEY` is correct |
| 401 | Invalid HMAC signature | Check message format: `METHOD + PATH + TIMESTAMP + BODY` |
| 401 | Request timestamp expired | Synchronize your system clock |
| 500 | Server authentication not configured | Set `AUTH_SECRET_KEY` in `.dev.vars` or as Wrangler secret |

---

### Security Best Practices

1. **Use HTTPS in Production** - Never send credentials over HTTP
2. **Rotate Secrets Regularly** - Update your `AUTH_SECRET_KEY` periodically
3. **Prefer HMAC for Sensitive Operations** - Provides request integrity and replay protection
4. **Keep Secrets Secure** - Never commit `.dev.vars` or hardcode secrets
5. **Use Wrangler Secrets** - Store production secrets securely:
   ```bash
   wrangler secret put AUTH_SECRET_KEY
   ```

## 🛣️ API Endpoints

### Read Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kv/:key` | Get a single value |
| GET | `/kv/:key/metadata` | Get value with metadata |
| POST | `/kv/batch` | Get multiple values (max 100) |
| POST | `/kv/batch/metadata` | Get multiple values with metadata |
| GET | `/kv` | List keys with pagination |

### Write Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kv` | Create key-value pair (key in body) |
| PUT | `/kv/:key` | Create/update key-value pair (key in URL) |
| POST | `/kv/bulk` | Bulk write (max 10,000 pairs) |

### Delete Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/kv/:key` | Delete single key |
| POST | `/kv/bulk/delete` | Bulk delete keys |

## 💡 Examples

### Write a Value

```javascript
// Using POST with key in body
fetch('http://localhost:8787/api/v1/kv', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-secret-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'user:123',
    value: { name: 'John Doe', email: 'john@example.com' },
    expirationTtl: 86400, // 24 hours
    metadata: { version: 1 }
  })
});
```

### Read a Value

```javascript
// Get with JSON parsing
fetch('http://localhost:8787/api/v1/kv/user:123?type=json', {
  headers: {
    'Authorization': 'Bearer your-secret-key'
  }
})
.then(res => res.json())
.then(data => console.log(data));
// Response: { key: 'user:123', value: { name: 'John Doe', ... } }
```

### Batch Operations

```javascript
// Get multiple keys at once
fetch('http://localhost:8787/api/v1/kv/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-secret-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keys: ['user:123', 'user:456', 'user:789'],
    type: 'json'
  })
});
```

### List Keys with Prefix

```javascript
// List all user keys
fetch('http://localhost:8787/api/v1/kv?prefix=user:&limit=100', {
  headers: {
    'Authorization': 'Bearer your-secret-key'
  }
});
```

### Run Complete Examples

```bash
# Run authentication examples
node examples/hmac-auth-example.js
```

## 🛠️ Development

### Project Structure

```
cloudflare-kv-worker/
├── src/
│   └── index.ts          # Main application with all endpoints
├── examples/
│   └── hmac-auth-example.js  # Authentication examples
├── .dev.vars             # Local environment variables (gitignored)
├── wrangler.jsonc        # Cloudflare Workers configuration
└── README.md             # This file (includes auth guide)
```

### Available Commands

```bash
# Development
bun run dev              # Start local dev server with hot reload
bun run cf-typegen       # Generate TypeScript types from config

# Deployment
bun run deploy           # Deploy to Cloudflare Workers (minified)

# Testing
node examples/hmac-auth-example.js  # Test authentication
```

### Environment Variables

Create a `.dev.vars` file in the root directory:

```env
AUTH_SECRET_KEY=your-secret-key-here
```

**⚠️ Never commit `.dev.vars` to version control!**

### Type Generation

Generate TypeScript types from your Worker configuration:

```bash
bun run cf-typegen
```

This creates type definitions for your CloudflareBindings:

```typescript
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

## 🚢 Deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kulterryan/cloudflare-kv-worker)

### 1. Set Secrets

```bash
# Set your authentication secret
wrangler secret put AUTH_SECRET_KEY
# Enter your secret when prompted
```

### 2. Update Configuration

Edit `wrangler.jsonc` to update:
- Worker name
- KV namespace ID (if using a different namespace)
- Routes and domains

### 3. Deploy

```bash
bun run deploy
```

Your API will be deployed to:
```
https://your-worker.your-subdomain.workers.dev
```

### 4. Update Production URLs

After deployment, update the server URLs in `src/index.ts`:

```typescript
servers: [
  { url: 'http://localhost:8787', description: 'Local Development Server' },
  { url: 'https://your-worker.your-subdomain.workers.dev', description: 'Production Server' },
]
```

## 📊 Rate Limits & Constraints

| Operation | Limit |
|-----------|-------|
| Write operations | 1 write/second per key |
| Batch read | 100 keys per request |
| Bulk write | 10,000 pairs per request |
| Bulk delete | No limit |
| Key size | 1-512 characters |
| Timestamp window (HMAC) | 5 minutes |

## 🔒 Security Best Practices

1. **Use HTTPS in Production** - Never send credentials over HTTP
2. **Rotate Secrets Regularly** - Update your `AUTH_SECRET_KEY` periodically
3. **Prefer HMAC for Sensitive Operations** - Provides request integrity and replay protection
4. **Keep Secrets Secure** - Never commit `.dev.vars` or hardcode secrets
5. **Use Wrangler Secrets** - Store production secrets with `wrangler secret put`

## 🛡️ Error Handling

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

## 📖 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Hono Framework](https://hono.dev/)
- [Scalar API Documentation](https://github.com/scalar/scalar)
- [Interactive API Docs](http://localhost:8787/api/v1/docs) - Try the API live
- [Authentication Section](#-authentication) - Complete auth guide with examples

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check the [Interactive Documentation](http://localhost:8787/api/v1/docs)
- Review the [Authentication Section](#-authentication) in this README

---

**Built with ❤️ using Cloudflare Workers, Hono, and TypeScript**

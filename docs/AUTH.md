# Authentication Guide

All API endpoints (except `/docs`, `/openapi`, and `/`) require authentication using one of two methods:

## Method 1: Bearer Token (Simple)

The easiest way to authenticate. Include your `AUTH_SECRET_KEY` as a Bearer token in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer your-secret-key
```

## Method 2: HMAC-SHA256 Signature (Secure)

More secure method that prevents replay attacks and ensures request integrity.

### Required Headers

- `X-Signature`: HMAC-SHA256 hex signature
- `X-Timestamp`: Unix timestamp in milliseconds

### Signature Generation

1. Create message: `METHOD + PATH + TIMESTAMP + BODY`
2. Generate HMAC-SHA256 signature using your secret key
3. Convert to hexadecimal string

**Example Message Format:**
```
POST/api/v1/kv1735689600000{"key":"test","value":"data"}
```

### Timestamp Requirements

- Must be in milliseconds (e.g., `1735689600000`)
- Must be within 5 minutes of server time
- Ensure your system clock is synchronized

## Authentication Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Missing authentication | Add `Authorization` or `X-Signature` + `X-Timestamp` headers |
| 401 | Invalid authentication token | Verify your `AUTH_SECRET_KEY` is correct |
| 401 | Invalid HMAC signature | Check message format: `METHOD + PATH + TIMESTAMP + BODY` |
| 401 | Request timestamp expired | Synchronize your system clock |
| 500 | Server authentication not configured | Set `AUTH_SECRET_KEY` in `.dev.vars` or as Wrangler secret |

## Security Best Practices

1. **Use HTTPS in Production** - Never send credentials over HTTP
2. **Rotate Secrets Regularly** - Update your `AUTH_SECRET_KEY` periodically
3. **Prefer HMAC for Sensitive Operations** - Provides request integrity and replay protection
4. **Keep Secrets Secure** - Never commit `.dev.vars` or hardcode secrets
5. **Use Wrangler Secrets** - Store production secrets with `wrangler secret put AUTH_SECRET_KEY`

## Code Examples

For complete authentication examples with code samples in JavaScript, Python, cURL, and other languages, visit the [Interactive API Documentation](http://localhost:8787/api/v1/docs).

## Setting Up Authentication

### Development

Create a `.dev.vars` file in the root directory:

```env
AUTH_SECRET_KEY=your-secret-key-here
```

**WARNING: Never commit `.dev.vars` to version control!**

### Production

Use Wrangler to securely store your secret:

```bash
wrangler secret put AUTH_SECRET_KEY
# Enter your secret when prompted
```

## Testing Authentication

Run the included authentication example:

```bash
node examples/hmac-auth-example.js
```

This script demonstrates both Bearer token and HMAC signature authentication methods.

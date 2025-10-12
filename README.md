# Cloudflare KV Worker API

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kulterryan/cloudflare-kv-worker)

A high-performance REST API for managing Cloudflare KV (Key-Value) storage at the edge, built with Hono and TypeScript.

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

- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Contributing](#contributing)

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

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [Interactive Documentation](http://localhost:8787/api/v1/docs)
- Review the [Authentication Section](#authentication) in this README

---

Built with Cloudflare Workers, Hono, and TypeScript

# Contributing to Cloudflare KV Worker API

Thank you for your interest in contributing! This guide will help you get started with development in our monorepo.

## Prerequisites

Before you begin, ensure you have:

- [Bun](https://bun.sh/) 1.2.23+ installed
- Cloudflare account with Workers access
- KV namespace created

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone [https://github.com/kulterryan/cloudflare-kv-worker](https://github.com/kulterryan/cloudflare-kv-worker)
cd cloudflare-kv-worker

# Install dependencies (all workspaces)
bun install

# Set up local environment
echo 'AUTH_SECRET_KEY=dev-secret-key-change-in-production' > apps/api/.dev.vars
```

### 2. Generate Types

```bash
bun run cf-typegen
```

### 3. Start Development

```bash
# Start all development servers from root
bun run dev
```

This will start:
- **API**: http://localhost:8787/api/v1
- **Next.js Example**: http://localhost:3000 (if configured)
- **Interactive API Docs**: http://localhost:8787/api/v1/docs

## Monorepo Structure

This is a [Turborepo](https://turbo.build) monorepo with the following workspaces:

```
cloudflare-kv-worker/
├── apps/
│   ├── api/               # Cloudflare KV Worker API (Hono + TypeScript)
│   │   ├── src/index.ts   # Main application with all endpoints (~1572 lines)
│   │   ├── wrangler.jsonc # Cloudflare Workers configuration
│   │   ├── examples/      # Authentication examples
│   │   └── package.json   # API dependencies
│   └── next-example/      # Next.js example application using the API
├── packages/
│   └── typescript-sdk/    # TypeScript/JavaScript client SDK
├── docs/
│   └── AUTH.md           # Authentication documentation
├── turbo.json            # Turborepo configuration
└── package.json          # Root workspace configuration
```

## Available Commands

All commands are run from the root directory:

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

## Working with Specific Workspaces

You can also work on individual workspaces:

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

## Environment Variables

Create a `.dev.vars` file in the `apps/api/` directory:

```env
AUTH_SECRET_KEY=your-secret-key-here
```

**WARNING: Never commit `.dev.vars` to version control!**

## Code Style & Best Practices

This project follows the **Ultracite** configuration for strict TypeScript, accessibility, and code quality standards:

- Follow TypeScript best practices and maintain strict typing
- Use ESM imports with the `node:` protocol for builtins
- Maintain consistent error handling patterns with try-catch blocks
- Add appropriate validation for all inputs using Valibot schemas
- Document complex logic with comments
- Follow accessibility (a11y) standards as defined in CLAUDE.md
- Use the recommended Ultracite formatting rules (run `bun run format`)

## Testing Your Changes

Before submitting your changes:

1. **Test all endpoints** using the interactive documentation at `http://localhost:8787/api/v1/docs`
2. **Verify authentication** works with both Bearer token and HMAC-SHA256 methods
3. **Run the authentication example**: `node apps/api/examples/hmac-auth-example.js`
4. **Test edge cases** and error scenarios:
   - Invalid keys (outside 1-512 character range)
   - Batch operations at limits (100 for batch read, 10,000 for bulk write)
   - TTL edge cases (minimum 60 seconds)
   - Rate limiting scenarios (1 write/second per key)

## Making Changes

1. Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`
2. Make your changes following the existing code style and CLAUDE.md guidelines
3. Test your changes locally with `bun run dev`
4. Run the linter and formatter: `bun run lint && bun run format`
5. Ensure all tests pass: `bun run test`
6. Submit a pull request with a clear description of your changes

## API Development Guidelines

### Validation
- Use Valibot schemas for all request/response validation
- Include custom validators for complex checks (e.g., key format)
- Handle validation errors gracefully with appropriate HTTP status codes

### Error Handling
- Return consistent error responses with `error` field and optional `hint`
- Use appropriate HTTP status codes:
  - `201` for created resources
  - `207` for multi-status (partial success in bulk operations)
  - `401` for authentication failures
  - `429` for rate limits
  - `500` for server errors

### Response Format
- Single operations: `{ success: boolean, data?: T, error?: string }`
- Bulk operations: `{ success: boolean, total: number, successful: number, failed: number, results: T[] }`

### Key Constraints
- Key size: 1-512 characters (cannot be "." or "..")
- Batch read: max 100 keys
- Bulk write: max 10,000 pairs with auto-retry on rate limits
- TTL minimum: 60 seconds
- Write rate: 1 per second per key
- HMAC timestamp window: 5 minutes

## Submitting Pull Requests

1. Ensure your code follows the project style and passes linting
2. Update documentation (README.md, CONTRIBUTING.md, or docs/AUTH.md) if you've added or changed features
3. Provide a clear, detailed description of the changes
4. Reference any related GitHub issues
5. Ensure all tests pass and there are no breaking changes

## Resources

- [Hono Documentation](https://hono.dev/) - Web framework
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Valibot](https://valibot.dev/) - Runtime validation
- [Turborepo](https://turbo.build) - Monorepo management
- [Scalar API Reference](https://github.com/scalar/scalar) - API documentation UI
- [Interactive API Docs](http://localhost:8787/api/v1/docs) - Try the API live
- [Authentication Documentation](docs/AUTH.md) - Complete auth guide

## Questions?

- Check the [Interactive API Documentation](http://localhost:8787/api/v1/docs)
- Review the [README](README.md) for overview and features
- Read [docs/AUTH.md](docs/AUTH.md) for authentication details
- Open an issue for questions or discussions

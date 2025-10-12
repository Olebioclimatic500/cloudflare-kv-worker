# Packages

This directory contains shared packages and SDKs for the Cloudflare KV API.

## Available Packages

- **typescript-sdk** - TypeScript/JavaScript SDK for the Cloudflare KV Worker API
- (Future) **python-sdk** - Python SDK
- (Future) **go-sdk** - Go SDK
- (Future) **shared** - Shared utilities and types

## Creating a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with the package name following the pattern `@cloudflare-kv/package-name`
3. Configure build scripts and dependencies
4. Update the root `turbo.json` if needed

## Development

All packages are managed through Turborepo. Run commands from the root:

```bash
# Build all packages
bun run build

# Develop with watch mode
bun run dev

# Run tests
bun run test
```
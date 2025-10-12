# Contributing to Cloudflare KV Worker API

Thank you for your interest in contributing! This guide will help you get started with development.

## Development Setup

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

## Project Structure

```
cloudflare-kv-worker/
├── src/
│   └── index.ts          # Main application with all endpoints
├── examples/
│   └── hmac-auth-example.js  # Authentication examples
├── .dev.vars             # Local environment variables (gitignored)
├── wrangler.jsonc        # Cloudflare Workers configuration
└── README.md             # Project documentation
```

## Available Commands

```bash
# Development
bun run dev              # Start local dev server with hot reload
bun run cf-typegen       # Generate TypeScript types from config

# Deployment
bun run deploy           # Deploy to Cloudflare Workers (minified)

# Testing
node examples/hmac-auth-example.js  # Test authentication
```

## Environment Variables

Create a `.dev.vars` file in the root directory:

```env
AUTH_SECRET_KEY=your-secret-key-here
```

**WARNING: Never commit `.dev.vars` to version control!**

## Type Generation

Generate TypeScript types from your Worker configuration:

```bash
bun run cf-typegen
```

This creates type definitions for your CloudflareBindings:

```typescript
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

## Making Changes

1. Create a new branch for your feature or bug fix
2. Make your changes following the existing code style
3. Test your changes locally with `bun run dev`
4. Ensure TypeScript types are correct with `bun run cf-typegen`
5. Submit a pull request with a clear description of your changes

## Code Style

- Follow TypeScript best practices
- Use strict typing throughout
- Maintain consistent error handling patterns
- Add appropriate validation for all inputs
- Document complex logic with comments

## Testing

Before submitting your changes:

1. Test all endpoints using the interactive documentation at `http://localhost:8787/api/v1/docs`
2. Verify authentication works with both Bearer token and HMAC methods
3. Run the authentication example: `node examples/hmac-auth-example.js`
4. Test edge cases and error scenarios

## Submitting Pull Requests

1. Ensure your code follows the project style
2. Update documentation if you've added or changed features
3. Provide a clear description of the changes
4. Reference any related issues

## Questions?

- Check the [Interactive API Documentation](http://localhost:8787/api/v1/docs)
- Review the [README](README.md) for setup instructions
- Open an issue for questions or discussions

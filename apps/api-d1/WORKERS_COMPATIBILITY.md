# Cloudflare Workers Compatibility

This document clarifies what code runs where and ensures Cloudflare Workers compatibility.

## Code That Runs in Cloudflare Workers (Edge Runtime)

These files are bundled and deployed to Cloudflare Workers:

### ✅ `src/index.ts`
- **Runtime**: Cloudflare Workers
- **APIs Used**: 
  - Hono framework (Workers-compatible)
  - Valibot validation (Workers-compatible)
  - D1 database API (native to Workers)
  - Web Standards: `crypto`, `TextEncoder`, `Request`, `Response`
- **Status**: ✅ Fully compatible

### ✅ `src/d1-helpers.ts`
- **Runtime**: Cloudflare Workers
- **APIs Used**:
  - `atob()` / `btoa()` - Available in Workers
  - `Date.now()` - Available in Workers
  - `Math.floor()` - Available in Workers
  - `JSON.parse()` / `JSON.stringify()` - Available in Workers
  - D1Database API - Native to Workers
- **Status**: ✅ Fully compatible

## Code That Runs Locally (NOT in Workers)

These files run on your development machine and are NOT deployed:

### 🚫 `scripts/postinstall.mjs`
- **Runtime**: Node.js (local machine)
- **Purpose**: Auto-migrate local D1 database after `bun install`
- **Node.js APIs**: `child_process`, `fs`, `path`
- **Deployment**: NOT bundled or deployed to Workers

### 🚫 `scripts/predeploy.mjs`
- **Runtime**: Node.js (local machine)
- **Purpose**: Verify remote database before deployment
- **Node.js APIs**: `child_process`, `fs`, `path`, `readline`
- **Deployment**: NOT bundled or deployed to Workers

### 🚫 `scripts/migrate-d1.sh`
- **Runtime**: Bash (local machine)
- **Purpose**: Manual migration runner using wrangler CLI
- **Deployment**: NOT bundled or deployed to Workers

### 🚫 `migrations/*.sql`
- **Runtime**: Executed via wrangler CLI (local machine)
- **Purpose**: Database schema definitions
- **Deployment**: NOT bundled or deployed to Workers

## Why This Works

Wrangler (Cloudflare's build tool) only bundles:
1. Your entry point (`src/index.ts`)
2. Any files imported by the entry point
3. Dependencies used by those files

The `scripts/` and `migrations/` directories are never imported by `src/index.ts`, so they're automatically excluded from the bundle.

## Verification

You can verify what gets deployed by running:

```bash
bun run build
```

Then check `dist/index.js` - you'll see only the Worker runtime code, not the local scripts.

## Workers Runtime Features Used

All APIs used in the Worker code are part of the Cloudflare Workers runtime:

| API | Status | Alternative |
|-----|--------|-------------|
| `crypto.subtle` | ✅ Native | - |
| `TextEncoder` | ✅ Native | - |
| `atob()` / `btoa()` | ✅ Native | - |
| `Date.now()` | ✅ Native | - |
| `JSON` methods | ✅ Native | - |
| `D1Database` | ✅ Native | - |
| `fetch()` | ✅ Native | - |
| `Request` / `Response` | ✅ Native | - |

## No Node.js Dependencies in Workers Code

The Worker code (`src/`) has ZERO Node.js-specific dependencies:
- ❌ No `fs` module
- ❌ No `path` module
- ❌ No `child_process` module
- ❌ No `Buffer` (uses TextEncoder instead)
- ❌ No `process.env` (uses `c.env` from Hono context)

## Bundle Size

The Worker bundle is optimized and contains only:
- Hono framework (~50KB minified)
- Valibot validation (~20KB minified)
- Your application code (~15KB minified)
- **Total**: ~85KB (well within Workers 1MB limit)

## Testing

To verify Workers compatibility:

```bash
# Test locally with wrangler
bun run dev

# Dry-run deployment (see bundle size)
bun run build

# Check for any compatibility issues
bunx wrangler deploy --dry-run
```

## Common Pitfalls Avoided

✅ **No Node.js imports** in Worker code  
✅ **No file system access** in Worker code  
✅ **No synchronous operations** that block  
✅ **No environment variables** via `process.env` (uses `c.env`)  
✅ **No Buffer** usage (uses `TextEncoder`/`TextDecoder`)  
✅ **No `__dirname` or `__filename`** in Worker code

## Summary

- **Worker Code** (`src/`): 100% Cloudflare Workers compatible ✅
- **Local Scripts** (`scripts/`, `migrations/`): Run locally, not deployed 🚫
- **Build Process**: Automatically excludes local-only code ✅
- **Bundle**: Optimized and Workers-compatible ✅

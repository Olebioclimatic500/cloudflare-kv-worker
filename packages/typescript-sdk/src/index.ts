/**
 * @packageDocumentation
 * Server-side TypeScript SDK for Cloudflare KV Worker API
 *
 * ⚠️ WARNING: This SDK is for SERVER-SIDE use only!
 *
 * DO NOT use this SDK in browser/client-side environments as it would expose
 * your API credentials (Bearer tokens or HMAC secret keys) to end users,
 * creating a serious security vulnerability.
 *
 * Supported server-side environments:
 * - Node.js (v18+)
 * - Deno
 * - Bun
 * - Cloudflare Workers
 * - Any other server-side JavaScript runtime
 *
 * The SDK will automatically detect and prevent client-side usage by checking
 * for browser globals (window, document) and Web Worker contexts.
 */

export {
  KVClient,
  createServerClient,
  createServerClientFromEnv,
  // Note: createBrowserClient is deprecated - kept for backwards compatibility
  // but strongly discouraged. Use createServerClient instead.
  type KVClientOptions,
  type AuthOptions,
  type BearerAuthOptions,
  type HMACAuthOptions,
  type KVValue,
  type KVMetadata,
  type ListKeysOptions,
  type ListKeysResponse,
  type PutOptions,
  type BatchGetOptions,
  type BulkWritePair,
  type BulkWriteResponse,
} from './client';
/**
 * KV Client utility for server-side use
 */

import { createServerClientFromEnv } from '@cloudflare-kv/typescript-sdk';

/**
 * Get KV client using environment variables
 */
export function getKVClient() {
  return createServerClientFromEnv();
}

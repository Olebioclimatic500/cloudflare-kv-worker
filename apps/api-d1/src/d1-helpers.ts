/**
 * D1 KV Namespace Helper
 * 
 * Provides a KV-like interface on top of D1 (SQLite) database.
 * This code runs in Cloudflare Workers runtime - 100% Workers compatible.
 * 
 * ✅ Uses only Workers-compatible APIs:
 *    - D1Database API (native to Workers)
 *    - atob() / btoa() (Web Standards)
 *    - Date.now(), Math.floor() (JavaScript standards)
 *    - JSON.parse() / JSON.stringify() (JavaScript standards)
 * 
 * ❌ Does NOT use:
 *    - Node.js APIs (fs, Buffer, etc.)
 *    - Any synchronous blocking operations
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types';

export interface D1KVOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: unknown;
  cacheTtl?: number;
}

export interface D1KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface D1KVListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: unknown;
  }>;
  list_complete: boolean;
  cursor?: string;
}

export interface D1KVGetWithMetadataResult<T = unknown> {
  value: string | null;
  metadata: T | null;
}

// Helper to convert TTL to expiration timestamp
function getExpiration(options?: D1KVOptions): number | null {
  if (options?.expiration) {
    return options.expiration;
  }
  if (options?.expirationTtl) {
    return Math.floor(Date.now() / 1000) + options.expirationTtl;
  }
  return null;
}

// Helper to parse cursor for pagination
function parseCursor(cursor?: string): { offset: number } {
  if (!cursor) return { offset: 0 };
  try {
    const decoded = atob(cursor);
    return JSON.parse(decoded);
  } catch {
    return { offset: 0 };
  }
}

// Helper to create cursor for pagination
function createCursor(offset: number): string {
  return btoa(JSON.stringify({ offset }));
}

export class D1KVNamespace {
  constructor(private db: D1Database) {}

  async get(key: string | string[], options?: D1KVOptions): Promise<string | null | Map<string, string | null>> {
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (Array.isArray(key)) {
      // Batch get
      const placeholders = key.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        SELECT key, value 
        FROM kv_store 
        WHERE key IN (${placeholders}) 
          AND (expiration IS NULL OR expiration > ?)
      `);
      
      const result = await stmt.bind(...key, currentTime).all();
      const map = new Map<string, string | null>();
      
      // Initialize all keys with null
      for (const k of key) {
        map.set(k, null);
      }
      
      // Set actual values
      for (const row of result.results) {
        map.set(row.key as string, row.value as string);
      }
      
      return map;
    } else {
      // Single get
      const stmt = this.db.prepare(`
        SELECT value 
        FROM kv_store 
        WHERE key = ? 
          AND (expiration IS NULL OR expiration > ?)
      `);
      
      const result = await stmt.bind(key, currentTime).first();
      return result ? (result.value as string) : null;
    }
  }

  async getWithMetadata<T = unknown>(
    key: string | string[], 
    options?: D1KVOptions
  ): Promise<D1KVGetWithMetadataResult<T> | Map<string, D1KVGetWithMetadataResult<T>>> {
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (Array.isArray(key)) {
      // Batch get with metadata
      const placeholders = key.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        SELECT key, value, metadata 
        FROM kv_store 
        WHERE key IN (${placeholders}) 
          AND (expiration IS NULL OR expiration > ?)
      `);
      
      const result = await stmt.bind(...key, currentTime).all();
      const map = new Map<string, D1KVGetWithMetadataResult<T>>();
      
      // Initialize all keys with null values
      for (const k of key) {
        map.set(k, { value: null, metadata: null });
      }
      
      // Set actual values
      for (const row of result.results) {
        const metadata = row.metadata ? JSON.parse(row.metadata as string) : null;
        map.set(row.key as string, { 
          value: row.value as string, 
          metadata: metadata as T 
        });
      }
      
      return map;
    } else {
      // Single get with metadata
      const stmt = this.db.prepare(`
        SELECT value, metadata 
        FROM kv_store 
        WHERE key = ? 
          AND (expiration IS NULL OR expiration > ?)
      `);
      
      const result = await stmt.bind(key, currentTime).first();
      if (!result) {
        return { value: null, metadata: null };
      }
      
      const metadata = result.metadata ? JSON.parse(result.metadata as string) : null;
      return { 
        value: result.value as string, 
        metadata: metadata as T 
      };
    }
  }

  async put(key: string, value: string, options?: D1KVOptions): Promise<void> {
    const expiration = getExpiration(options);
    const metadata = options?.metadata ? JSON.stringify(options.metadata) : null;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO kv_store (key, value, metadata, expiration, updated_at) 
      VALUES (?, ?, ?, ?, unixepoch())
    `);
    
    await stmt.bind(key, value, metadata, expiration).run();
  }

  async delete(key: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM kv_store WHERE key = ?');
    await stmt.bind(key).run();
  }

  async list(options?: D1KVListOptions): Promise<D1KVListResult> {
    const currentTime = Math.floor(Date.now() / 1000);
    const limit = options?.limit || 1000;
    const { offset } = parseCursor(options?.cursor);
    const prefix = options?.prefix || '';
    
    // Get keys with limit + 1 to check if there are more results
    const stmt = this.db.prepare(`
      SELECT key, metadata, expiration 
      FROM kv_store 
      WHERE key LIKE ? || '%' 
        AND (expiration IS NULL OR expiration > ?)
      ORDER BY key 
      LIMIT ? OFFSET ?
    `);
    
    const dbResult = await stmt.bind(prefix, currentTime, limit + 1, offset).all();
    const keys = dbResult.results.slice(0, limit).map(row => {
      const keyItem: { name: string; expiration?: number; metadata?: unknown } = {
        name: row.key as string
      };
      if (row.expiration) {
        keyItem.expiration = row.expiration as number;
      }
      if (row.metadata) {
        keyItem.metadata = JSON.parse(row.metadata as string);
      }
      return keyItem;
    });
    
    const hasMore = dbResult.results.length > limit;
    
    const result: D1KVListResult = {
      keys,
      list_complete: !hasMore
    };
    
    if (hasMore) {
      result.cursor = createCursor(offset + limit);
    }
    
    return result;
  }

  // Cleanup expired entries (should be called periodically)
  async cleanupExpired(): Promise<number> {
    const currentTime = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare('DELETE FROM kv_store WHERE expiration IS NOT NULL AND expiration <= ?');
    const result = await stmt.bind(currentTime).run();
    return result.meta.changes;
  }
}

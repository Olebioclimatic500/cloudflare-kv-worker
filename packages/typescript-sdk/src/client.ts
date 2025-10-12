// Authentication types
export type AuthMethod = 'bearer' | 'hmac';

export interface BearerAuthOptions {
  type: 'bearer';
  token: string;
}

export interface HMACAuthOptions {
  type: 'hmac';
  secretKey: string;
}

export type AuthOptions = BearerAuthOptions | HMACAuthOptions;

export interface KVClientOptions {
  baseUrl: string;
  auth: AuthOptions;
  timeout?: number;
}

// Response types
export interface KVValue<T = unknown> {
  key: string;
  value: T;
}

export interface KVMetadata<T = unknown> {
  key: string;
  value: T;
  metadata: Record<string, unknown> | null;
}

export interface ListKeysOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListKeysResponse {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: Record<string, unknown>;
  }>;
  list_complete: boolean;
  cursor?: string;
}

export interface PutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

export interface BatchGetOptions {
  keys: string[];
  type?: 'text' | 'json';
  cacheTtl?: number;
}

export interface BulkWritePair {
  key: string;
  value: unknown;
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

export interface BulkWriteResponse {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    key: string;
    success: boolean;
    error?: string;
  }>;
}

export class KVClient {
  private baseUrl: string;
  private auth: AuthOptions;
  private timeout: number;

  constructor(options: KVClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.auth = options.auth;
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Create a KVClient instance from environment variables
   * Expects: KV_API_URL and KV_API_TOKEN to be set
   * Optional: KV_API_TIMEOUT (defaults to 30000ms)
   *
   * @example
   * // Automatically reads from process.env
   * const client = KVClient.fromEnv();
   *
   * @example
   * // With custom environment variable names
   * const client = KVClient.fromEnv({
   *   urlKey: 'MY_KV_URL',
   *   tokenKey: 'MY_KV_TOKEN',
   *   timeoutKey: 'MY_KV_TIMEOUT'
   * });
   */
  static fromEnv(options?: {
    urlKey?: string;
    tokenKey?: string;
    timeoutKey?: string;
  }): KVClient {
    const urlKey = options?.urlKey || 'KV_API_URL';
    const tokenKey = options?.tokenKey || 'KV_API_TOKEN';
    const timeoutKey = options?.timeoutKey || 'KV_API_TIMEOUT';

    const baseUrl = process.env[urlKey];
    const token = process.env[tokenKey];
    const timeoutStr = process.env[timeoutKey];

    if (!baseUrl) {
      throw new Error(`Environment variable ${urlKey} is not set`);
    }
    if (!token) {
      throw new Error(`Environment variable ${tokenKey} is not set`);
    }

    const timeout = timeoutStr ? parseInt(timeoutStr, 10) : undefined;
    if (timeout !== undefined && isNaN(timeout)) {
      throw new Error(`Environment variable ${timeoutKey} must be a valid number`);
    }

    return new KVClient({
      baseUrl,
      auth: { type: 'bearer', token },
      timeout,
    });
  }

  /**
   * Generate HMAC-SHA256 signature for a request
   */
  private async generateHMACSignature(
    secretKey: string,
    method: string,
    path: string,
    body: string = ''
  ): Promise<{ signature: string; timestamp: string }> {
    const timestamp = Date.now().toString();
    const message = `${method}${path}${timestamp}${body}`;

    // Use Web Crypto API for browser compatibility
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return { signature, timestamp };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const urlPath = new URL(url).pathname;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Handle authentication based on type
    if (this.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    } else if (this.auth.type === 'hmac') {
      // Generate HMAC signature
      const method = options.method || 'GET';
      const body = options.body ? options.body.toString() : '';
      const { signature, timestamp } = await this.generateHMACSignature(
        this.auth.secretKey,
        method,
        urlPath,
        body
      );

      headers['X-Signature'] = signature;
      headers['X-Timestamp'] = timestamp;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Get a single value by key
   */
  async get<T = unknown>(key: string, type: 'text' | 'json' = 'json'): Promise<KVValue<T>> {
    return this.request<KVValue<T>>(`/api/v1/kv/${encodeURIComponent(key)}?type=${type}`);
  }

  /**
   * Get a single value with metadata
   */
  async getWithMetadata<T = unknown>(
    key: string,
    type: 'text' | 'json' = 'json'
  ): Promise<KVMetadata<T>> {
    return this.request<KVMetadata<T>>(
      `/api/v1/kv/${encodeURIComponent(key)}/metadata?type=${type}`
    );
  }

  /**
   * Get multiple values by keys (max 100)
   */
  async batchGet<T = unknown>(options: BatchGetOptions): Promise<Record<string, T | null>> {
    const response = await this.request<{ values: Record<string, T | null> }>(
      '/api/v1/kv/batch',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
    return response.values;
  }

  /**
   * Get multiple values with metadata
   */
  async batchGetWithMetadata<T = unknown>(
    options: BatchGetOptions
  ): Promise<Record<string, { value: T | null; metadata: Record<string, unknown> | null }>> {
    const response = await this.request<{
      values: Record<string, { value: T | null; metadata: Record<string, unknown> | null }>;
    }>('/api/v1/kv/batch/metadata', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.values;
  }

  /**
   * List keys with optional prefix filtering and pagination
   */
  async list(options: ListKeysOptions = {}): Promise<ListKeysResponse> {
    const params = new URLSearchParams();
    if (options.prefix) params.set('prefix', options.prefix);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ListKeysResponse>(`/api/v1/kv${query}`);
  }

  /**
   * Write a single key-value pair (PUT method)
   */
  async put<T = unknown>(key: string, value: T, options: PutOptions = {}): Promise<void> {
    await this.request<{ success: boolean }>(`/api/v1/kv/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({
        value,
        ...options,
      }),
    });
  }

  /**
   * Write a single key-value pair (POST method)
   */
  async create<T = unknown>(key: string, value: T, options: PutOptions = {}): Promise<void> {
    await this.request<{ success: boolean }>('/api/v1/kv', {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        ...options,
      }),
    });
  }

  /**
   * Bulk write multiple key-value pairs (max 10,000)
   */
  async bulkWrite(pairs: BulkWritePair[]): Promise<BulkWriteResponse> {
    return this.request<BulkWriteResponse>('/api/v1/kv/bulk', {
      method: 'POST',
      body: JSON.stringify({ pairs }),
    });
  }

  /**
   * Delete a single key
   */
  async delete(key: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/v1/kv/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk delete multiple keys
   */
  async bulkDelete(keys: string[]): Promise<BulkWriteResponse> {
    return this.request<BulkWriteResponse>('/api/v1/kv/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ keys }),
    });
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/v1/health');
  }
}

/**
 * Create a client with Bearer token authentication (for server-side)
 */
export function createServerClient(options: {
  baseUrl: string;
  token: string;
  timeout?: number;
}): KVClient {
  return new KVClient({
    baseUrl: options.baseUrl,
    auth: { type: 'bearer', token: options.token },
    timeout: options.timeout,
  });
}

/**
 * Create a client with HMAC authentication (for browser/client-side)
 */
export function createBrowserClient(options: {
  baseUrl: string;
  secretKey: string;
  timeout?: number;
}): KVClient {
  return new KVClient({
    baseUrl: options.baseUrl,
    auth: { type: 'hmac', secretKey: options.secretKey },
    timeout: options.timeout,
  });
}

/**
 * Create a server client from environment variables
 * Expects: KV_API_URL and KV_API_TOKEN to be set
 * Optional: KV_API_TIMEOUT (defaults to 30000ms)
 *
 * @example
 * // Using default environment variable names
 * const client = createServerClientFromEnv();
 *
 * @example
 * // Using custom environment variable names
 * const client = createServerClientFromEnv({
 *   urlKey: 'MY_KV_URL',
 *   tokenKey: 'MY_KV_TOKEN',
 *   timeoutKey: 'MY_KV_TIMEOUT'
 * });
 */
export function createServerClientFromEnv(options?: {
  urlKey?: string;
  tokenKey?: string;
  timeoutKey?: string;
}): KVClient {
  return KVClient.fromEnv(options);
}
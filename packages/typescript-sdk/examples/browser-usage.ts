import { createBrowserClient } from '../src';

/**
 * Browser/client-side usage example with HMAC authentication
 *
 * HOW HMAC AUTHENTICATION WORKS:
 * ================================
 * The SDK automatically generates a NEW HMAC signature for EVERY request:
 *
 * 1. For each request, a fresh timestamp is generated (Date.now())
 * 2. A message is created: METHOD + PATH + TIMESTAMP + BODY
 * 3. HMAC-SHA256 signature is calculated using your secret key
 * 4. Headers are added: X-Signature (the HMAC) and X-Timestamp
 * 5. Server validates the signature and checks timestamp (must be within 5 minutes)
 *
 * This means:
 * - Each request has a unique signature
 * - Replay attacks are prevented (timestamp validation)
 * - Request tampering is detected (signature validation)
 * - No need to manually generate signatures - it's automatic!
 */
async function main() {
  // Create a browser client with HMAC authentication
  // The SDK automatically generates a new HMAC signature for every request
  const client = createBrowserClient({
    baseUrl: 'https://your-worker.workers.dev',
    secretKey: 'your-auth-secret-key', // Use the same AUTH_SECRET_KEY from your Worker
  });

  try {
    // Example: Each of these requests will have a UNIQUE signature
    console.log('Making first request...');
    await client.put('test:1', { value: 'first', timestamp: Date.now() });

    // Wait a bit to show different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Making second request...');
    await client.put('test:2', { value: 'second', timestamp: Date.now() });

    // Each request above had:
    // - Different timestamp
    // - Different signature
    // - Same secret key

    // Store user preferences
    await client.put('preferences:user123', {
      theme: 'dark',
      language: 'en',
      notifications: true,
    });
    console.log('Preferences saved with HMAC signature');

    // Retrieve preferences
    interface Preferences {
      theme: string;
      language: string;
      notifications: boolean;
    }

    const prefs = await client.get<Preferences>('preferences:user123');
    console.log('User preferences:', prefs.value);

    // Store session data with TTL
    await client.put(
      'session:abc123',
      {
        userId: 'user123',
        loginTime: Date.now(),
      },
      {
        expirationTtl: 3600, // Expire after 1 hour
      }
    );
    console.log('Session created with 1 hour TTL');

    // List all sessions
    const sessions = await client.list({ prefix: 'session:' });
    console.log('Active sessions:', sessions.keys.length);

    // Bulk operations - even bulk writes get signed!
    const bulkResult = await client.bulkWrite([
      { key: 'offline:1', value: { action: 'create', data: 'test1' } },
      { key: 'offline:2', value: { action: 'update', data: 'test2' } },
      { key: 'offline:3', value: { action: 'delete', data: 'test3' } },
    ]);
    console.log('Bulk operations completed with HMAC signature:', bulkResult);

  } catch (error) {
    console.error('Error:', error);
    // Common errors:
    // - "Invalid HMAC signature" - wrong secret key
    // - "Request timestamp expired" - clock skew > 5 minutes
  }
}

/**
 * Example: React Hook for KV Client
 * The client can be created once and reused - it will generate
 * new signatures for each request automatically
 */
export function useKVClient() {
  // Create client once - it will sign each request dynamically
  const client = createBrowserClient({
    baseUrl: process.env.REACT_APP_API_URL || 'https://api.example.com',
    secretKey: process.env.REACT_APP_AUTH_SECRET_KEY || '', // Same as AUTH_SECRET_KEY in Worker
  });

  return {
    saveUserData: async (userId: string, data: any) => {
      // This request will be automatically signed with current timestamp
      return client.put(`user:${userId}`, data);
    },
    getUserData: async (userId: string) => {
      // This request gets its own signature too
      return client.get(`user:${userId}`);
    },
    deleteUserData: async (userId: string) => {
      // And this one as well - all automatic!
      return client.delete(`user:${userId}`);
    },
  };
}

/**
 * Example: Debugging HMAC signatures
 * You can see what's being signed by looking at the network tab
 */
export async function debugHMACRequest() {
  const client = createBrowserClient({
    baseUrl: 'http://localhost:8787',
    secretKey: 'test-secret',
  });

  // Make a request and check browser DevTools Network tab
  // You'll see headers like:
  // X-Timestamp: 1704067200000
  // X-Signature: a3f5b8c2d9e1...

  try {
    await client.put('debug:test', { message: 'Check network tab for HMAC headers!' });
    console.log('Check your browser DevTools Network tab to see the HMAC headers!');
  } catch (error) {
    console.error('Debug request failed:', error);
  }
}

export { main };
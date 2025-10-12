import { createServerClient, createServerClientFromEnv, KVClient } from '../src';

/**
 * Server-side usage example with Bearer token authentication
 * For Node.js, Bun, Deno, or any secure server environment
 *
 * SECURITY NOTES:
 * ================
 * - Never expose your Bearer token to client-side code
 * - Store tokens in environment variables or secure vaults
 * - Use Bearer tokens only in server environments
 * - For client-side apps, use HMAC authentication instead
 */

async function main() {
  // Method 1: EASIEST - Create client from environment variables automatically
  // Expects: KV_API_URL and KV_API_TOKEN to be set in environment
  // const client = createServerClientFromEnv();
  // or with the static method:
  // const client = KVClient.fromEnv();

  // Method 2: Create with custom environment variable names
  // const client = createServerClientFromEnv({
  //   urlKey: 'MY_KV_URL',
  //   tokenKey: 'MY_KV_TOKEN',
  //   timeoutKey: 'MY_KV_TIMEOUT',
  // });

  // Method 3: Manual configuration (for this example, we'll use this)
  const client = createServerClient({
    baseUrl: process.env.KV_API_URL || 'https://your-worker.workers.dev',
    token: process.env.KV_API_TOKEN || '', // Never hardcode tokens!
    timeout: 30000, // Optional: 30 second timeout
  });

  try {
    // Basic CRUD operations
    console.log('Performing basic operations...');

    // Create/Update
    await client.put('config:app', {
      version: '1.0.0',
      environment: 'production',
      features: {
        darkMode: true,
        beta: false,
      },
    });

    // Read
    const config = await client.get('config:app');
    console.log('App config:', config.value);

    // Read with metadata
    const configWithMeta = await client.getWithMetadata('config:app');
    console.log('Config metadata:', configWithMeta.metadata);

    // Delete
    await client.delete('temp:old-data');

    // Batch operations for efficiency
    console.log('\nPerforming batch operations...');

    // Batch read multiple keys
    const userIds = ['user:1', 'user:2', 'user:3'];
    const users = await client.batchGet({
      keys: userIds,
      type: 'json',
    });
    console.log('Batch read users:', users);

    // Batch read with metadata
    const usersWithMeta = await client.batchGetWithMetadata({
      keys: userIds,
      type: 'json',
    });
    console.log('Users with metadata:', usersWithMeta);

    // Bulk write operations
    console.log('\nPerforming bulk writes...');

    const bulkWriteResult = await client.bulkWrite([
      {
        key: 'product:1',
        value: { name: 'Laptop', price: 999 },
        expirationTtl: 86400, // Expire after 24 hours
      },
      {
        key: 'product:2',
        value: { name: 'Mouse', price: 29 },
        metadata: { category: 'accessories' },
      },
      {
        key: 'product:3',
        value: { name: 'Keyboard', price: 79 },
      },
    ]);
    console.log('Bulk write result:', bulkWriteResult);

    // List keys with pagination
    console.log('\nListing keys...');

    let cursor: string | undefined;
    const allProducts: string[] = [];

    do {
      const listResult = await client.list({
        prefix: 'product:',
        limit: 10,
        cursor,
      });

      allProducts.push(...listResult.keys.map(k => k.name));
      cursor = listResult.cursor;

      if (!listResult.list_complete) {
        console.log(`Found ${listResult.keys.length} products, fetching more...`);
      }
    } while (cursor);

    console.log('All products:', allProducts);

    // Bulk delete
    const keysToDelete = ['temp:1', 'temp:2', 'temp:3'];
    const deleteResult = await client.bulkDelete(keysToDelete);
    console.log('Bulk delete result:', deleteResult);

    // Health check
    const health = await client.health();
    console.log('API health:', health);

  } catch (error) {
    console.error('Error:', error);
    // Common errors:
    // - 401: Invalid or missing token
    // - 429: Rate limit exceeded
    // - 500: Server error
  }
}

/**
 * Example: Express.js middleware
 */
export function createKVMiddleware() {
  const client = createServerClient({
    baseUrl: process.env.KV_API_URL!,
    token: process.env.KV_API_TOKEN!,
  });

  return (req: any, res: any, next: any) => {
    req.kvClient = client;
    next();
  };
}

/**
 * Example: Data migration utility
 */
export async function migrateData(sourcePrefix: string, targetPrefix: string) {
  const client = createServerClient({
    baseUrl: process.env.KV_API_URL!,
    token: process.env.KV_API_TOKEN!,
  });

  console.log(`Migrating data from ${sourcePrefix} to ${targetPrefix}...`);

  // List all source keys
  const sourceKeys = await client.list({ prefix: sourcePrefix });

  // Read all values
  const values = await client.batchGet({
    keys: sourceKeys.keys.map(k => k.name),
  });

  // Write to new keys
  const pairs = Object.entries(values).map(([key, value]) => ({
    key: key.replace(sourcePrefix, targetPrefix),
    value,
  }));

  if (pairs.length > 0) {
    const result = await client.bulkWrite(pairs);
    console.log(`Migration complete: ${result.successful} succeeded, ${result.failed} failed`);
  } else {
    console.log('No data to migrate');
  }
}

/**
 * Example: Scheduled cleanup job
 */
export async function cleanupExpiredSessions() {
  const client = createServerClient({
    baseUrl: process.env.KV_API_URL!,
    token: process.env.KV_API_TOKEN!,
  });

  const sessions = await client.list({ prefix: 'session:' });
  const now = Date.now();
  const expiredKeys: string[] = [];

  // Check each session
  for (const session of sessions.keys) {
    if (session.expiration && session.expiration * 1000 < now) {
      expiredKeys.push(session.name);
    }
  }

  if (expiredKeys.length > 0) {
    const result = await client.bulkDelete(expiredKeys);
    console.log(`Cleaned up ${result.successful} expired sessions`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
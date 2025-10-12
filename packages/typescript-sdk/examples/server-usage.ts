import { createServerClient } from '../src';

/**
 * Server-side usage example with Bearer token authentication
 * Use this approach in Node.js servers, serverless functions, etc.
 */
async function main() {
  // Create a server client with Bearer token authentication
  const client = createServerClient({
    baseUrl: 'https://your-worker.workers.dev',
    token: 'your-secret-key-here', // Keep this secure in environment variables
  });

  try {
    // Health check
    const health = await client.health();
    console.log('API Health:', health);

    // Write a value
    await client.put('user:123', {
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date().toISOString(),
    });
    console.log('User created successfully');

    // Read a value with type safety
    interface User {
      name: string;
      email: string;
      createdAt: string;
    }

    const user = await client.get<User>('user:123');
    console.log('Retrieved user:', user.value);

    // List users
    const userKeys = await client.list({ prefix: 'user:', limit: 10 });
    console.log('User keys:', userKeys.keys);

    // Batch operations
    const users = await client.batchGet({
      keys: ['user:123', 'user:456'],
      type: 'json',
    });
    console.log('Multiple users:', users);

    // Cleanup
    await client.delete('user:123');
    console.log('User deleted');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
import { KVClient } from '../src';

// Initialize the client - all types are automatically inferred!
const client = new KVClient({
  baseUrl: 'http://localhost:8787',
  authToken: 'your-secret-key-here',
});

async function main() {
  try {
    // Health check
    const health = await client.health();
    console.log('Health:', health);

    // Write a value - TypeScript infers the type automatically
    await client.put('user:123', { name: 'John Doe', email: 'john@example.com' });
    console.log('Value written successfully');

    // Read a value - specify the type to get autocomplete
    const value = await client.get<{ name: string; email: string }>('user:123');
    console.log('Value:', value.value.name); // TypeScript knows this is a string!

    // List keys
    const keys = await client.list({ prefix: 'user:', limit: 10 });
    console.log('Keys:', keys);

    // Batch get - no need to import BatchGetOptions type
    const values = await client.batchGet({
      keys: ['user:123', 'user:456'],
      type: 'json',
    });
    console.log('Batch values:', values);

    // Bulk write - no need to import BulkWritePair type
    const bulkResult = await client.bulkWrite([
      { key: 'user:456', value: { name: 'Jane Smith' } },
      { key: 'user:789', value: { name: 'Bob Johnson' } },
    ]);
    console.log('Bulk write result:', bulkResult);

    // Delete a key
    await client.delete('user:789');
    console.log('Key deleted');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();

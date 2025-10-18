'use server';

import { getKVClient } from '@/lib/kv';

const COUNTER_KEY = 'app:counter';
const ONE_HOUR_TTL = 3600; // 1 hour in seconds

export async function getCounter() {
  const client = getKVClient();
  try {
    const result = await client.get<number>(COUNTER_KEY);
    return result.value ?? 0;
  } catch (error) {
    // If key doesn't exist, return 0 and initialize it
    if (error instanceof Error && error.message.includes('Key not found')) {
      await client.put(COUNTER_KEY, 0, { expirationTtl: ONE_HOUR_TTL });
      return 0;
    }
    throw error;
  }
}

export async function incrementCounter() {
  const startTime = Date.now();
  const client = getKVClient();
  const currentValue = await getCounter();
  const newValue = currentValue + 1;
  await client.put(COUNTER_KEY, newValue, { expirationTtl: ONE_HOUR_TTL });
  const latency = Date.now() - startTime;
  return { value: newValue, latency };
}

export async function decrementCounter() {
  const startTime = Date.now();
  const client = getKVClient();
  const currentValue = await getCounter();
  const newValue = Math.max(0, currentValue - 1);
  await client.put(COUNTER_KEY, newValue, { expirationTtl: ONE_HOUR_TTL });
  const latency = Date.now() - startTime;
  return { value: newValue, latency };
}

export async function resetCounter() {
  const startTime = Date.now();
  const client = getKVClient();
  await client.put(COUNTER_KEY, 0, { expirationTtl: ONE_HOUR_TTL });
  const latency = Date.now() - startTime;
  return { value: 0, latency };
}

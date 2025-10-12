import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient, type KVClient } from '../src';

/**
 * React Hook: useKVClient
 * Creates a singleton KV client instance that automatically signs all requests with HMAC
 */
export function useKVClient() {
  const [client] = useState<KVClient>(() =>
    createBrowserClient({
      baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8787',
      secretKey: process.env.REACT_APP_AUTH_SECRET_KEY || '',
    })
  );

  return client;
}

/**
 * React Hook: useKVStore
 * High-level hook for common KV operations with loading states
 */
export function useKVStore<T = any>(key: string) {
  const client = useKVClient();
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const get = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.get<T>(key);
      setValue(result.value);
      return result.value;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, key]);

  const set = useCallback(async (newValue: T, ttl?: number) => {
    setLoading(true);
    setError(null);
    try {
      await client.put(key, newValue, ttl ? { expirationTtl: ttl } : {});
      setValue(newValue);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, key]);

  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await client.delete(key);
      setValue(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, key]);

  useEffect(() => {
    get().catch(() => {}); // Initial fetch
  }, [get]);

  return {
    value,
    loading,
    error,
    refetch: get,
    set,
    remove,
  };
}

/**
 * React Hook: useKVList
 * Hook for paginated key listing
 */
export function useKVList(prefix: string = '', limit: number = 100) {
  const client = useKVClient();
  const [keys, setKeys] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadKeys = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const result = await client.list({
        prefix,
        limit,
        cursor: reset ? undefined : cursor,
      });

      const keyNames = result.keys.map(k => k.name);
      setKeys(reset ? keyNames : [...keys, ...keyNames]);
      setCursor(result.cursor);
      setHasMore(!result.list_complete);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  }, [client, prefix, limit, cursor, keys]);

  const refresh = () => loadKeys(true);
  const loadMore = () => loadKeys(false);

  useEffect(() => {
    refresh();
  }, [prefix]); // Refresh when prefix changes

  return {
    keys,
    hasMore,
    loading,
    refresh,
    loadMore,
  };
}

/**
 * Example: User Preferences Component
 */
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export function UserPreferencesComponent({ userId }: { userId: string }) {
  const { value, loading, set } = useKVStore<UserPreferences>(`preferences:${userId}`);

  const updateTheme = async (theme: 'light' | 'dark') => {
    if (value) {
      await set({ ...value, theme });
    }
  };

  if (loading) return <div>Loading preferences...</div>;

  return (
    <div>
      <h3>User Preferences</h3>
      <button onClick={() => updateTheme('dark')}>
        Dark Mode: {value?.theme === 'dark' ? 'ON' : 'OFF'}
      </button>
      <p>Language: {value?.language || 'en'}</p>
      <p>Notifications: {value?.notifications ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}

/**
 * Example: Session Manager Component
 */
export function SessionManager() {
  const client = useKVClient();
  const { keys, refresh, loading } = useKVList('session:');
  const [creating, setCreating] = useState(false);

  const createSession = async () => {
    setCreating(true);
    try {
      const sessionId = `session:${Date.now()}`;
      await client.put(
        sessionId,
        {
          userId: 'current-user',
          loginTime: new Date().toISOString(),
        },
        {
          expirationTtl: 3600, // 1 hour
        }
      );
      refresh();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (sessionKey: string) => {
    try {
      await client.delete(sessionKey);
      refresh();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <div>
      <h3>Active Sessions ({keys.length})</h3>
      <button onClick={createSession} disabled={creating}>
        {creating ? 'Creating...' : 'New Session'}
      </button>
      <button onClick={refresh} disabled={loading}>
        Refresh
      </button>

      <ul>
        {keys.map(key => (
          <li key={key}>
            {key}
            <button onClick={() => deleteSession(key)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Data Sync Component
 */
export function DataSyncComponent() {
  const client = useKVClient();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const syncData = async () => {
    setSyncing(true);
    try {
      // Bulk write example
      const result = await client.bulkWrite([
        { key: 'sync:timestamp', value: new Date().toISOString() },
        { key: 'sync:data:1', value: { type: 'user', data: 'sample1' } },
        { key: 'sync:data:2', value: { type: 'settings', data: 'sample2' } },
        { key: 'sync:data:3', value: { type: 'cache', data: 'sample3' } },
      ]);

      if (result.success) {
        setLastSync(new Date());
        console.log(`Synced ${result.successful} items`);
      } else {
        console.error(`Failed to sync ${result.failed} items`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h3>Data Sync</h3>
      <button onClick={syncData} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {lastSync && (
        <p>Last sync: {lastSync.toLocaleTimeString()}</p>
      )}
    </div>
  );
}

/**
 * Example: App Component putting it all together
 */
export function App() {
  const [userId] = useState('user123');

  return (
    <div>
      <h1>Cloudflare KV React Example</h1>

      <UserPreferencesComponent userId={userId} />
      <hr />

      <SessionManager />
      <hr />

      <DataSyncComponent />
    </div>
  );
}
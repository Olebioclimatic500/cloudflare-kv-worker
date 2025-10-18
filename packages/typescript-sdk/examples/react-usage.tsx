/**
 * React usage examples for Cloudflare KV SDK
 *
 * This SDK is SERVER-SIDE ONLY. For React apps, you should:
 * 1. Use the SDK in your backend API (Node.js, Express, etc.)
 * 2. Create API endpoints that use the KV client
 * 3. Call those endpoints from your React components using fetch/axios
 *
 * This file demonstrates how to structure your React app to work with
 * the server-side KV SDK.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// Backend API Setup (Express/Node.js example)
// ============================================

/**
 * Example backend server setup
 * backend/server.ts
 */

/*
import express from 'express';
import { createServerClient } from '@cloudflare-kv/typescript-sdk';

const app = express();
app.use(express.json());

// Initialize KV client on the server
const kvClient = createServerClient({
  baseUrl: process.env.KV_API_URL!,
  token: process.env.KV_API_TOKEN!,
});

// API endpoints
app.get('/api/kv/:key', async (req, res) => {
  try {
    const result = await kvClient.get(req.params.key);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/kv/:key', async (req, res) => {
  try {
    await kvClient.put(req.params.key, req.body.value, req.body.options);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.delete('/api/kv/:key', async (req, res) => {
  try {
    await kvClient.delete(req.params.key);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

app.get('/api/kv-list', async (req, res) => {
  try {
    const result = await kvClient.list({
      prefix: req.query.prefix as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

app.listen(3001, () => {
  console.log('API server running on http://localhost:3001');
});
*/

// ============================================
// React Frontend Components
// ============================================

/**
 * React Hook: useKVStore
 * Fetches and manages KV data through your API
 */
export function useKVStore<T = any>(key: string) {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const get = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Call your backend API
      const response = await fetch(`/api/kv/${encodeURIComponent(key)}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setValue(result.value);
      return result.value;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key]);

  const set = useCallback(async (newValue: T, ttl?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/kv/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: newValue,
          options: ttl ? { expirationTtl: ttl } : {},
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setValue(newValue);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key]);

  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/kv/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setValue(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key]);

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
 * Hook for paginated key listing through your API
 */
export function useKVList(prefix: string = '', limit: number = 100) {
  const [keys, setKeys] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadKeys = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        prefix,
        limit: limit.toString(),
        ...(cursor && !reset ? { cursor } : {}),
      });

      const response = await fetch(`/api/kv-list?${params}`);
      if (!response.ok) throw new Error('Failed to load keys');

      const result = await response.json();
      const keyNames = result.keys.map((k: any) => k.name);

      setKeys(reset ? keyNames : [...keys, ...keyNames]);
      setCursor(result.cursor);
      setHasMore(!result.list_complete);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  }, [prefix, limit, cursor, keys]);

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
  const { keys, refresh, loading } = useKVList('session:');
  const [creating, setCreating] = useState(false);

  const createSession = async () => {
    setCreating(true);
    try {
      const sessionId = `session:${Date.now()}`;
      const response = await fetch(`/api/kv/${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: {
            userId: 'current-user',
            loginTime: new Date().toISOString(),
          },
          options: {
            expirationTtl: 3600, // 1 hour
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to create session');
      refresh();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (sessionKey: string) => {
    try {
      const response = await fetch(`/api/kv/${encodeURIComponent(sessionKey)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete session');
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
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const syncData = async () => {
    setSyncing(true);
    try {
      // Call your backend bulk write endpoint
      const response = await fetch('/api/kv-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairs: [
            { key: 'sync:timestamp', value: new Date().toISOString() },
            { key: 'sync:data:1', value: { type: 'user', data: 'sample1' } },
            { key: 'sync:data:2', value: { type: 'settings', data: 'sample2' } },
            { key: 'sync:data:3', value: { type: 'cache', data: 'sample3' } },
          ],
        }),
      });

      const result = await response.json();
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
 * Example: App Component
 */
export function App() {
  const [userId] = useState('user123');

  return (
    <div>
      <h1>Cloudflare KV React Example</h1>
      <p>All KV operations are handled through backend API routes</p>

      <UserPreferencesComponent userId={userId} />
      <hr />

      <SessionManager />
      <hr />

      <DataSyncComponent />
    </div>
  );
}

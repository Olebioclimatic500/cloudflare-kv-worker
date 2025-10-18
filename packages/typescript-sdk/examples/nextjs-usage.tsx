/**
 * Next.js usage examples for Cloudflare KV SDK
 * Server-side only - use in API routes, server components, and server-side data fetching
 */

import { createServerClient, createServerClientFromEnv } from '../src';

/**
 * Get KV client for server-side use
 */
export function getKVClient() {
  return createServerClient({
    baseUrl: process.env.KV_API_URL!,
    token: process.env.KV_API_TOKEN!,
  });
}

/**
 * Alternative: Use environment variables
 */
export function getKVClientFromEnv() {
  return createServerClientFromEnv();
}

// ============================================
// App Router Examples (app/ directory)
// ============================================

/**
 * Server Component Example
 * app/dashboard/page.tsx
 */
export async function DashboardPage() {
  const client = getKVClient();

  // Fetch data on server
  const userData = await client.get('user:dashboard');
  const sessions = await client.list({ prefix: 'session:' });

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(userData, null, 2)}</pre>
      <p>Active sessions: {sessions.keys.length}</p>
    </div>
  );
}

/**
 * Client Component Example
 * app/preferences/preferences-form.tsx
 *
 * Client components must call an API route to interact with KV
 */
'use client';

import { useState } from 'react';

export function PreferencesForm() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);

  const savePreferences = async () => {
    setSaving(true);
    try {
      // Call your API route instead of using the KV client directly
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      alert('Preferences saved!');
    } catch (error) {
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); savePreferences(); }}>
      <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  );
}

/**
 * Route Handler Example
 * app/api/kv/[key]/route.ts
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const client = getKVClient();

  try {
    const result = await client.get(params.key);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const client = getKVClient();
  const body = await request.json();

  try {
    await client.put(params.key, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    );
  }
}

// ============================================
// Pages Router Examples (pages/ directory)
// ============================================

/**
 * Server-side Props Example
 * pages/profile.tsx
 */
import { GetServerSideProps } from 'next';

interface ProfileProps {
  userData: any;
  sessionCount: number;
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = async (context) => {
  const client = getKVClient();

  try {
    const userData = await client.get(`user:${context.query.id || 'default'}`);
    const sessions = await client.list({ prefix: 'session:' });

    return {
      props: {
        userData: userData.value,
        sessionCount: sessions.keys.length,
      },
    };
  } catch (error) {
    return {
      props: {
        userData: null,
        sessionCount: 0,
      },
    };
  }
};

export function ProfilePage({ userData, sessionCount }: ProfileProps) {
  const [updating, setUpdating] = useState(false);

  const updateProfile = async () => {
    setUpdating(true);
    try {
      // Call API route to update profile
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          lastUpdated: new Date().toISOString(),
        }),
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h1>Profile</h1>
      <p>Sessions: {sessionCount}</p>
      <button onClick={updateProfile} disabled={updating}>
        Update Profile
      </button>
    </div>
  );
}

/**
 * API Route Example
 * pages/api/sync.ts
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = getKVClient();

  if (req.method === 'POST') {
    try {
      const result = await client.bulkWrite(req.body.pairs);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Sync failed' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================
// Environment Variables Setup
// ============================================

/**
 * .env.local (for development)
 *
 * # Server-side only - never expose these to the browser
 * KV_API_URL=http://localhost:8787
 * KV_API_TOKEN=your-secret-bearer-token
 */

// ============================================
// TypeScript Types for Better DX
// ============================================

export interface UserData {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
}

export interface SessionData {
  userId: string;
  loginTime: string;
  expiresAt: string;
}

/**
 * Typed KV operations
 */
import type { KVClient } from '../src';

export class TypedKVClient {
  constructor(private client: KVClient) {}

  async getUser(userId: string): Promise<UserData | null> {
    const result = await this.client.get<UserData>(`user:${userId}`);
    return result.value;
  }

  async saveUser(userId: string, data: UserData): Promise<void> {
    await this.client.put(`user:${userId}`, data);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const result = await this.client.get<SessionData>(`session:${sessionId}`);
    return result.value;
  }

  async createSession(sessionId: string, data: SessionData): Promise<void> {
    await this.client.put(`session:${sessionId}`, data, {
      expirationTtl: 3600, // 1 hour
    });
  }
}
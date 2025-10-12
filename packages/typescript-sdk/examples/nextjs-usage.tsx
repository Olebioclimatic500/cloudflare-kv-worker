/**
 * Next.js usage examples for Cloudflare KV SDK
 * Supports both App Router and Pages Router
 */

import { createBrowserClient, createServerClient, type KVClient } from '../src';

/**
 * Client-side hook for Next.js
 * Works in both app/ and pages/ directories
 */
export function useKVClient() {
  // For client-side, use HMAC authentication
  const client = createBrowserClient({
    baseUrl: process.env.NEXT_PUBLIC_KV_API_URL!,
    secretKey: process.env.NEXT_PUBLIC_AUTH_SECRET_KEY!,
  });

  return client;
}

/**
 * Server-side client for Next.js
 * Use in API routes, server components, or getServerSideProps
 */
export function getServerKVClient() {
  // For server-side, use Bearer token (more secure)
  return createServerClient({
    baseUrl: process.env.KV_API_URL!,
    token: process.env.KV_API_TOKEN!, // Keep this secret, never expose to client
  });
}

// ============================================
// App Router Examples (app/ directory)
// ============================================

/**
 * Server Component Example
 * app/dashboard/page.tsx
 */
export async function DashboardPage() {
  const client = getServerKVClient();

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
 */
'use client';

import { useState } from 'react';

export function PreferencesForm() {
  const client = useKVClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);

  const savePreferences = async () => {
    setSaving(true);
    try {
      await client.put('preferences:user', {
        theme,
        updatedAt: new Date().toISOString(),
      });
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
  const client = getServerKVClient();

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
  const client = getServerKVClient();
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
  const client = getServerKVClient();

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
  const client = useKVClient();
  const [updating, setUpdating] = useState(false);

  const updateProfile = async () => {
    setUpdating(true);
    try {
      await client.put('user:profile', {
        ...userData,
        lastUpdated: new Date().toISOString(),
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
  const client = getServerKVClient();

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
 * # Server-side only (never exposed to browser)
 * KV_API_URL=http://localhost:8787
 * KV_API_TOKEN=your-secret-bearer-token
 *
 * # Client-side (exposed to browser, use NEXT_PUBLIC_ prefix)
 * NEXT_PUBLIC_KV_API_URL=http://localhost:8787
 * NEXT_PUBLIC_AUTH_SECRET_KEY=your-auth-secret-key
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
#!/usr/bin/env node

/**
 * HMAC Authentication Example for Cloudflare KV Worker API
 *
 * This script demonstrates how to authenticate with the API using HMAC-SHA256 signatures.
 *
 * Usage:
 *   node examples/hmac-auth-example.js
 */

import crypto from 'crypto';

// Configuration
const API_BASE_URL = 'http://localhost:8787/api/v1';
const SECRET_KEY = 'dabcca8727e862f48c452a9215a5978d'; // Replace with your AUTH_SECRET_KEY

/**
 * Generate HMAC-SHA256 signature for a request
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API path (e.g., '/api/v1/kv/test')
 * @param {string} timestamp - Unix timestamp in milliseconds
 * @param {string} body - Request body (empty string for GET/DELETE)
 * @param {string} secretKey - Your secret key
 * @returns {string} Hex-encoded HMAC signature
 */
function generateHMACSignature(method, path, timestamp, body, secretKey) {
  const message = `${method}${path}${timestamp}${body}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
  return signature;
}

/**
 * Make authenticated API request using HMAC
 */
async function makeAuthenticatedRequest(method, path, bodyData = null) {
  const timestamp = Date.now().toString();
  const body = bodyData ? JSON.stringify(bodyData) : '';
  const fullPath = path;

  const signature = generateHMACSignature(method, fullPath, timestamp, body, SECRET_KEY);

  const headers = {
    'Content-Type': 'application/json',
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };

  const options = {
    method,
    headers,
  };

  if (bodyData) {
    options.body = body;
  }

  console.log(`\n📤 ${method} ${API_BASE_URL}${path}`);
  console.log('Headers:', {
    'X-Signature': signature.substring(0, 20) + '...',
    'X-Timestamp': timestamp,
  });
  if (bodyData) {
    console.log('Body:', bodyData);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();

  console.log(`📥 Status: ${response.status}`);
  console.log('Response:', data);

  return { response, data };
}

/**
 * Make authenticated API request using Bearer token (simpler method)
 */
async function makeAuthenticatedRequestBearer(method, path, bodyData = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SECRET_KEY}`,
  };

  const options = {
    method,
    headers,
  };

  if (bodyData) {
    options.body = JSON.stringify(bodyData);
  }

  console.log(`\n📤 ${method} ${API_BASE_URL}${path} (Bearer Auth)`);
  console.log('Headers:', { 'Authorization': 'Bearer ***' });
  if (bodyData) {
    console.log('Body:', bodyData);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();

  console.log(`📥 Status: ${response.status}`);
  console.log('Response:', data);

  return { response, data };
}

// Example usage
async function main() {
  console.log('🔐 Cloudflare KV Worker API - HMAC Authentication Examples\n');
  console.log('=' .repeat(60));

  try {
    // Example 1: Write a key-value pair using HMAC
    console.log('\n\n✅ Example 1: POST /kv (HMAC Auth)');
    await makeAuthenticatedRequest('POST', '/kv', {
      key: 'user:123',
      value: { name: 'John Doe', email: 'john@example.com' },
      metadata: { createdBy: 'hmac-example' },
    });

    // Example 2: Read a value using HMAC
    console.log('\n\n✅ Example 2: GET /kv/:key (HMAC Auth)');
    await makeAuthenticatedRequest('GET', '/kv/user:123?type=json');

    // Example 3: Write using Bearer token (simpler)
    console.log('\n\n✅ Example 3: POST /kv (Bearer Token Auth)');
    await makeAuthenticatedRequestBearer('POST', '/kv', {
      key: 'session:abc',
      value: 'session-data',
      expirationTtl: 3600,
    });

    // Example 4: List keys using Bearer token
    console.log('\n\n✅ Example 4: GET /kv (Bearer Token Auth)');
    await makeAuthenticatedRequestBearer('GET', '/kv?prefix=user:&limit=10');

    // Example 5: Delete a key using HMAC
    console.log('\n\n✅ Example 5: DELETE /kv/:key (HMAC Auth)');
    await makeAuthenticatedRequest('DELETE', '/kv/session:abc');

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('\n💡 Tip: Use Bearer token for simplicity, HMAC for enhanced security.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run examples
main();

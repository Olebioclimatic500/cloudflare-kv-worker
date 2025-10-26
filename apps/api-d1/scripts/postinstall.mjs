#!/usr/bin/env node

/**
 * Post-install script to ensure D1 database schema is up to date
 * 
 * ⚠️ LOCAL DEVELOPMENT ONLY - NOT FOR CLOUDFLARE WORKERS
 * This runs after npm/bun install on your local machine
 * This script is NOT bundled or deployed to Cloudflare Workers
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only run if in the correct directory
if (!existsSync(join(__dirname, '..', 'wrangler.jsonc'))) {
  console.log('⚠️  Skipping D1 migration: not in api-d1 directory');
  process.exit(0);
}

console.log('🔍 Checking D1 database schema...');

// Check if table exists
const checkTable = spawn('bunx', [
  'wrangler',
  'd1',
  'execute',
  'MY_DB',
  '--local',
  '--command=SELECT name FROM sqlite_master WHERE type="table" AND name="kv_store";'
], {
  cwd: join(__dirname, '..'),
  stdio: 'pipe'
});

let output = '';
checkTable.stdout.on('data', (data) => {
  output += data.toString();
});

checkTable.on('close', (code) => {
  if (code !== 0) {
    console.log('⚠️  Could not check database schema. Run migration manually if needed:');
    console.log('   bun run migrate');
    process.exit(0);
  }

  // Check if table exists in output
  const hasTable = output.includes('"name": "kv_store"') || output.includes('kv_store');

  if (hasTable) {
    console.log('✅ Database schema is up to date');
    process.exit(0);
  }

  console.log('🔄 Running database migration...');

  // Run migration
  const migrate = spawn('bunx', [
    'wrangler',
    'd1',
    'execute',
    'MY_DB',
    '--local',
    '--file=./migrations/001_create_kv_table.sql'
  ], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });

  migrate.on('close', (migrateCode) => {
    if (migrateCode === 0) {
      console.log('✅ Database migration completed successfully');
    } else {
      console.log('⚠️  Migration failed. You may need to run it manually:');
      console.log('   bun run migrate');
    }
    process.exit(0);
  });
});


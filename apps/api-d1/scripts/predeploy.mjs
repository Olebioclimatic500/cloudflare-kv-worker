#!/usr/bin/env node

/**
 * Pre-deploy script to ensure remote D1 database schema is up to date
 * 
 * ⚠️ LOCAL DEVELOPMENT ONLY - NOT FOR CLOUDFLARE WORKERS
 * This runs on your local machine before deployment
 * This script is NOT bundled or deployed to Cloudflare Workers
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Pre-deployment check: Verifying remote D1 database schema...\n');

  // Check if table exists on remote
  console.log('🔍 Checking remote database...');
  
  const checkTable = spawn('bunx', [
    'wrangler',
    'd1',
    'execute',
    'MY_DB',
    '--remote',
    '--command=SELECT name FROM sqlite_master WHERE type="table" AND name="kv_store";'
  ], {
    cwd: join(__dirname, '..'),
    stdio: 'pipe'
  });

  let output = '';
  let errorOutput = '';
  
  checkTable.stdout.on('data', (data) => {
    output += data.toString();
  });

  checkTable.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  checkTable.on('close', async (code) => {
    // Check if authentication failed
    if (errorOutput.includes('CLOUDFLARE_API_TOKEN') || errorOutput.includes('not logged in')) {
      console.log('❌ Not authenticated with Cloudflare.');
      console.log('   Run: bunx wrangler login');
      rl.close();
      process.exit(1);
      return;
    }

    if (code !== 0 && !errorOutput.includes('no such table')) {
      console.log('⚠️  Could not check remote database. Error:');
      console.log(errorOutput);
      const proceed = await question('\nDo you want to continue with deployment anyway? (y/N) ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Deployment cancelled.');
        rl.close();
        process.exit(1);
        return;
      }
      rl.close();
      process.exit(0);
      return;
    }

    // Check if table exists
    const hasTable = output.includes('"name": "kv_store"') || output.includes('kv_store');

    if (hasTable) {
      console.log('✅ Remote database schema is up to date\n');
      console.log('Proceeding with deployment...\n');
      rl.close();
      process.exit(0);
      return;
    }

    // Table doesn't exist - ask to run migration
    console.log('⚠️  Database table "kv_store" not found on remote database!\n');
    const runMigration = await question('Do you want to run the migration now? (Y/n) ');
    
    if (runMigration.toLowerCase() === 'n') {
      console.log('\n❌ Cannot deploy without database schema.');
      console.log('   Run manually: bun run migrate --remote');
      rl.close();
      process.exit(1);
      return;
    }

    console.log('\n🔄 Running database migration on remote...\n');

    const migrate = spawn('bunx', [
      'wrangler',
      'd1',
      'execute',
      'MY_DB',
      '--remote',
      '--file=./migrations/001_create_kv_table.sql'
    ], {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });

    migrate.on('close', (migrateCode) => {
      if (migrateCode === 0) {
        console.log('\n✅ Remote database migration completed successfully\n');
        console.log('Proceeding with deployment...\n');
        rl.close();
        process.exit(0);
      } else {
        console.log('\n❌ Migration failed. Cannot proceed with deployment.');
        console.log('   Fix the issue and try again.');
        rl.close();
        process.exit(1);
      }
    });
  });
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});


# Automated Database Migration System

This project includes an automated migration system that ensures your D1 database schema is always up to date.

## How It Works

### 1. Postinstall Hook (Local Development)

**Triggers**: Automatically runs after `bun install` or `npm install`

**What it does**:
- Checks if the `kv_store` table exists in your local D1 database
- If the table doesn't exist, automatically runs the migration
- If the table exists, confirms schema is up to date
- Completely automatic - no manual intervention needed

**Script**: `scripts/postinstall.mjs`

```bash
# This happens automatically:
bun install
# 🔍 Checking D1 database schema...
# 🔄 Running database migration...
# ✅ Database migration completed successfully
```

### 2. Predeploy Hook (Production Deployment)

**Triggers**: Runs before deployment when you use `bun run deploy`

**What it does**:
- Checks if the remote (production) database has the required schema
- If schema is missing, prompts you to run the migration
- Waits for migration completion before proceeding with deployment
- Prevents deploying code that requires a schema that doesn't exist

**Script**: `scripts/predeploy.mjs`

```bash
bun run deploy
# 🚀 Pre-deployment check: Verifying remote D1 database schema...
# 🔍 Checking remote database...
# ⚠️  Database table "kv_store" not found on remote database!
# Do you want to run the migration now? (Y/n)
```

### 3. Manual Migration Scripts

You can still run migrations manually when needed:

```bash
# Local database
bun run migrate

# Remote/production database
bun run migrate:remote

# Or use the shell script directly
./scripts/migrate-d1.sh          # local
./scripts/migrate-d1.sh --remote # remote
```

## Migration Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `postinstall.mjs` | Auto-migrate local DB | Runs automatically on install |
| `predeploy.mjs` | Check remote DB before deploy | Runs automatically on deploy |
| `migrate-d1.sh` | Manual migration runner | When you need manual control |

## Benefits

1. **Zero Setup Friction**: New developers just run `bun install` and they're ready to go
2. **Prevents Deployment Errors**: Won't deploy if database schema is missing
3. **Idempotent**: Safe to run multiple times - checks before applying
4. **Clear Feedback**: Scripts provide clear messages about what's happening
5. **Manual Override**: Can skip checks with `deploy:force` if needed

## CI/CD Integration

For continuous deployment pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: bun install # Automatically migrates local DB for tests

- name: Run tests
  run: bun test

- name: Deploy to production
  run: bun run deploy # Automatically checks and migrates remote DB
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Skipping Automated Checks

If you need to deploy without the migration check:

```bash
bun run deploy:force
```

⚠️ **Warning**: Only use this if you're certain the database schema is correct.

## Troubleshooting

### Postinstall fails
```bash
# Manually run the migration
bun run migrate
```

### Predeploy fails
```bash
# Check authentication
bunx wrangler login

# Manually migrate remote database
bun run migrate:remote

# Then deploy
bun run deploy
```

### Need to reset local database
```bash
# Delete local database
rm -rf .wrangler/state/v3/d1

# Reinstall to recreate
bun install
```

## Adding New Migrations

When you need to add a new migration:

```bash
# Create a new migration file
bun run migrate:create

# Edit the new file in migrations/
# Update the scripts to run the new migration
# Commit and deploy
```

## Security Note

The automated scripts only run on **local** databases by default. For remote/production databases, they always require confirmation or authentication, preventing accidental changes to production data.

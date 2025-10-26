-- Migration: Create KV Store Table
-- This table mimics Cloudflare KV functionality in D1 (SQLite)

CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    metadata TEXT, -- JSON stored as text
    expiration INTEGER, -- Unix timestamp
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_expiration ON kv_store(expiration) WHERE expiration IS NOT NULL;

-- Index for prefix-based queries (list operations)
CREATE INDEX IF NOT EXISTS idx_key_prefix ON kv_store(key);

-- Trigger to update updated_at timestamp on updates
CREATE TRIGGER IF NOT EXISTS update_timestamp 
AFTER UPDATE ON kv_store
FOR EACH ROW
BEGIN
    UPDATE kv_store SET updated_at = unixepoch() WHERE key = NEW.key;
END;

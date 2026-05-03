-- ============================================================
-- Migration 002: Apple Sync tracking columns
-- (Already in schema 001 – this migration is for existing DBs
--  that ran 001 before the apple_id columns were added)
-- ============================================================

-- These columns are already in 001_core_schema.sql.
-- Only run this if you applied 001 without them.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'entries' AND column_name = 'apple_id'
  ) THEN
    ALTER TABLE entries ADD COLUMN apple_id   text;
    ALTER TABLE entries ADD COLUMN synced_at  timestamptz;
  END IF;
END
$$;

-- Index for quick lookup of unsynced entries
CREATE INDEX IF NOT EXISTS idx_entries_unsynced
  ON entries (user_id, type)
  WHERE apple_id IS NULL AND type != 'note' AND status != 'cancelled';

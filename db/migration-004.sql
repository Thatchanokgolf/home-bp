-- ============================================================
-- Migration 004 — run once on the EXISTING Neon database.
-- Adds LINE account linking (LINE user id -> app account).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_line ON users (line_user_id);

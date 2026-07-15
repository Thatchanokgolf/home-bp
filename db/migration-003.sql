-- ============================================================
-- Migration 003 — run once on the EXISTING Neon database.
-- Adds the QR-login code hash. New registrations get a random
-- 20-letter code; only its bcrypt hash is stored here.
-- (Existing accounts have NULL until they re-register / are backfilled.)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS hash_password TEXT;

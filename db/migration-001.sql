-- ============================================================
-- Migration 001 — run once on the EXISTING Neon database.
-- Adds username / first_name / last_name and uniqueness rules.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS username   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- New default for the "shared to doctor" flag is now TRUE.
ALTER TABLE users ALTER COLUMN shared SET DEFAULT true;

-- Uniqueness (multiple NULLs are allowed, so optional fields remain optional).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email       ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_hospital_id ON users (hospital_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username    ON users (username);

-- OPTIONAL: promote an account to 'master' so it can open the Master page.
-- Replace the e-mail with the account you want to make master.
-- UPDATE users SET role = 'master' WHERE email = 'admin@home-bp.local';

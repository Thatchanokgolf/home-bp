-- ============================================================
-- Migration 002 — run once on the EXISTING Neon database.
-- - IDs start at 1000
-- - E-mail and username uniqueness become case-insensitive
--   (assumes existing e-mails/usernames have no case-variant duplicates)
-- ============================================================

-- New accounts get IDs from 1000 up (existing max id is well below 1000).
ALTER SEQUENCE users_id_seq RESTART WITH 1000;

-- Case-insensitive uniqueness on e-mail and username.
DROP INDEX IF EXISTS uq_users_email;
CREATE UNIQUE INDEX uq_users_email ON users (LOWER(email));

DROP INDEX IF EXISTS uq_users_username;
CREATE UNIQUE INDEX uq_users_username ON users (LOWER(username));

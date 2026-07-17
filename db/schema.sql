-- ============================================================
-- Home BP — database schema (Neon / PostgreSQL)
-- ============================================================

-- 1. User Database
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,      -- auto-generated running number = the "ID"
  email        TEXT,                    -- mandatory at registration; unique
  hospital     TEXT,                    -- optional (Siriraj / Srinagarind)
  hospital_id  TEXT,                    -- optional (HN); unique; >=4 chars
  username     TEXT,                    -- optional; unique; has a letter, no '@'
  first_name   TEXT,                    -- optional (Thai)
  last_name    TEXT,                    -- optional (Thai)
  role          TEXT    NOT NULL DEFAULT 'user',   -- 'user' | 'admin' | 'master'
  password      TEXT    NOT NULL,        -- bcrypt hash
  shared        BOOLEAN NOT NULL DEFAULT true,      -- shared to doctor yes/no
  hash_password TEXT,                    -- bcrypt hash of the 20-letter QR login code
  line_user_id  TEXT                     -- linked LINE user id (for LINE login)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_line ON users (line_user_id);
-- Uniqueness (Postgres allows multiple NULLs, so optional fields stay optional).
-- E-mail and username are case-insensitive (indexed on LOWER()).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email       ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_hospital_id ON users (hospital_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username    ON users (LOWER(username));

-- IDs start at 1000.
ALTER SEQUENCE users_id_seq RESTART WITH 1000;

-- 2. BP Database (every individual reading)
CREATE TABLE IF NOT EXISTS bp_readings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  time       TIME    NOT NULL,
  ampm       TEXT    NOT NULL,          -- 'AM' | 'PM'
  systolic   INTEGER NOT NULL,
  diastolic  INTEGER NOT NULL,
  heart_rate INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bp_user_date ON bp_readings (user_id, date);

-- 3. Average BP Database (one row per user / date / AM-PM)
CREATE TABLE IF NOT EXISTS avg_bp (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  ampm       TEXT    NOT NULL,          -- 'AM' | 'PM'
  systolic   NUMERIC(6,2) NOT NULL,
  diastolic  NUMERIC(6,2) NOT NULL,
  heart_rate NUMERIC(6,2) NOT NULL,
  UNIQUE (user_id, date, ampm)
);
CREATE INDEX IF NOT EXISTS idx_avg_user_date ON avg_bp (user_id, date);

-- ============================================================
-- Home BP — database schema (Neon / PostgreSQL)
-- ============================================================

-- 1. User Database
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,      -- auto-generated running number = the "ID"
  email        TEXT,                    -- optional
  hospital     TEXT,                    -- optional (Siriraj / Srinagarind)
  hospital_id  TEXT,                    -- optional (HN)
  role         TEXT    NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  password     TEXT    NOT NULL,        -- bcrypt hash
  shared       BOOLEAN NOT NULL DEFAULT false      -- shared to doctor yes/no
);

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

-- Fix session table to ensure proper primary key constraint
-- This fixes the "ON CONFLICT" error by ensuring the table has the correct constraint
-- 
-- OPTION 1: Drop and recreate (will lose all sessions, but fixes the issue)
-- Uncomment below if you want to drop and recreate:
--
-- DROP TABLE IF EXISTS "session" CASCADE;
-- CREATE TABLE "session" (
--   "sid" varchar NOT NULL COLLATE "default",
--   "sess" json NOT NULL,
--   "expire" timestamp(6) NOT NULL,
--   CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
-- ) WITH (OIDS=FALSE);
-- CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- OPTION 2: Fix existing table (preserves sessions)
-- Check if table exists, create if missing
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

-- Drop and recreate primary key constraint to ensure it's correct
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");


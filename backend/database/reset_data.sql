-- ============================================================
-- RESET ALL DATA — Billing System
-- Clears all rows but keeps tables and structure intact.
-- Auto-increments (IDs) are also reset to 1.
-- ============================================================

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = replica;

TRUNCATE TABLE payments    RESTART IDENTITY CASCADE;
TRUNCATE TABLE bill_items  RESTART IDENTITY CASCADE;
TRUNCATE TABLE bills       RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders      RESTART IDENTITY CASCADE;
TRUNCATE TABLE customers   RESTART IDENTITY CASCADE;
TRUNCATE TABLE users       RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ✅ All data cleared. Tables and schema are intact.
-- Run setup_users.js again to recreate the admin account.

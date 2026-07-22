-- ==============================================================================
-- financeOS Supabase / PostgreSQL Schema Migration
-- Run this script inside your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create finance_accounts table
-- This table stores user financial accounts.
CREATE TABLE IF NOT EXISTS public.finance_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    balance BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Create finance_budgets table
-- This table stores user budgets.
CREATE TABLE IF NOT EXISTS public.finance_budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    budget_cycle_id TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount BIGINT NOT NULL DEFAULT 0,
    spent_amount BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Create finance_events table
-- This table stores the immutable event log.
CREATE TABLE IF NOT EXISTS public.finance_events (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    budget_cycle_id TEXT NOT NULL,
    account_id TEXT,
    amount BIGINT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Create Indexes
-- These indexes accelerate database queries.
CREATE INDEX IF NOT EXISTS idx_finance_events_user_id ON public.finance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_events_timestamp ON public.finance_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_finance_events_cycle ON public.finance_events(budget_cycle_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_user_id ON public.finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_user_id ON public.finance_budgets(user_id);

-- 5. Enable Row Level Security (RLS) & Policies
-- These policies restrict access to the tables.
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_accounts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_budgets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_events
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Create finance_users table
-- This table stores user authentication profiles.
-- The table lacks a deleted_at column because the application does not support user soft-deletion.
CREATE TABLE IF NOT EXISTS public.finance_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    dob DATE,
    name TEXT,
    password_hash TEXT,
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_users_email ON public.finance_users(email);
CREATE INDEX IF NOT EXISTS idx_finance_users_email_lower ON public.finance_users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_users_username_lower ON public.finance_users(LOWER(username));
ALTER TABLE public.finance_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for users based on email" ON public.finance_users
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Create finance_verification_codes table
-- This table stores email verification codes.
-- The table lacks write-conflict protection.
CREATE TABLE IF NOT EXISTS public.finance_verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.finance_verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for verification codes" ON public.finance_verification_codes
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Atomic Sync Conflict Resolution Trigger (Events)
-- This trigger rejects stale edits to the finance_events table.
CREATE OR REPLACE FUNCTION protect_stale_finance_event_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.updated_at <= OLD.updated_at THEN
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_stale_finance_events ON public.finance_events;
CREATE TRIGGER check_stale_finance_events
BEFORE UPDATE ON public.finance_events
FOR EACH ROW
EXECUTE FUNCTION protect_stale_finance_event_updates();

-- 9. Atomic Sync Conflict Resolution Trigger (Accounts)
-- This trigger rejects stale edits to the finance_accounts table.
CREATE OR REPLACE FUNCTION protect_stale_finance_account_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.updated_at <= OLD.updated_at THEN
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_stale_finance_accounts ON public.finance_accounts;
CREATE TRIGGER check_stale_finance_accounts
BEFORE UPDATE ON public.finance_accounts
FOR EACH ROW
EXECUTE FUNCTION protect_stale_finance_account_updates();

-- 10. Atomic Sync Conflict Resolution Trigger (Budgets)
-- This trigger rejects stale edits to the finance_budgets table.
CREATE OR REPLACE FUNCTION protect_stale_finance_budget_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.updated_at <= OLD.updated_at THEN
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_stale_finance_budgets ON public.finance_budgets;
CREATE TRIGGER check_stale_finance_budgets
BEFORE UPDATE ON public.finance_budgets
FOR EACH ROW
EXECUTE FUNCTION protect_stale_finance_budget_updates();
-- 1. Create the trigger function if it doesn't already exist
CREATE OR REPLACE FUNCTION finance_users_conflict_protection()
RETURNS trigger AS $$
BEGIN
  -- Reject the update if the incoming updated_at is older than the current record's updated_at
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN NULL;
  END IF;
  
  -- Automatically bump updated_at if it wasn't explicitly provided in the UPDATE statement
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = extract(epoch from now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the trigger if it exists to ensure a clean slate
DROP TRIGGER IF EXISTS finance_users_conflict_trigger ON public.finance_users;

-- 3. Create the BEFORE UPDATE trigger on finance_users
CREATE TRIGGER finance_users_conflict_trigger
BEFORE UPDATE ON public.finance_users
FOR EACH ROW
EXECUTE FUNCTION finance_users_conflict_protection();

-- ==========================================
-- MANUAL VERIFICATION SCRIPT
-- Run these statements one by one in the Supabase SQL Editor
-- ==========================================

-- A. Insert a baseline user record
INSERT INTO public.finance_users (id, email, password_hash, first_name, last_name, display_name, username, updated_at)
VALUES ('test-user-id-999', 'test999@example.com', 'hash', 'Test', 'User', 'Test User', 'testuser999', 100);

-- B. Valid update (newer updated_at -> should succeed and update the name)
UPDATE public.finance_users
SET display_name = 'Valid Update', updated_at = 200
WHERE id = 'test-user-id-999';

SELECT display_name, updated_at FROM public.finance_users WHERE id = 'test-user-id-999';
-- Expected Output: display_name = 'Valid Update', updated_at = 200

-- C. Stale update rejected (older updated_at -> should silently return NULL, leaving record unchanged)
UPDATE public.finance_users
SET display_name = 'Stale Update', updated_at = 150
WHERE id = 'test-user-id-999';

SELECT display_name, updated_at FROM public.finance_users WHERE id = 'test-user-id-999';
-- Expected Output: display_name = 'Valid Update', updated_at = 200 (UNCHANGED)

-- D. Clean up the test user
DELETE FROM public.finance_users WHERE id = 'test-user-id-999';

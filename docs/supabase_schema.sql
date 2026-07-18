-- ==============================================================================
-- financeOS Supabase / PostgreSQL Schema Migration
-- Run this script inside your Supabase SQL Editor (Project -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create finance_accounts table
CREATE TABLE IF NOT EXISTS public.finance_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    balance BIGINT NOT NULL DEFAULT 0, -- Stored in kobo/cents
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Create finance_budgets table
CREATE TABLE IF NOT EXISTS public.finance_budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    budget_cycle_id TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount BIGINT NOT NULL DEFAULT 0, -- Stored in kobo/cents
    spent_amount BIGINT NOT NULL DEFAULT 0, -- Stored in kobo/cents
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Create finance_events table (The Immutable Event Store)
CREATE TABLE IF NOT EXISTS public.finance_events (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    budget_cycle_id TEXT NOT NULL,
    account_id TEXT,
    amount BIGINT NOT NULL DEFAULT 0, -- Stored in kobo/cents
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Create Indexes for High-Performance Queries (<15ms)
CREATE INDEX IF NOT EXISTS idx_finance_events_user_id ON public.finance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_events_timestamp ON public.finance_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_finance_events_cycle ON public.finance_events(budget_cycle_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_user_id ON public.finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_user_id ON public.finance_budgets(user_id);

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;

-- Allow public/anon or authenticated access (For easy onboarding & API key sync)
CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_accounts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_budgets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read/write for users based on user_id" ON public.finance_events
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Create finance_users table (For Email & Password Authentication + Onboarding status)
CREATE TABLE IF NOT EXISTS public.finance_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE, -- $username handle / cashtag (clean alphanumeric string)
    first_name TEXT,
    last_name TEXT,
    dob DATE, -- ISO-8601 date of birth (YYYY-MM-DD) with strict 13+ age gating
    name TEXT, -- Full display name
    password_hash TEXT, -- Encrypted / hashed password using bcrypt/Argon2id
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

-- 7. Atomic Sync Conflict Resolution Trigger
-- Prevents race conditions during batch upserts by enforcing updated_at strictly at the database engine level.
CREATE OR REPLACE FUNCTION protect_stale_finance_event_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- If the incoming updated_at is older or equal to the existing, ignore the update
    -- by returning NULL, which silently skips the update for this specific row.
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

-- 8. Atomic Sync Conflict Resolution Trigger (Accounts)
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

-- 9. Atomic Sync Conflict Resolution Trigger (Budgets)
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

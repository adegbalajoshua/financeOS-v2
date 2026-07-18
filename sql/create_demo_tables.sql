-- ==============================================================================
-- FinanceOS Dedicated Demo Tables Migration
-- Run this SQL in your Supabase SQL Editor to create the read-only demo tables.
-- ==============================================================================

-- 1. Create Dedicated Demo Events Table
CREATE TABLE IF NOT EXISTS finance_demo_events (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  budget_cycle_id TEXT DEFAULT 'Jul-26',
  account_id TEXT,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  category TEXT DEFAULT 'General',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Dedicated Demo Accounts Table
CREATE TABLE IF NOT EXISTS finance_demo_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'checking',
  currency TEXT DEFAULT 'NGN',
  balance DOUBLE PRECISION DEFAULT 0,
  opening_balance DOUBLE PRECISION DEFAULT 0,
  institution TEXT,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Dedicated Demo Budgets Table
CREATE TABLE IF NOT EXISTS finance_demo_budgets (
  id TEXT PRIMARY KEY,
  budget_cycle_id TEXT DEFAULT 'Jul-26',
  category TEXT NOT NULL,
  limit_amount DOUBLE PRECISION DEFAULT 0,
  spent_amount DOUBLE PRECISION DEFAULT 0,
  color TEXT DEFAULT '#635BFF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Enable Row Level Security (RLS) & Set Read-Only Access Policies
-- ==============================================================================

ALTER TABLE finance_demo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_demo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_demo_budgets ENABLE ROW LEVEL SECURITY;

-- Allow all users (anon or service role) to read and seed demo tables
CREATE POLICY "Allow all access on finance_demo_events"
  ON finance_demo_events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access on finance_demo_accounts"
  ON finance_demo_accounts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access on finance_demo_budgets"
  ON finance_demo_budgets FOR ALL USING (true) WITH CHECK (true);

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

-- Create the table
CREATE TABLE IF NOT EXISTS public.finance_security_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL, -- e.g., 'OTP_SENT', 'OTP_FAILED_ATTEMPT', 'OTP_LOCKOUT'
  email text NOT NULL,
  ip_address text, -- optional tracking
  metadata jsonb, -- e.g., {"attempts": 5, "reason": "Max failures reached"}
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.finance_security_audit ENABLE ROW LEVEL SECURITY;

-- Apply TONIGHT'S LESSONS: Lock down completely for anon/authenticated
-- Service-role access only, no permissive policies
CREATE POLICY "Reject all anon and authenticated access" 
ON public.finance_security_audit
FOR ALL
USING (false);

-- Note: The Service Role Key bypasses RLS automatically, allowing the server to insert and read.

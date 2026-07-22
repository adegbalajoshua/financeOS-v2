CREATE TABLE IF NOT EXISTS public.app_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL CHECK (log_type IN ('activity', 'error')),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enforcement: Service role strictly only
ALTER TABLE public.app_event_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Strictly Service Role Only' AND tablename = 'app_event_log') THEN 
    CREATE POLICY "Strictly Service Role Only" ON public.app_event_log FOR ALL USING (false);
  END IF;
END $$;

-- Indexes for dashboard filtering
CREATE INDEX IF NOT EXISTS idx_app_event_log_type ON public.app_event_log(log_type);
CREATE INDEX IF NOT EXISTS idx_app_event_log_category ON public.app_event_log(category);
CREATE INDEX IF NOT EXISTS idx_app_event_log_created_at ON public.app_event_log(created_at DESC);

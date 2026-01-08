-- Create demo_super_admins table for demo mode bypass
CREATE TABLE IF NOT EXISTS public.demo_super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow anon read for demo mode
ALTER TABLE public.demo_super_admins ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for demo bypass check)
CREATE POLICY "Anyone can read demo super admins"
  ON public.demo_super_admins
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert the platform owner
INSERT INTO public.demo_super_admins (email, full_name)
VALUES ('abkanyanta@gmail.com', 'Platform Owner')
ON CONFLICT (email) DO NOTHING;

-- Create system_config table for system_mode
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system config"
  ON public.system_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Set system to demo mode
INSERT INTO public.system_config (key, value)
VALUES ('system_mode', 'demo')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
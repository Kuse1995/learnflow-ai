-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role manages profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true);

-- Admins can view profiles in their school (for user management)
CREATE POLICY "Admins can view school profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'school_admin', 'platform_admin')
        AND ur.is_active = true
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create demo_users table for demo accounts (separate from real auth)
CREATE TABLE IF NOT EXISTS public.demo_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role app_role NOT NULL,
  avatar_url text,
  demo_password_hint text DEFAULT 'demo123',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;

-- Anyone can view demo users (they're for demonstration)
CREATE POLICY "Demo users are publicly viewable"
  ON public.demo_users FOR SELECT
  USING (true);

-- Only service role can manage demo users
CREATE POLICY "Service role manages demo users"
  ON public.demo_users FOR ALL
  TO service_role
  USING (true);

-- Create index for school lookup
CREATE INDEX idx_demo_users_school ON public.demo_users(school_id);

-- Insert demo users for the demo school
INSERT INTO public.demo_users (school_id, full_name, email, role) VALUES
  ('5e508bfd-bd20-4461-8687-450a450111b8', 'Demo Admin', 'admin@demo.stitch.edu', 'admin'),
  ('5e508bfd-bd20-4461-8687-450a450111b8', 'Ms. Banda (Demo)', 'ms.banda@demo.stitch.edu', 'teacher'),
  ('5e508bfd-bd20-4461-8687-450a450111b8', 'Mr. Mwila (Demo)', 'mr.mwila@demo.stitch.edu', 'parent');

-- Add comment for documentation
COMMENT ON TABLE public.demo_users IS 'Demo user accounts for demonstration purposes. These are not real auth users but showcase the system roles.';
-- Function to check if a user is a super admin (uses super_admins table)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- Insert/update the super admin record for abkanyanta@gmail.com
INSERT INTO public.super_admins (user_id, email, name, is_active)
SELECT 
  u.id,
  'abkanyanta@gmail.com',
  COALESCE(u.raw_user_meta_data->>'full_name', 'Super Admin'),
  true
FROM auth.users u
WHERE u.email = 'abkanyanta@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  is_active = true;

-- Ensure platform_admin role in user_roles (super admin uses platform_admin role)
INSERT INTO public.user_roles (user_id, role, school_id)
SELECT 
  u.id,
  'platform_admin'::public.app_role,
  '5e508bfd-bd20-4461-8687-450a450111b8'::uuid
FROM auth.users u
WHERE u.email = 'abkanyanta@gmail.com'
ON CONFLICT (user_id, role, school_id) DO NOTHING;

-- Create trigger function for super admin signup
CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'abkanyanta@gmail.com' THEN
    INSERT INTO public.super_admins (user_id, email, name, is_active)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Super Admin'), true)
    ON CONFLICT (user_id) DO UPDATE SET email = NEW.email, is_active = true;
    
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, 'platform_admin'::public.app_role, '5e508bfd-bd20-4461-8687-450a450111b8'::uuid)
    ON CONFLICT (user_id, role, school_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for super admin signup
DROP TRIGGER IF EXISTS on_super_admin_signup ON auth.users;
CREATE TRIGGER on_super_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_super_admin_signup();

-- Function to check super admin access
CREATE OR REPLACE FUNCTION public.has_super_admin_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(auth.uid());
$$;
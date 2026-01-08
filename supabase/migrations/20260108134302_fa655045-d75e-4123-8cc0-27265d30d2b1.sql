-- Fix handle_new_user function - correct column name from raw_user_meta_data to raw_user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_metadata ->> 'full_name', NEW.raw_user_metadata ->> 'name', 'User'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  BEGIN
    PERFORM public.bootstrap_owner_roles(NEW.id, NEW.email, NEW.raw_user_metadata);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'bootstrap_owner_roles failed for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Fix handle_super_admin_signup function - correct column name
CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'abkanyanta@gmail.com' THEN
    INSERT INTO public.super_admins (user_id, email, name, is_active)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_metadata->>'full_name', 'Super Admin'), true)
    ON CONFLICT (user_id) DO UPDATE SET email = NEW.email, is_active = true;
    
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, 'platform_admin'::public.app_role, '5e508bfd-bd20-4461-8687-450a450111b8'::uuid)
    ON CONFLICT (user_id, role, school_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
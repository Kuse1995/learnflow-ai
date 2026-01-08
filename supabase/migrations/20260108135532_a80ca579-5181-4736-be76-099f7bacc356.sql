-- Fix handle_new_user function - use correct column name raw_user_meta_data
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
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'User'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  BEGIN
    PERFORM public.bootstrap_owner_roles(NEW.id, NEW.email, NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'bootstrap_owner_roles failed for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix handle_super_admin_signup function - use correct column name
CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_super_admin_signup failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix bootstrap_owner_roles function
CREATE OR REPLACE FUNCTION public.bootstrap_owner_roles(p_user_id uuid, p_email text, p_meta jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  demo_school_id uuid := '5e508bfd-bd20-4461-8687-450a450111b8';
  demo_student_id uuid := '11111111-1111-1111-1111-111111111111';
  role_list text[] := ARRAY['platform_admin', 'school_admin', 'admin', 'teacher', 'parent'];
  r text;
BEGIN
  IF LOWER(p_email) = 'abkanyanta@gmail.com' THEN
    FOREACH r IN ARRAY role_list LOOP
      INSERT INTO public.user_roles (user_id, school_id, role, is_active)
      VALUES (p_user_id, demo_school_id, r::app_role, true)
      ON CONFLICT (user_id, school_id, role) DO UPDATE SET is_active = true;
    END LOOP;
    
    INSERT INTO public.guardians (id, display_name, email, user_id, has_account, school_id)
    VALUES (
      p_user_id, 
      COALESCE(p_meta->>'full_name', 'Super Admin'), 
      p_email, 
      p_user_id, 
      true, 
      demo_school_id
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, has_account = true;
    
    INSERT INTO public.guardian_student_links (guardian_id, student_id, role, status)
    VALUES (p_user_id, demo_student_id, 'primary_guardian', 'approved')
    ON CONFLICT (guardian_id, student_id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bootstrap_owner_roles failed: %', SQLERRM;
END;
$$;

-- Add permissive INSERT policy on profiles for signup
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow profile creation on signup"
ON public.profiles FOR INSERT
TO authenticated, anon
WITH CHECK (true);
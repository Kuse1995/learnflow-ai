-- ============================================================
-- COMPREHENSIVE FIX: Signup triggers + Demo access + Owner roles
-- ============================================================

-- 1. Replace handle_new_user to be bulletproof (wrapped in exception handler)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile (safe upsert)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'User'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  -- Now handle dev user roles (wrapped in its own exception block so it can't break signup)
  BEGIN
    PERFORM public.bootstrap_owner_roles(NEW.id, NEW.email, NEW.raw_user_meta_data);
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail signup
    RAISE WARNING 'bootstrap_owner_roles failed for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 2. Create a robust owner bootstrap function
CREATE OR REPLACE FUNCTION public.bootstrap_owner_roles(
  p_user_id uuid,
  p_email text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_school_id uuid := '5e508bfd-bd20-4461-8687-450a450111b8';
  demo_student_id uuid := '11111111-1111-1111-1111-111111111111';
  role_list text[] := ARRAY['platform_admin', 'school_admin', 'admin', 'teacher', 'parent'];
  r text;
BEGIN
  -- Only apply to the owner email
  IF LOWER(p_email) = 'abkanyanta@gmail.com' THEN
    -- Assign all roles for the demo school
    FOREACH r IN ARRAY role_list LOOP
      INSERT INTO public.user_roles (user_id, school_id, role, is_active)
      VALUES (p_user_id, demo_school_id, r::app_role, true)
      ON CONFLICT (user_id, school_id, role) DO UPDATE SET is_active = true;
    END LOOP;
    
    -- Create guardian record (required for guardian_student_links FK)
    INSERT INTO public.guardians (id, display_name, email, user_id, has_account, school_id)
    VALUES (
      p_user_id, 
      COALESCE(p_meta->>'full_name', 'Owner'), 
      p_email, 
      p_user_id, 
      true, 
      demo_school_id
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      has_account = true;
    
    -- Link as parent to demo student
    INSERT INTO public.guardian_student_links (guardian_id, student_id, role, status)
    VALUES (p_user_id, demo_student_id, 'primary_guardian', 'approved')
    ON CONFLICT (guardian_id, student_id) DO NOTHING;
  END IF;
END;
$$;

-- 3. Create a manual repair function (callable via RPC)
CREATE OR REPLACE FUNCTION public.grant_owner_access(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  target_meta jsonb;
BEGIN
  -- Find user by email in profiles
  SELECT id INTO target_user_id FROM public.profiles WHERE LOWER(email) = LOWER(p_email);
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in profiles', p_email;
  END IF;
  
  -- Get user metadata from auth.users if available
  SELECT raw_user_meta_data INTO target_meta FROM auth.users WHERE id = target_user_id;
  
  -- Bootstrap their roles
  PERFORM public.bootstrap_owner_roles(target_user_id, p_email, COALESCE(target_meta, '{}'::jsonb));
  
  RETURN true;
END;
$$;

-- 4. Add RLS policies for anonymous demo access
-- Schools: Allow anon to read demo school
DROP POLICY IF EXISTS "Anonymous can view demo schools" ON public.schools;
CREATE POLICY "Anonymous can view demo schools"
ON public.schools
FOR SELECT
TO anon
USING (is_demo = true);

-- Classes: Allow anon to read demo classes  
DROP POLICY IF EXISTS "Anonymous can view demo classes" ON public.classes;
CREATE POLICY "Anonymous can view demo classes"
ON public.classes
FOR SELECT
TO anon
USING (is_demo = true);

-- Students: Allow anon to read demo students
DROP POLICY IF EXISTS "Anonymous can view demo students" ON public.students;
CREATE POLICY "Anonymous can view demo students"
ON public.students
FOR SELECT
TO anon
USING (is_demo = true);
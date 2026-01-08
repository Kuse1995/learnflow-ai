-- Create a trigger to auto-assign all roles to abkanyanta@gmail.com
CREATE OR REPLACE FUNCTION public.handle_dev_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the dev user
  IF NEW.email = 'abkanyanta@gmail.com' THEN
    -- Assign all roles for the demo school
    INSERT INTO public.user_roles (user_id, school_id, role, is_active)
    VALUES 
      (NEW.id, '00000000-0000-0000-0000-000000000001', 'platform_admin', true),
      (NEW.id, '00000000-0000-0000-0000-000000000001', 'school_admin', true),
      (NEW.id, '00000000-0000-0000-0000-000000000001', 'admin', true),
      (NEW.id, '00000000-0000-0000-0000-000000000001', 'teacher', true),
      (NEW.id, '00000000-0000-0000-0000-000000000001', 'parent', true)
    ON CONFLICT (user_id, school_id, role) DO NOTHING;
    
    -- Also link as parent to demo student
    INSERT INTO public.guardian_student_links (guardian_user_id, student_id, relationship, status, is_demo)
    VALUES (NEW.id, '11111111-1111-1111-1111-111111111111', 'parent', 'approved', true)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after profile is created)
DROP TRIGGER IF EXISTS on_profile_created_assign_dev_roles ON public.profiles;
CREATE TRIGGER on_profile_created_assign_dev_roles
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_dev_user_roles();

-- Also create a function to manually assign dev roles (in case user already exists)
CREATE OR REPLACE FUNCTION public.assign_dev_user_roles(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from profiles
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Assign all roles
  INSERT INTO public.user_roles (user_id, school_id, role, is_active)
  VALUES 
    (target_user_id, '00000000-0000-0000-0000-000000000001', 'platform_admin', true),
    (target_user_id, '00000000-0000-0000-0000-000000000001', 'school_admin', true),
    (target_user_id, '00000000-0000-0000-0000-000000000001', 'admin', true),
    (target_user_id, '00000000-0000-0000-0000-000000000001', 'teacher', true),
    (target_user_id, '00000000-0000-0000-0000-000000000001', 'parent', true)
  ON CONFLICT (user_id, school_id, role) DO UPDATE SET is_active = true;
  
  -- Link as parent to demo student
  INSERT INTO public.guardian_student_links (guardian_user_id, student_id, relationship, status, is_demo)
  VALUES (target_user_id, '11111111-1111-1111-1111-111111111111', 'parent', 'approved', true)
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;
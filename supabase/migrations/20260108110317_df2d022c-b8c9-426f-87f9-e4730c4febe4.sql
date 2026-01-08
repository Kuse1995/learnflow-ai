-- Fix the handle_dev_user_roles trigger to use correct school ID and correct column names
CREATE OR REPLACE FUNCTION public.handle_dev_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_school_id uuid := '5e508bfd-bd20-4461-8687-450a450111b8';
  demo_student_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Check if this is the dev user
  IF NEW.email = 'abkanyanta@gmail.com' THEN
    -- Assign all roles for the demo school
    INSERT INTO public.user_roles (user_id, school_id, role, is_active)
    VALUES 
      (NEW.id, demo_school_id, 'platform_admin', true),
      (NEW.id, demo_school_id, 'school_admin', true),
      (NEW.id, demo_school_id, 'admin', true),
      (NEW.id, demo_school_id, 'teacher', true),
      (NEW.id, demo_school_id, 'parent', true)
    ON CONFLICT (user_id, role, school_id) DO NOTHING;
    
    -- Also link as parent to demo student (using correct columns)
    INSERT INTO public.guardian_student_links (guardian_id, student_id, role)
    VALUES (NEW.id, demo_student_id, 'primary_guardian')
    ON CONFLICT (guardian_id, student_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
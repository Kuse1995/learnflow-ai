-- Update the dev user roles function to use the correct demo school ID
CREATE OR REPLACE FUNCTION public.assign_dev_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_school_id uuid := '5e508bfd-bd20-4461-8687-450a450111b8';
  demo_student_id uuid := '11111111-1111-1111-1111-111111111111';
  role_list app_role[] := ARRAY['platform_admin', 'school_admin', 'admin', 'teacher', 'parent']::app_role[];
  r app_role;
BEGIN
  -- Only apply to the dev user email
  IF NEW.email = 'abkanyanta@gmail.com' THEN
    -- Insert all roles for this user
    FOREACH r IN ARRAY role_list LOOP
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (NEW.id, r, demo_school_id)
      ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
    
    -- Link as parent to demo student
    INSERT INTO public.guardian_student_links (guardian_id, student_id, relationship, status, verified)
    VALUES (NEW.id, demo_student_id, 'parent', 'approved', true)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
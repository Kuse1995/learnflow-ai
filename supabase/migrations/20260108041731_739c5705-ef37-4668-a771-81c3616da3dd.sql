-- ============================================================================
-- ROLE ENFORCEMENT: Security Definer Functions (Simplified)
-- ============================================================================

-- Core role check functions already exist, just update access checks

-- Student Access Check (get school via class)
CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'platform_admin'::app_role, NULL)
    OR
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.classes c ON c.id = s.class_id
      JOIN public.user_roles ur ON ur.user_id = _user_id 
        AND ur.school_id = c.school_id 
        AND ur.role IN ('school_admin'::app_role, 'admin'::app_role)
        AND ur.is_active = true
      WHERE s.id = _student_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.classes c ON c.id = s.class_id
      WHERE s.id = _student_id
        AND c.teacher_id = _user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.guardian_student_links gsl
      WHERE gsl.student_id = _student_id
        AND gsl.guardian_id = _user_id
        AND gsl.deleted_at IS NULL
    )
$$;

-- Class Access Check
CREATE OR REPLACE FUNCTION public.can_access_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'platform_admin'::app_role, NULL)
    OR
    EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.user_roles ur ON ur.user_id = _user_id 
        AND ur.school_id = c.school_id 
        AND ur.role IN ('school_admin'::app_role, 'admin'::app_role)
        AND ur.is_active = true
      WHERE c.id = _class_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = _class_id
        AND c.teacher_id = _user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.guardian_student_links gsl
      JOIN public.students s ON s.id = gsl.student_id
      WHERE gsl.guardian_id = _user_id
        AND gsl.deleted_at IS NULL
        AND s.class_id = _class_id
    )
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.can_access_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) TO authenticated;
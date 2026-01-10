
-- Fix infinite recursion in user_roles RLS policies
-- The problem: "School admins can view roles in their school" policy queries user_roles itself

-- Step 1: Create a SECURITY DEFINER function to check roles without triggering RLS
CREATE OR REPLACE FUNCTION public.user_has_role_in_school(
  p_user_id uuid,
  p_roles app_role[],
  p_school_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = ANY(p_roles)
      AND is_active = true
      AND (p_school_id IS NULL OR school_id = p_school_id)
  )
$$;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "School admins can view roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Step 3: Recreate policies using the SECURITY DEFINER function

-- Users can always view their own roles (simple, no recursion)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- School admins can view roles in schools they administer
CREATE POLICY "School admins can view school roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.user_has_role_in_school(auth.uid(), ARRAY['school_admin', 'platform_admin']::app_role[], school_id)
);

-- Super admins and platform owner can manage all roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- School admins can insert roles for their school
CREATE POLICY "School admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_role_in_school(auth.uid(), ARRAY['school_admin', 'platform_admin']::app_role[], school_id)
);

-- School admins can update roles in their school
CREATE POLICY "School admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.user_has_role_in_school(auth.uid(), ARRAY['school_admin', 'platform_admin']::app_role[], school_id)
);

-- Allow school admins to view all roles within their own school
CREATE POLICY "School admins can view roles in their school"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT ur.school_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('school_admin', 'platform_admin')
    AND ur.is_active = true
  )
);
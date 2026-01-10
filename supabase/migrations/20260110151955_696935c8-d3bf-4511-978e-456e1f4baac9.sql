-- Fix 1: Assign artofbrands25@gmail.com as school_admin for Lusaka School
INSERT INTO public.user_roles (user_id, school_id, role)
VALUES (
  'bb48151f-82f5-46f1-8b7a-0836ecb77fd2',  -- artofbrands25@gmail.com's profile ID
  '97a53fc8-497a-445d-afc8-0f16dadee25b',   -- Lusaka School ID
  'school_admin'
)
ON CONFLICT (user_id, school_id, role) DO NOTHING;

-- Fix 2: Add backup RLS policy using direct platform_admin role check
-- This ensures Platform Owners can always view profiles for admin assignment
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND is_active = true
  )
);
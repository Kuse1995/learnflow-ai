-- Allow Platform Owner / Super Admins to look up users by email
-- This fixes email search returning "No user found" due to RLS filtering.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Super admins can view all profiles'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Super admins can view all profiles"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin(auth.uid()));
    $sql$;
  END IF;
END $$;
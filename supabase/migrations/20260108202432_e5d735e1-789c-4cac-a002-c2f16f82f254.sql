-- Allow anonymous users to read school info when they have a valid invitation token
-- This is needed for the invitation acceptance flow to show the school name
CREATE POLICY "Anonymous can view schools via invitation"
ON public.schools
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_invitations ti
    WHERE ti.school_id = schools.id
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  )
);
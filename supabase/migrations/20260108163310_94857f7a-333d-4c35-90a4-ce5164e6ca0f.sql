-- Create teacher_invitations table for managing teacher invitations
CREATE TABLE public.teacher_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  invited_by UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, email)
);

-- Enable RLS
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- School admins can view invitations for their school
CREATE POLICY "school_admins_view_invitations" ON public.teacher_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.school_id = teacher_invitations.school_id
      AND ur.role IN ('school_admin', 'admin')
      AND ur.is_active = true
    )
  );

-- School admins can insert invitations for their school
CREATE POLICY "school_admins_insert_invitations" ON public.teacher_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.school_id = teacher_invitations.school_id
      AND ur.role IN ('school_admin', 'admin')
      AND ur.is_active = true
    )
  );

-- School admins can update invitations for their school
CREATE POLICY "school_admins_update_invitations" ON public.teacher_invitations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.school_id = teacher_invitations.school_id
      AND ur.role IN ('school_admin', 'admin')
      AND ur.is_active = true
    )
  );

-- Allow public read access to invitations by token (for acceptance flow)
CREATE POLICY "public_read_by_token" ON public.teacher_invitations
  FOR SELECT TO anon
  USING (true);

-- Add index for faster token lookups
CREATE INDEX idx_teacher_invitations_token ON public.teacher_invitations(invite_token);
CREATE INDEX idx_teacher_invitations_school_status ON public.teacher_invitations(school_id, status);
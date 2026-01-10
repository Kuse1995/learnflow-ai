-- Create pending_admin_invitations table for users who haven't registered yet
CREATE TABLE public.pending_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'school_admin',
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  claimed_by UUID,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Enable RLS
ALTER TABLE public.pending_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage invitations"
ON public.pending_admin_invitations FOR ALL
USING (public.is_super_admin(auth.uid()));

-- School admins can view their school's invitations
CREATE POLICY "School admins can view their invitations"
ON public.pending_admin_invitations FOR SELECT
USING (school_id IN (
  SELECT ur.school_id FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
));

-- Create function to process pending invitations when a new user signs up
CREATE OR REPLACE FUNCTION public.process_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
BEGIN
  -- Find all pending invitations for this email
  FOR invitation IN 
    SELECT * FROM public.pending_admin_invitations 
    WHERE LOWER(email) = LOWER(NEW.email)
    AND claimed_at IS NULL 
    AND (expires_at IS NULL OR expires_at > now())
  LOOP
    -- Assign the role
    INSERT INTO public.user_roles (user_id, school_id, role)
    VALUES (NEW.id, invitation.school_id, invitation.role)
    ON CONFLICT (user_id, school_id, role) DO NOTHING;
    
    -- Mark invitation as claimed
    UPDATE public.pending_admin_invitations 
    SET claimed_at = now(), claimed_by = NEW.id
    WHERE id = invitation.id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign roles when a user signs up
DROP TRIGGER IF EXISTS on_profile_created_check_invitations ON public.profiles;
CREATE TRIGGER on_profile_created_check_invitations
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.process_pending_invitations();

-- Fix artofbrands25@gmail.com - assign to Sign school if they exist
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = LOWER('artofbrands25@gmail.com');
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, school_id, role)
    VALUES (v_user_id, '7a34d826-8bad-4dfd-a1a9-e9d407f095e4', 'school_admin')
    ON CONFLICT (user_id, school_id, role) DO NOTHING;
  END IF;
END $$;
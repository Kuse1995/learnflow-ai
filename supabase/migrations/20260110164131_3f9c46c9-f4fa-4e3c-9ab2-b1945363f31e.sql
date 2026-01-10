
-- Step 1: Backfill - Convert pending invitation for beescornertv@gmail.com into actual role
INSERT INTO public.user_roles (user_id, school_id, role)
SELECT 
  p.id as user_id,
  pai.school_id,
  pai.role
FROM public.pending_admin_invitations pai
JOIN public.profiles p ON LOWER(p.email) = LOWER(pai.email)
WHERE pai.claimed_at IS NULL
ON CONFLICT (user_id, school_id, role) DO NOTHING;

-- Step 2: Mark those invitations as claimed
UPDATE public.pending_admin_invitations pai
SET 
  claimed_at = now(),
  claimed_by = (SELECT p.id FROM public.profiles p WHERE LOWER(p.email) = LOWER(pai.email) LIMIT 1)
WHERE pai.claimed_at IS NULL
AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE LOWER(p.email) = LOWER(pai.email)
);

-- Step 3: Create auto-claim trigger for future invitations
-- When an invitation is created, if the user already exists, immediately assign the role
CREATE OR REPLACE FUNCTION public.auto_claim_invitation_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Check if a profile exists for this email
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;
  
  -- If profile exists, immediately assign the role
  IF v_profile_id IS NOT NULL THEN
    -- Insert the role
    INSERT INTO public.user_roles (user_id, school_id, role)
    VALUES (v_profile_id, NEW.school_id, NEW.role)
    ON CONFLICT (user_id, school_id, role) DO NOTHING;
    
    -- Mark the invitation as claimed
    NEW.claimed_at := now();
    NEW.claimed_by := v_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_invitation_auto_claim ON public.pending_admin_invitations;
CREATE TRIGGER on_invitation_auto_claim
  BEFORE INSERT ON public.pending_admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_claim_invitation_on_insert();

-- Step 4: Ensure the existing trigger for profile creation also claims invitations
-- Update the existing on_profile_created_check_invitations trigger to be more robust
CREATE OR REPLACE FUNCTION public.claim_pending_invitations_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign roles from any pending invitations for this email
  INSERT INTO public.user_roles (user_id, school_id, role)
  SELECT NEW.id, pai.school_id, pai.role
  FROM public.pending_admin_invitations pai
  WHERE LOWER(pai.email) = LOWER(NEW.email)
  AND pai.claimed_at IS NULL
  ON CONFLICT (user_id, school_id, role) DO NOTHING;
  
  -- Mark those invitations as claimed
  UPDATE public.pending_admin_invitations
  SET claimed_at = now(), claimed_by = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
  AND claimed_at IS NULL;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_check_invitations ON public.profiles;
CREATE TRIGGER on_profile_created_check_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_pending_invitations_on_profile_create();

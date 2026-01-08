-- Parent permission tiers enum
CREATE TYPE public.parent_permission_tier AS ENUM (
  'view_only',           -- Tier 1: Can only view approved content
  'view_notifications',  -- Tier 2: View + receive notifications
  'full_access'          -- Tier 3: Future full parent portal access
);

-- Parent permissions table
CREATE TABLE public.parent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  permission_tier public.parent_permission_tier NOT NULL DEFAULT 'view_only',
  
  -- Granular feature permissions (for future extensibility)
  can_view_attendance BOOLEAN DEFAULT true,
  can_view_learning_updates BOOLEAN DEFAULT true,
  can_view_approved_insights BOOLEAN DEFAULT true,
  can_receive_notifications BOOLEAN DEFAULT false,
  can_view_fees BOOLEAN DEFAULT false,           -- Future
  can_view_reports BOOLEAN DEFAULT false,        -- Future
  can_view_timetables BOOLEAN DEFAULT false,     -- Future
  can_request_meetings BOOLEAN DEFAULT false,    -- Future
  
  -- Restrictions (things parents can NEVER see)
  -- These are enforced in code, stored here for documentation
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID,  -- Teacher or admin who granted access
  granted_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(guardian_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check parent permission
CREATE OR REPLACE FUNCTION public.get_parent_permission_tier(
  _guardian_id UUID,
  _student_id UUID
)
RETURNS public.parent_permission_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permission_tier
  FROM public.parent_permissions
  WHERE guardian_id = _guardian_id
    AND student_id = _student_id
  LIMIT 1
$$;

-- Check if parent can access specific feature
CREATE OR REPLACE FUNCTION public.parent_can_access(
  _guardian_id UUID,
  _student_id UUID,
  _feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perm RECORD;
BEGIN
  SELECT * INTO perm
  FROM public.parent_permissions
  WHERE guardian_id = _guardian_id
    AND student_id = _student_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check feature access based on tier and granular permissions
  CASE _feature
    WHEN 'attendance' THEN RETURN perm.can_view_attendance;
    WHEN 'learning_updates' THEN RETURN perm.can_view_learning_updates;
    WHEN 'approved_insights' THEN RETURN perm.can_view_approved_insights;
    WHEN 'notifications' THEN RETURN perm.can_receive_notifications;
    WHEN 'fees' THEN RETURN perm.can_view_fees;
    WHEN 'reports' THEN RETURN perm.can_view_reports;
    WHEN 'timetables' THEN RETURN perm.can_view_timetables;
    WHEN 'meetings' THEN RETURN perm.can_request_meetings;
    -- Forbidden features - always return false
    WHEN 'analytics' THEN RETURN false;
    WHEN 'raw_scores' THEN RETURN false;
    WHEN 'rankings' THEN RETURN false;
    WHEN 'internal_notes' THEN RETURN false;
    ELSE RETURN false;
  END CASE;
END;
$$;

-- Get all students a guardian can access
CREATE OR REPLACE FUNCTION public.get_guardian_accessible_students(_guardian_id UUID)
RETURNS TABLE(student_id UUID, permission_tier public.parent_permission_tier)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.student_id, pp.permission_tier
  FROM public.parent_permissions pp
  INNER JOIN public.guardian_student_links gsl 
    ON gsl.guardian_id = pp.guardian_id 
    AND gsl.student_id = pp.student_id
  WHERE pp.guardian_id = _guardian_id
$$;

-- RLS Policies
CREATE POLICY "Guardians can view their own permissions"
  ON public.parent_permissions
  FOR SELECT
  USING (
    guardian_id IN (
      SELECT id FROM public.guardians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "School admins can manage permissions"
  ON public.parent_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guardians g
      JOIN public.schools s ON g.school_id = s.id
      WHERE g.id = parent_permissions.guardian_id
    )
  );

-- Trigger to sync tier with granular permissions
CREATE OR REPLACE FUNCTION public.sync_permission_tier()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.permission_tier
    WHEN 'view_only' THEN
      NEW.can_receive_notifications := false;
      NEW.can_view_fees := false;
      NEW.can_view_reports := false;
      NEW.can_view_timetables := false;
      NEW.can_request_meetings := false;
    WHEN 'view_notifications' THEN
      NEW.can_receive_notifications := true;
      NEW.can_view_fees := false;
      NEW.can_view_reports := false;
      NEW.can_view_timetables := false;
      NEW.can_request_meetings := false;
    WHEN 'full_access' THEN
      NEW.can_receive_notifications := true;
      NEW.can_view_fees := true;
      NEW.can_view_reports := true;
      NEW.can_view_timetables := true;
      NEW.can_request_meetings := true;
  END CASE;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_parent_permission_tier
  BEFORE INSERT OR UPDATE OF permission_tier ON public.parent_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_permission_tier();
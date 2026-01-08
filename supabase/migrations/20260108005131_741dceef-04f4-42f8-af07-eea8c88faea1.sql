-- Add soft-delete columns to guardian_student_links
ALTER TABLE public.guardian_student_links 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add soft-delete columns to parent_permissions
ALTER TABLE public.parent_permissions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Mislink incidents table for tracking and recovery
CREATE TABLE public.guardian_link_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The affected link
  link_id UUID REFERENCES public.guardian_student_links(id),
  link_request_id UUID REFERENCES public.guardian_link_requests(id),
  guardian_id UUID NOT NULL REFERENCES public.guardians(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  
  -- Incident details
  incident_type TEXT NOT NULL,  -- 'wrong_parent', 'wrong_student', 'duplicate', 'unauthorized', 'other'
  severity TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  
  -- Discovery
  discovered_by UUID NOT NULL,
  discovered_by_role TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Resolution
  status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'escalated'
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Recovery actions taken
  link_removed BOOLEAN DEFAULT false,
  data_accessed_during_incident BOOLEAN,
  parent_notified BOOLEAN DEFAULT false,
  school_admin_notified BOOLEAN DEFAULT false,
  
  -- Accountability
  root_cause TEXT,
  preventive_measures TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data retention tracking
CREATE TABLE public.guardian_link_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The deleted link info
  original_link_id UUID,
  guardian_id UUID NOT NULL,
  student_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- What was deleted
  relationship_type TEXT,
  permission_tier TEXT,
  
  -- Deletion info
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID NOT NULL,
  deletion_reason TEXT NOT NULL,
  
  -- Retention policy
  retention_until TIMESTAMPTZ NOT NULL,  -- When data can be permanently deleted
  permanent_delete_scheduled BOOLEAN DEFAULT false,
  
  -- Recovery info
  recovered_at TIMESTAMPTZ,
  recovered_by UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardian_link_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_link_retention ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "School admins can view incidents"
  ON public.guardian_link_incidents
  FOR SELECT
  USING (public.is_school_admin(auth.uid(), school_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School admins can create incidents"
  ON public.guardian_link_incidents
  FOR INSERT
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School admins can update incidents"
  ON public.guardian_link_incidents
  FOR UPDATE
  USING (public.is_school_admin(auth.uid(), school_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School admins can view retention records"
  ON public.guardian_link_retention
  FOR SELECT
  USING (public.is_school_admin(auth.uid(), school_id) OR public.is_super_admin(auth.uid()));

-- One-click unlink function (soft delete with full audit)
CREATE OR REPLACE FUNCTION public.unlink_guardian_student(
  p_guardian_id UUID,
  p_student_id UUID,
  p_reason TEXT,
  p_is_mislink BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link guardian_student_links;
  v_permission parent_permissions;
  v_request guardian_link_requests;
  v_school_id UUID;
  v_incident_id UUID;
  v_retention_id UUID;
BEGIN
  -- Get the link
  SELECT * INTO v_link
  FROM guardian_student_links
  WHERE guardian_id = p_guardian_id AND student_id = p_student_id AND deleted_at IS NULL;
  
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link not found');
  END IF;
  
  -- Get school ID
  SELECT c.school_id INTO v_school_id
  FROM students s
  JOIN classes c ON s.class_id = c.id
  WHERE s.id = p_student_id;
  
  -- Soft delete the link
  UPDATE guardian_student_links
  SET deleted_at = now(),
      deleted_by = auth.uid(),
      deletion_reason = p_reason,
      updated_at = now()
  WHERE id = v_link.id;
  
  -- Soft delete permissions
  UPDATE parent_permissions
  SET deleted_at = now(),
      deleted_by = auth.uid(),
      updated_at = now()
  WHERE guardian_id = p_guardian_id AND student_id = p_student_id AND deleted_at IS NULL;
  
  -- Update any active link request
  UPDATE guardian_link_requests
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = auth.uid(),
      revocation_reason = p_reason,
      updated_at = now()
  WHERE guardian_id = p_guardian_id 
    AND student_id = p_student_id 
    AND status = 'activated'
  RETURNING * INTO v_request;
  
  -- Create retention record (90 day retention)
  INSERT INTO guardian_link_retention (
    original_link_id, guardian_id, student_id, school_id,
    relationship_type, permission_tier,
    deleted_by, deletion_reason, retention_until
  ) VALUES (
    v_link.id, p_guardian_id, p_student_id, v_school_id,
    v_link.role::text, 
    (SELECT permission_tier::text FROM parent_permissions WHERE guardian_id = p_guardian_id AND student_id = p_student_id LIMIT 1),
    auth.uid(), p_reason, now() + interval '90 days'
  )
  RETURNING id INTO v_retention_id;
  
  -- If this is a mislink, create an incident
  IF p_is_mislink THEN
    INSERT INTO guardian_link_incidents (
      link_id, link_request_id, guardian_id, student_id, school_id,
      incident_type, severity, description,
      discovered_by, discovered_by_role,
      link_removed
    ) VALUES (
      v_link.id, v_request.id, p_guardian_id, p_student_id, v_school_id,
      'wrong_parent', 'high', p_reason,
      auth.uid(), 'school_admin',
      true
    )
    RETURNING id INTO v_incident_id;
  END IF;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    v_request.id, p_guardian_id, p_student_id,
    'unlinked', 'activated'::link_request_status, 'revoked'::link_request_status,
    auth.uid(), 'school_admin', p_reason,
    jsonb_build_object('is_mislink', p_is_mislink, 'retention_id', v_retention_id)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link.id,
    'retention_id', v_retention_id,
    'incident_id', v_incident_id
  );
END;
$$;

-- Recovery function to restore a soft-deleted link
CREATE OR REPLACE FUNCTION public.recover_guardian_link(
  p_retention_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention guardian_link_retention;
  v_link_id UUID;
BEGIN
  SELECT * INTO v_retention
  FROM guardian_link_retention
  WHERE id = p_retention_id AND recovered_at IS NULL;
  
  IF v_retention IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Retention record not found or already recovered');
  END IF;
  
  -- Restore the link
  UPDATE guardian_student_links
  SET deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL,
      updated_at = now()
  WHERE id = v_retention.original_link_id
  RETURNING id INTO v_link_id;
  
  -- Restore permissions
  UPDATE parent_permissions
  SET deleted_at = NULL,
      deleted_by = NULL,
      updated_at = now()
  WHERE guardian_id = v_retention.guardian_id 
    AND student_id = v_retention.student_id;
  
  -- Mark retention as recovered
  UPDATE guardian_link_retention
  SET recovered_at = now(),
      recovered_by = auth.uid()
  WHERE id = p_retention_id;
  
  -- Log the recovery
  INSERT INTO guardian_link_audit_log (
    guardian_id, student_id,
    action, performed_by, performed_by_role, reason,
    metadata
  ) VALUES (
    v_retention.guardian_id, v_retention.student_id,
    'recovered', auth.uid(), 'school_admin', p_reason,
    jsonb_build_object('retention_id', p_retention_id, 'original_link_id', v_link_id)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link_id,
    'guardian_id', v_retention.guardian_id,
    'student_id', v_retention.student_id
  );
END;
$$;

-- Check if relinking warning is needed
CREATE OR REPLACE FUNCTION public.check_relink_warning(
  p_guardian_id UUID,
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_links INTEGER;
  v_incidents INTEGER;
  v_last_unlink TIMESTAMPTZ;
  v_warnings TEXT[] := '{}';
BEGIN
  -- Check for previous links
  SELECT COUNT(*), MAX(deleted_at) INTO v_previous_links, v_last_unlink
  FROM guardian_student_links
  WHERE guardian_id = p_guardian_id 
    AND student_id = p_student_id 
    AND deleted_at IS NOT NULL;
  
  IF v_previous_links > 0 THEN
    v_warnings := array_append(v_warnings, 
      format('This guardian was previously linked to this student (%s times). Last unlinked: %s', 
             v_previous_links, 
             to_char(v_last_unlink, 'DD Mon YYYY')));
  END IF;
  
  -- Check for incidents
  SELECT COUNT(*) INTO v_incidents
  FROM guardian_link_incidents
  WHERE guardian_id = p_guardian_id OR student_id = p_student_id;
  
  IF v_incidents > 0 THEN
    v_warnings := array_append(v_warnings, 
      format('There have been %s linking incident(s) involving this guardian or student.', v_incidents));
  END IF;
  
  -- Check if currently linked (duplicate)
  IF EXISTS (
    SELECT 1 FROM guardian_student_links 
    WHERE guardian_id = p_guardian_id AND student_id = p_student_id AND deleted_at IS NULL
  ) THEN
    v_warnings := array_append(v_warnings, 'This guardian is already linked to this student.');
  END IF;
  
  RETURN jsonb_build_object(
    'has_warnings', array_length(v_warnings, 1) > 0,
    'warnings', v_warnings,
    'previous_links', v_previous_links,
    'incidents', v_incidents
  );
END;
$$;

-- Indexes
CREATE INDEX idx_link_incidents_school ON guardian_link_incidents(school_id, status);
CREATE INDEX idx_link_incidents_guardian ON guardian_link_incidents(guardian_id);
CREATE INDEX idx_link_retention_school ON guardian_link_retention(school_id);
CREATE INDEX idx_link_retention_guardian ON guardian_link_retention(guardian_id);
CREATE INDEX idx_links_deleted ON guardian_student_links(deleted_at) WHERE deleted_at IS NOT NULL;
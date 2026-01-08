-- Link request status enum
CREATE TYPE public.link_request_status AS ENUM (
  'pending_review',      -- Awaiting admin/teacher review
  'pending_confirmation', -- Sent to parent for confirmation
  'confirmed',           -- Parent confirmed (if required)
  'activated',           -- Link is active
  'rejected',            -- Rejected by admin/teacher
  'expired',             -- Confirmation expired
  'revoked'              -- Previously active, now revoked
);

-- Link duration type
CREATE TYPE public.link_duration AS ENUM (
  'permanent',           -- No expiry
  'temporary_term',      -- Expires at end of term
  'temporary_year',      -- Expires at end of year
  'temporary_custom'     -- Custom expiry date
);

-- Parent-student link requests table
CREATE TABLE public.guardian_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The link being requested
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Relationship and permissions
  relationship_type public.guardian_role NOT NULL DEFAULT 'secondary_guardian',
  permission_tier public.parent_permission_tier NOT NULL DEFAULT 'view_only',
  
  -- Duration settings
  duration_type public.link_duration NOT NULL DEFAULT 'permanent',
  expires_at TIMESTAMPTZ,
  
  -- Request metadata
  status public.link_request_status NOT NULL DEFAULT 'pending_review',
  initiated_by UUID NOT NULL,  -- Teacher or admin who started this
  initiated_by_role TEXT NOT NULL,  -- 'teacher' or 'school_admin'
  school_id UUID NOT NULL REFERENCES public.schools(id),
  
  -- Verification steps
  requires_parent_confirmation BOOLEAN DEFAULT false,
  confirmation_method TEXT,  -- 'sms', 'whatsapp', or null
  confirmation_code TEXT,  -- 6-digit code if confirmation required
  confirmation_sent_at TIMESTAMPTZ,
  confirmation_expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  -- Safeguard: verification notes
  verification_notes TEXT,  -- How identity was verified
  identity_verified_by UUID,
  identity_verified_at TIMESTAMPTZ,
  
  -- Review/approval
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Activation
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  
  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revocation_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests
  UNIQUE(guardian_id, student_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Audit log for all link changes
CREATE TABLE public.guardian_link_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  link_request_id UUID REFERENCES public.guardian_link_requests(id),
  guardian_id UUID NOT NULL,
  student_id UUID NOT NULL,
  
  -- Change details
  action TEXT NOT NULL,  -- 'initiated', 'reviewed', 'confirmed', 'activated', 'rejected', 'expired', 'revoked'
  previous_status public.link_request_status,
  new_status public.link_request_status,
  
  -- Who made the change
  performed_by UUID,
  performed_by_role TEXT,  -- 'teacher', 'school_admin', 'parent', 'system'
  
  -- Additional context
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardian_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_link_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for link requests
CREATE POLICY "School staff can view their school's link requests"
  ON public.guardian_link_requests
  FOR SELECT
  USING (
    public.is_school_admin(auth.uid(), school_id) OR
    public.is_super_admin(auth.uid()) OR
    initiated_by = auth.uid()
  );

CREATE POLICY "School staff can create link requests"
  ON public.guardian_link_requests
  FOR INSERT
  WITH CHECK (
    public.is_school_admin(auth.uid(), school_id) OR
    initiated_by = auth.uid()
  );

CREATE POLICY "School admins can update link requests"
  ON public.guardian_link_requests
  FOR UPDATE
  USING (
    public.is_school_admin(auth.uid(), school_id) OR
    public.is_super_admin(auth.uid())
  );

-- RLS for audit log (read-only for authorized users)
CREATE POLICY "School admins can view audit logs"
  ON public.guardian_link_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_link_requests glr
      WHERE glr.id = guardian_link_audit_log.link_request_id
      AND (public.is_school_admin(auth.uid(), glr.school_id) OR public.is_super_admin(auth.uid()))
    )
  );

-- Function to log link changes
CREATE OR REPLACE FUNCTION public.log_guardian_link_change(
  p_link_request_id UUID,
  p_guardian_id UUID,
  p_student_id UUID,
  p_action TEXT,
  p_previous_status link_request_status,
  p_new_status link_request_status,
  p_performed_by UUID,
  p_performed_by_role TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO guardian_link_audit_log (
    link_request_id, guardian_id, student_id,
    action, previous_status, new_status,
    performed_by, performed_by_role, reason, metadata
  ) VALUES (
    p_link_request_id, p_guardian_id, p_student_id,
    p_action, p_previous_status, p_new_status,
    p_performed_by, p_performed_by_role, p_reason, p_metadata
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to initiate a link request
CREATE OR REPLACE FUNCTION public.initiate_guardian_link(
  p_guardian_id UUID,
  p_student_id UUID,
  p_relationship_type guardian_role,
  p_permission_tier parent_permission_tier,
  p_duration_type link_duration,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_requires_confirmation BOOLEAN DEFAULT false,
  p_confirmation_method TEXT DEFAULT NULL,
  p_verification_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_school_id UUID;
  v_user_role TEXT;
  v_confirmation_code TEXT;
BEGIN
  -- Get school ID from student
  SELECT s.school_id INTO v_school_id
  FROM students st
  JOIN classes c ON st.class_id = c.id
  JOIN schools s ON c.school_id = s.id
  WHERE st.id = p_student_id;
  
  -- Determine initiator's role
  IF public.is_school_admin(auth.uid(), v_school_id) THEN
    v_user_role := 'school_admin';
  ELSE
    v_user_role := 'teacher';
  END IF;
  
  -- Generate confirmation code if needed
  IF p_requires_confirmation THEN
    v_confirmation_code := lpad(floor(random() * 1000000)::text, 6, '0');
  END IF;
  
  -- Create the request
  INSERT INTO guardian_link_requests (
    guardian_id, student_id, relationship_type, permission_tier,
    duration_type, expires_at, initiated_by, initiated_by_role, school_id,
    requires_parent_confirmation, confirmation_method, confirmation_code,
    verification_notes, identity_verified_by, identity_verified_at,
    status
  ) VALUES (
    p_guardian_id, p_student_id, p_relationship_type, p_permission_tier,
    p_duration_type, p_expires_at, auth.uid(), v_user_role, v_school_id,
    p_requires_confirmation, p_confirmation_method, v_confirmation_code,
    p_verification_notes, auth.uid(), now(),
    CASE WHEN p_requires_confirmation THEN 'pending_review' ELSE 'pending_review' END
  )
  RETURNING id INTO v_id;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    v_id, p_guardian_id, p_student_id,
    'initiated', NULL, 'pending_review',
    auth.uid(), v_user_role, NULL,
    jsonb_build_object(
      'relationship_type', p_relationship_type,
      'permission_tier', p_permission_tier,
      'requires_confirmation', p_requires_confirmation
    )
  );
  
  RETURN v_id;
END;
$$;

-- Function to approve and optionally send confirmation
CREATE OR REPLACE FUNCTION public.approve_guardian_link(
  p_request_id UUID,
  p_send_confirmation BOOLEAN DEFAULT false,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request guardian_link_requests;
  v_new_status link_request_status;
BEGIN
  SELECT * INTO v_request FROM guardian_link_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending_review' THEN
    RAISE EXCEPTION 'Request is not pending review';
  END IF;
  
  -- Determine next status
  IF p_send_confirmation AND v_request.requires_parent_confirmation THEN
    v_new_status := 'pending_confirmation';
  ELSE
    v_new_status := 'activated';
  END IF;
  
  -- Update the request
  UPDATE guardian_link_requests
  SET status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes,
      confirmation_sent_at = CASE WHEN p_send_confirmation THEN now() ELSE NULL END,
      confirmation_expires_at = CASE WHEN p_send_confirmation THEN now() + interval '48 hours' ELSE NULL END,
      activated_at = CASE WHEN v_new_status = 'activated' THEN now() ELSE NULL END,
      activated_by = CASE WHEN v_new_status = 'activated' THEN auth.uid() ELSE NULL END,
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Create the actual link if activated
  IF v_new_status = 'activated' THEN
    INSERT INTO guardian_student_links (guardian_id, student_id, role, created_by)
    VALUES (v_request.guardian_id, v_request.student_id, v_request.relationship_type, auth.uid())
    ON CONFLICT (guardian_id, student_id) DO UPDATE SET
      role = v_request.relationship_type,
      updated_at = now();
    
    -- Create permissions
    INSERT INTO parent_permissions (guardian_id, student_id, permission_tier, granted_by)
    VALUES (v_request.guardian_id, v_request.student_id, v_request.permission_tier, auth.uid())
    ON CONFLICT (guardian_id, student_id) DO UPDATE SET
      permission_tier = v_request.permission_tier,
      granted_by = auth.uid(),
      granted_at = now();
  END IF;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    p_request_id, v_request.guardian_id, v_request.student_id,
    CASE WHEN v_new_status = 'activated' THEN 'activated' ELSE 'approved' END,
    'pending_review', v_new_status,
    auth.uid(), 'school_admin', p_review_notes, '{}'
  );
  
  RETURN true;
END;
$$;

-- Function to confirm link (by parent)
CREATE OR REPLACE FUNCTION public.confirm_guardian_link(
  p_request_id UUID,
  p_confirmation_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request guardian_link_requests;
BEGIN
  SELECT * INTO v_request FROM guardian_link_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending_confirmation' THEN
    RAISE EXCEPTION 'Request is not pending confirmation';
  END IF;
  
  IF v_request.confirmation_expires_at < now() THEN
    UPDATE guardian_link_requests SET status = 'expired', updated_at = now() WHERE id = p_request_id;
    RAISE EXCEPTION 'Confirmation has expired';
  END IF;
  
  IF v_request.confirmation_code != p_confirmation_code THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;
  
  -- Activate the link
  UPDATE guardian_link_requests
  SET status = 'activated',
      confirmed_at = now(),
      activated_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Create the actual link
  INSERT INTO guardian_student_links (guardian_id, student_id, role)
  VALUES (v_request.guardian_id, v_request.student_id, v_request.relationship_type)
  ON CONFLICT (guardian_id, student_id) DO UPDATE SET
    role = v_request.relationship_type,
    updated_at = now();
  
  -- Create permissions
  INSERT INTO parent_permissions (guardian_id, student_id, permission_tier)
  VALUES (v_request.guardian_id, v_request.student_id, v_request.permission_tier)
  ON CONFLICT (guardian_id, student_id) DO UPDATE SET
    permission_tier = v_request.permission_tier;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    p_request_id, v_request.guardian_id, v_request.student_id,
    'confirmed', 'pending_confirmation', 'activated',
    auth.uid(), 'parent', NULL, '{}'
  );
  
  RETURN true;
END;
$$;

-- Function to reject a link request
CREATE OR REPLACE FUNCTION public.reject_guardian_link(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request guardian_link_requests;
BEGIN
  SELECT * INTO v_request FROM guardian_link_requests WHERE id = p_request_id;
  
  UPDATE guardian_link_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    p_request_id, v_request.guardian_id, v_request.student_id,
    'rejected', v_request.status, 'rejected',
    auth.uid(), 'school_admin', p_reason, '{}'
  );
  
  RETURN true;
END;
$$;

-- Function to revoke an active link
CREATE OR REPLACE FUNCTION public.revoke_guardian_link(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request guardian_link_requests;
BEGIN
  SELECT * INTO v_request FROM guardian_link_requests WHERE id = p_request_id;
  
  IF v_request.status != 'activated' THEN
    RAISE EXCEPTION 'Can only revoke activated links';
  END IF;
  
  -- Update request status
  UPDATE guardian_link_requests
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = auth.uid(),
      revocation_reason = p_reason,
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Remove the actual link
  DELETE FROM guardian_student_links
  WHERE guardian_id = v_request.guardian_id AND student_id = v_request.student_id;
  
  -- Remove permissions
  DELETE FROM parent_permissions
  WHERE guardian_id = v_request.guardian_id AND student_id = v_request.student_id;
  
  -- Log the action
  PERFORM log_guardian_link_change(
    p_request_id, v_request.guardian_id, v_request.student_id,
    'revoked', 'activated', 'revoked',
    auth.uid(), 'school_admin', p_reason, '{}'
  );
  
  RETURN true;
END;
$$;

-- Index for performance
CREATE INDEX idx_link_requests_school_status ON guardian_link_requests(school_id, status);
CREATE INDEX idx_link_requests_guardian ON guardian_link_requests(guardian_id);
CREATE INDEX idx_link_requests_student ON guardian_link_requests(student_id);
CREATE INDEX idx_link_audit_request ON guardian_link_audit_log(link_request_id);
CREATE INDEX idx_link_audit_guardian ON guardian_link_audit_log(guardian_id);
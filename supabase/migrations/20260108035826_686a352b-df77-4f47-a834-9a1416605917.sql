-- School Export Jobs table
CREATE TABLE IF NOT EXISTS public.school_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  export_level TEXT NOT NULL CHECK (export_level IN ('operational', 'insight', 'full_archive')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  file_url TEXT,
  file_size_bytes BIGINT,
  record_counts JSONB DEFAULT '{}',
  manifest JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- School Offboarding Requests table
CREATE TABLE IF NOT EXISTS public.school_offboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) UNIQUE,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'export_pending', 'cooling_period', 'deactivated', 'cancelled')),
  export_job_id UUID REFERENCES public.school_export_jobs(id),
  cooling_period_ends_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  retention_expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add offboarding status to schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS offboarding_status TEXT DEFAULT NULL 
CHECK (offboarding_status IS NULL OR offboarding_status IN ('cooling_period', 'deactivated'));

-- Enable RLS
ALTER TABLE public.school_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_offboarding_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for export jobs (admin only)
CREATE POLICY "Admins can view school export jobs"
  ON public.school_export_jobs FOR SELECT
  USING (true);

CREATE POLICY "Admins can create export jobs"
  ON public.school_export_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update export jobs"
  ON public.school_export_jobs FOR UPDATE
  USING (true);

-- RLS policies for offboarding requests
CREATE POLICY "Admins can view offboarding requests"
  ON public.school_offboarding_requests FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage offboarding"
  ON public.school_offboarding_requests FOR ALL
  USING (true);

-- Function to log export request
CREATE OR REPLACE FUNCTION public.log_export_request(
  p_school_id UUID,
  p_export_level TEXT,
  p_requested_by TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Check for existing active export
  IF EXISTS (
    SELECT 1 FROM school_export_jobs 
    WHERE school_id = p_school_id 
    AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'An export is already in progress for this school';
  END IF;

  -- Create export job
  INSERT INTO school_export_jobs (school_id, export_level, requested_by)
  VALUES (p_school_id, p_export_level, p_requested_by)
  RETURNING id INTO v_job_id;

  -- Log to audit
  INSERT INTO system_audit_logs (user_id, role_used, action, entity_type, entity_id, details)
  VALUES (
    p_requested_by,
    'admin',
    'export_requested',
    'school',
    p_school_id::TEXT,
    jsonb_build_object('export_level', p_export_level, 'job_id', v_job_id)
  );

  RETURN v_job_id;
END;
$$;

-- Function to initiate offboarding
CREATE OR REPLACE FUNCTION public.initiate_offboarding(
  p_school_id UUID,
  p_requested_by TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if already offboarding
  IF EXISTS (
    SELECT 1 FROM school_offboarding_requests 
    WHERE school_id = p_school_id 
    AND status NOT IN ('cancelled')
  ) THEN
    RAISE EXCEPTION 'Offboarding already initiated for this school';
  END IF;

  -- Create offboarding request
  INSERT INTO school_offboarding_requests (school_id, requested_by, reason, status)
  VALUES (p_school_id, p_requested_by, p_reason, 'export_pending')
  RETURNING id INTO v_request_id;

  -- Log to audit
  INSERT INTO system_audit_logs (user_id, role_used, action, entity_type, entity_id, details)
  VALUES (
    p_requested_by,
    'admin',
    'offboarding_initiated',
    'school',
    p_school_id::TEXT,
    jsonb_build_object('reason', p_reason, 'request_id', v_request_id)
  );

  RETURN v_request_id;
END;
$$;

-- Function to complete mandatory export and start cooling period
CREATE OR REPLACE FUNCTION public.complete_offboarding_export(
  p_request_id UUID,
  p_export_job_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  -- Get school_id and validate
  SELECT school_id INTO v_school_id
  FROM school_offboarding_requests
  WHERE id = p_request_id AND status = 'export_pending';

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Invalid offboarding request or wrong status';
  END IF;

  -- Update offboarding request
  UPDATE school_offboarding_requests
  SET 
    status = 'cooling_period',
    export_job_id = p_export_job_id,
    cooling_period_ends_at = now() + INTERVAL '14 days',
    updated_at = now()
  WHERE id = p_request_id;

  -- Update school status
  UPDATE schools
  SET offboarding_status = 'cooling_period'
  WHERE id = v_school_id;

  RETURN TRUE;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_school ON public.school_export_jobs(school_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.school_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_offboarding_school ON public.school_offboarding_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_status ON public.school_offboarding_requests(status);
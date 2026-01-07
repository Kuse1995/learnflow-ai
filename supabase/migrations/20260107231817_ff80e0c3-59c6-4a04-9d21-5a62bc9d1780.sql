
-- Create actor_type enum
CREATE TYPE public.audit_actor_type AS ENUM ('system', 'admin', 'teacher', 'ai_agent');

-- Create compliance_mode enum
CREATE TYPE public.compliance_mode AS ENUM ('standard', 'strict');

-- Create audit_logs table with tamper-safe hash chain
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type audit_actor_type NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  environment TEXT NOT NULL DEFAULT 'development',
  previous_hash TEXT,
  entry_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_action_traces for AI traceability
CREATE TABLE public.ai_action_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES public.audit_logs(id) ON DELETE RESTRICT NOT NULL,
  agent_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  data_sources TEXT[] DEFAULT '{}',
  class_id UUID REFERENCES public.classes(id),
  student_id UUID REFERENCES public.students(id),
  teacher_response TEXT CHECK (teacher_response IN ('approved', 'ignored', 'pending')),
  teacher_responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_settings per school
CREATE TABLE public.compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  compliance_mode compliance_mode NOT NULL DEFAULT 'standard',
  require_teacher_approval BOOLEAN NOT NULL DEFAULT false,
  disable_auto_generation BOOLEAN NOT NULL DEFAULT false,
  require_confirmation_steps BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create audit_integrity_alerts for tamper detection
CREATE TABLE public.audit_integrity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  alert_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS on all tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_integrity_alerts ENABLE ROW LEVEL SECURITY;

-- Audit logs: Super admins can read all, teachers can read their own + AI actions for their classes
CREATE POLICY "Super admins can read all audit logs"
ON public.audit_logs FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Teachers can read own audit logs"
ON public.audit_logs FOR SELECT
USING (actor_id = auth.uid());

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- AI action traces: Similar access pattern
CREATE POLICY "Super admins can read all AI traces"
ON public.ai_action_traces FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert AI traces"
ON public.ai_action_traces FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update AI traces"
ON public.ai_action_traces FOR UPDATE
USING (true);

-- Compliance settings: Schools can read own, super admins can manage all
CREATE POLICY "Schools can read own compliance settings"
ON public.compliance_settings FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage compliance settings"
ON public.compliance_settings FOR ALL
USING (is_super_admin(auth.uid()));

-- Integrity alerts: Super admins only
CREATE POLICY "Super admins can manage integrity alerts"
ON public.audit_integrity_alerts FOR ALL
USING (is_super_admin(auth.uid()));

-- Function to generate hash for audit entry
CREATE OR REPLACE FUNCTION public.generate_audit_hash(
  p_actor_type TEXT,
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_summary TEXT,
  p_metadata JSONB,
  p_environment TEXT,
  p_previous_hash TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  hash_input TEXT;
BEGIN
  hash_input := COALESCE(p_actor_type, '') || '|' ||
                COALESCE(p_actor_id::TEXT, '') || '|' ||
                COALESCE(p_action, '') || '|' ||
                COALESCE(p_entity_type, '') || '|' ||
                COALESCE(p_entity_id::TEXT, '') || '|' ||
                COALESCE(p_summary, '') || '|' ||
                COALESCE(p_metadata::TEXT, '') || '|' ||
                COALESCE(p_environment, '') || '|' ||
                COALESCE(p_previous_hash, 'GENESIS') || '|' ||
                COALESCE(p_created_at::TEXT, '');
  RETURN encode(sha256(hash_input::bytea), 'hex');
END;
$$;

-- Function to create audit log with hash chain
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_actor_type audit_actor_type,
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_summary TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_environment TEXT DEFAULT 'development'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_hash TEXT;
  v_entry_hash TEXT;
  v_created_at TIMESTAMP WITH TIME ZONE;
  v_id UUID;
BEGIN
  v_created_at := now();
  
  -- Get last hash for this environment
  SELECT entry_hash INTO v_previous_hash
  FROM public.audit_logs
  WHERE environment = p_environment
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Generate hash for this entry
  v_entry_hash := generate_audit_hash(
    p_actor_type::TEXT,
    p_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_summary,
    p_metadata,
    p_environment,
    v_previous_hash,
    v_created_at
  );
  
  -- Insert the log
  INSERT INTO public.audit_logs (
    actor_type, actor_id, action, entity_type, entity_id,
    summary, metadata, environment, previous_hash, entry_hash, created_at
  ) VALUES (
    p_actor_type, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_summary, p_metadata, p_environment, v_previous_hash, v_entry_hash, v_created_at
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to verify audit chain integrity
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_environment TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  broken_at UUID,
  expected_hash TEXT,
  actual_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log RECORD;
  v_expected_hash TEXT;
  v_prev_hash TEXT := NULL;
BEGIN
  FOR v_log IN 
    SELECT * FROM public.audit_logs 
    WHERE environment = p_environment 
    ORDER BY created_at ASC
  LOOP
    v_expected_hash := generate_audit_hash(
      v_log.actor_type::TEXT,
      v_log.actor_id,
      v_log.action,
      v_log.entity_type,
      v_log.entity_id,
      v_log.summary,
      v_log.metadata,
      v_log.environment,
      v_prev_hash,
      v_log.created_at
    );
    
    IF v_log.entry_hash != v_expected_hash OR 
       (v_log.previous_hash IS DISTINCT FROM v_prev_hash) THEN
      is_valid := false;
      broken_at := v_log.id;
      expected_hash := v_expected_hash;
      actual_hash := v_log.entry_hash;
      RETURN NEXT;
      RETURN;
    END IF;
    
    v_prev_hash := v_log.entry_hash;
  END LOOP;
  
  is_valid := true;
  broken_at := NULL;
  expected_hash := NULL;
  actual_hash := NULL;
  RETURN NEXT;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_environment ON public.audit_logs(environment);
CREATE INDEX idx_ai_traces_class ON public.ai_action_traces(class_id);
CREATE INDEX idx_ai_traces_teacher_response ON public.ai_action_traces(teacher_response);

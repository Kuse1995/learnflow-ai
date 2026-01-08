-- =============================================================================
-- RBAC ENHANCEMENT - Add missing pieces to existing structure
-- =============================================================================

-- Add missing enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bursar';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Add missing columns to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS assigned_by TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school ON public.user_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active) WHERE is_active = true;

-- =============================================================================
-- SYSTEM AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  role_used public.app_role NOT NULL,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_audit_logs' AND policyname = 'Admins can view audit logs') THEN
    CREATE POLICY "Admins can view audit logs" ON public.system_audit_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_audit_logs' AND policyname = 'System can insert audit logs') THEN
    CREATE POLICY "System can insert audit logs" ON public.system_audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_user ON public.system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_school ON public.system_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON public.system_audit_logs(action_category, action);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON public.system_audit_logs(created_at DESC);

-- =============================================================================
-- ROLE CHECK FUNCTIONS
-- =============================================================================

-- Check if user has a specific role (user_id is UUID in existing table)
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role public.app_role,
  p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = p_role
      AND is_active = true
      AND (p_school_id IS NULL OR school_id = p_school_id OR school_id IS NULL)
  )
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(
  p_user_id UUID,
  p_roles public.app_role[],
  p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = ANY(p_roles)
      AND is_active = true
      AND (p_school_id IS NULL OR school_id = p_school_id OR school_id IS NULL)
  )
$$;

-- Get all active roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(
  p_user_id UUID,
  p_school_id UUID DEFAULT NULL
)
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(role ORDER BY role),
    ARRAY[]::public.app_role[]
  )
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND is_active = true
    AND (p_school_id IS NULL OR school_id = p_school_id OR school_id IS NULL)
$$;

-- =============================================================================
-- AUDIT LOG HELPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_sensitive_action(
  p_user_id TEXT,
  p_user_name TEXT,
  p_school_id UUID,
  p_role_used public.app_role,
  p_action TEXT,
  p_action_category TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO system_audit_logs (
    user_id,
    user_name,
    school_id,
    role_used,
    action,
    action_category,
    entity_type,
    entity_id,
    entity_name,
    details,
    success,
    failure_reason
  )
  VALUES (
    p_user_id,
    p_user_name,
    p_school_id,
    p_role_used,
    p_action,
    p_action_category,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_details,
    p_success,
    p_failure_reason
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
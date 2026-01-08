-- =============================================
-- PILOT DEPLOYMENT MODE - Database Schema
-- =============================================

-- Add pilot flag to schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pilot_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pilot_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pilot_notes TEXT;

-- Create rollout phase enum
CREATE TYPE public.rollout_phase AS ENUM (
  'phase_0_setup',      -- Admin + system setup only
  'phase_1_teachers',   -- Teachers only (no parents)
  'phase_2_students',   -- Students (no AI automation)
  'phase_3_ai_suggestions', -- AI features (suggestions only)
  'phase_4_parent_insights', -- Parent insights enabled
  'completed'           -- Pilot complete
);

-- School rollout status table
CREATE TABLE public.school_rollout_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_phase rollout_phase NOT NULL DEFAULT 'phase_0_setup',
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  advanced_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rollout phase history for tracking changes
CREATE TABLE public.rollout_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  from_phase rollout_phase,
  to_phase rollout_phase NOT NULL,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- School change log for tracking all changes
CREATE TABLE public.school_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT NOT NULL,
  change_description TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID,
  rollout_phase rollout_phase,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher feedback for pilot schools
CREATE TABLE public.teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  teacher_account_id UUID REFERENCES public.user_accounts(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'praise', 'concern', 'question')),
  feature_area TEXT,
  message TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pilot incident controls
CREATE TABLE public.pilot_incident_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ai_paused BOOLEAN DEFAULT false,
  ai_paused_at TIMESTAMPTZ,
  ai_paused_by UUID,
  ai_pause_reason TEXT,
  read_only_mode BOOLEAN DEFAULT false,
  read_only_started_at TIMESTAMPTZ,
  read_only_reason TEXT,
  active_banner_message TEXT,
  banner_severity TEXT CHECK (banner_severity IN ('info', 'warning', 'error')),
  banner_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pilot exit criteria checks
CREATE TABLE public.pilot_exit_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Uptime metrics
  uptime_target_percent DECIMAL(5,2) DEFAULT 99.0,
  current_uptime_percent DECIMAL(5,2),
  uptime_met BOOLEAN DEFAULT false,
  -- Teacher usage
  min_active_teachers INTEGER DEFAULT 3,
  current_active_teachers INTEGER DEFAULT 0,
  teacher_usage_met BOOLEAN DEFAULT false,
  -- Error rate
  max_error_rate_percent DECIMAL(5,2) DEFAULT 5.0,
  current_error_rate_percent DECIMAL(5,2),
  error_rate_met BOOLEAN DEFAULT false,
  -- Parent readiness
  parent_features_tested BOOLEAN DEFAULT false,
  parent_satisfaction_score DECIMAL(3,2),
  parent_readiness_met BOOLEAN DEFAULT false,
  -- Overall
  all_criteria_met BOOLEAN DEFAULT false,
  last_evaluated_at TIMESTAMPTZ,
  marked_complete_at TIMESTAMPTZ,
  marked_complete_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pilot metrics aggregates (daily snapshots)
CREATE TABLE public.pilot_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  upload_count INTEGER DEFAULT 0,
  analysis_success_count INTEGER DEFAULT 0,
  analysis_failure_count INTEGER DEFAULT 0,
  ai_generation_count INTEGER DEFAULT 0,
  teacher_action_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  active_teacher_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.school_rollout_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollout_phase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_incident_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_exit_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Super admins can access all pilot data
CREATE POLICY "Super admins can manage rollout status"
ON public.school_rollout_status FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Super admins can view rollout history"
ON public.rollout_phase_history FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Super admins can manage change logs"
ON public.school_change_logs FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Teachers can submit feedback
CREATE POLICY "Teachers can submit feedback"
ON public.teacher_feedback FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.user_id = auth.uid()
  AND ua.role = 'teacher'
));

-- Teachers can view their own feedback
CREATE POLICY "Teachers can view own feedback"
ON public.teacher_feedback FOR SELECT
USING (
  teacher_account_id IN (
    SELECT id FROM public.user_accounts WHERE user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Super admins can manage all feedback
CREATE POLICY "Super admins can manage feedback"
ON public.teacher_feedback FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Super admins can manage incident controls"
ON public.pilot_incident_controls FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Super admins can manage exit criteria"
ON public.pilot_exit_criteria FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Super admins can manage pilot metrics"
ON public.pilot_metrics_daily FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Function to check if school is in specific rollout phase or later
CREATE OR REPLACE FUNCTION public.school_at_phase_or_later(
  p_school_id UUID,
  p_min_phase rollout_phase
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase rollout_phase;
  v_phase_order TEXT[] := ARRAY['phase_0_setup', 'phase_1_teachers', 'phase_2_students', 'phase_3_ai_suggestions', 'phase_4_parent_insights', 'completed'];
BEGIN
  SELECT current_phase INTO v_current_phase
  FROM public.school_rollout_status
  WHERE school_id = p_school_id;
  
  IF v_current_phase IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN array_position(v_phase_order, v_current_phase::TEXT) >= array_position(v_phase_order, p_min_phase::TEXT);
END;
$$;

-- Function to advance rollout phase
CREATE OR REPLACE FUNCTION public.advance_rollout_phase(
  p_school_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS rollout_phase
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase rollout_phase;
  v_next_phase rollout_phase;
  v_phase_order rollout_phase[] := ARRAY['phase_0_setup', 'phase_1_teachers', 'phase_2_students', 'phase_3_ai_suggestions', 'phase_4_parent_insights', 'completed']::rollout_phase[];
  v_current_idx INTEGER;
BEGIN
  SELECT current_phase INTO v_current_phase
  FROM public.school_rollout_status
  WHERE school_id = p_school_id;
  
  IF v_current_phase IS NULL THEN
    RAISE EXCEPTION 'School not found in rollout status';
  END IF;
  
  IF v_current_phase = 'completed' THEN
    RETURN v_current_phase;
  END IF;
  
  v_current_idx := array_position(v_phase_order, v_current_phase);
  v_next_phase := v_phase_order[v_current_idx + 1];
  
  -- Log the phase change
  INSERT INTO public.rollout_phase_history (school_id, from_phase, to_phase, changed_by, reason)
  VALUES (p_school_id, v_current_phase, v_next_phase, auth.uid(), p_reason);
  
  -- Update the current phase
  UPDATE public.school_rollout_status
  SET current_phase = v_next_phase,
      phase_started_at = now(),
      advanced_by = auth.uid(),
      notes = COALESCE(p_reason, notes),
      updated_at = now()
  WHERE school_id = p_school_id;
  
  -- Log the change
  INSERT INTO public.school_change_logs (school_id, change_type, change_description, previous_value, new_value, changed_by, rollout_phase)
  VALUES (p_school_id, 'phase_advancement', 'Rollout phase advanced', to_jsonb(v_current_phase), to_jsonb(v_next_phase), auth.uid(), v_next_phase);
  
  RETURN v_next_phase;
END;
$$;

-- Function to pause AI for a pilot school (emergency)
CREATE OR REPLACE FUNCTION public.pause_pilot_school_ai(
  p_school_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pilot_incident_controls (school_id, ai_paused, ai_paused_at, ai_paused_by, ai_pause_reason)
  VALUES (p_school_id, true, now(), auth.uid(), p_reason)
  ON CONFLICT (school_id) DO UPDATE SET
    ai_paused = true,
    ai_paused_at = now(),
    ai_paused_by = auth.uid(),
    ai_pause_reason = p_reason,
    updated_at = now();
  
  -- Log the change
  INSERT INTO public.school_change_logs (school_id, change_type, change_description, new_value, changed_by)
  VALUES (p_school_id, 'ai_paused', 'AI paused for school', jsonb_build_object('reason', p_reason), auth.uid());
  
  RETURN true;
END;
$$;

-- Function to resume AI for a pilot school
CREATE OR REPLACE FUNCTION public.resume_pilot_school_ai(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pilot_incident_controls
  SET ai_paused = false,
      ai_paused_at = NULL,
      ai_paused_by = NULL,
      ai_pause_reason = NULL,
      updated_at = now()
  WHERE school_id = p_school_id;
  
  -- Log the change
  INSERT INTO public.school_change_logs (school_id, change_type, change_description, changed_by)
  VALUES (p_school_id, 'ai_resumed', 'AI resumed for school', auth.uid());
  
  RETURN true;
END;
$$;
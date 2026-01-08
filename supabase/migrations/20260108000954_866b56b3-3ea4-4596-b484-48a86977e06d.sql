-- =============================================
-- SCHOOL ADMIN GOVERNANCE & OVERSIGHT LAYER
-- =============================================

-- School Admin Onboarding Progress
CREATE TABLE IF NOT EXISTS public.school_admin_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_step INTEGER DEFAULT 1,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Manual Plan Assignments (Manual-First Approach)
CREATE TABLE IF NOT EXISTS public.manual_plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'standard', 'premium')),
  duration_type TEXT NOT NULL CHECK (duration_type IN ('monthly', 'term', 'annual')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  payment_method TEXT, -- 'bank_transfer', 'mobile_money', 'cash', 'other'
  payment_reference TEXT,
  internal_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  paused_at TIMESTAMP WITH TIME ZONE,
  paused_reason TEXT,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- School Admin System History (Soft Audit - Not "Audit Trail")
CREATE TABLE IF NOT EXISTS public.school_system_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  performed_by UUID NOT NULL,
  performed_by_role TEXT,
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- School Admin Dashboard Metrics Cache (for performance)
CREATE TABLE IF NOT EXISTS public.school_admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active_teachers_count INTEGER DEFAULT 0,
  active_classes_count INTEGER DEFAULT 0,
  uploads_this_term INTEGER DEFAULT 0,
  parent_insights_approved_count INTEGER DEFAULT 0,
  adaptive_plans_generated_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_admin_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_system_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admin_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_admin_onboarding
CREATE POLICY "School admins can view their own onboarding"
  ON public.school_admin_onboarding FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School admins can update their own onboarding"
  ON public.school_admin_onboarding FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School admins can insert their onboarding"
  ON public.school_admin_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for manual_plan_assignments
CREATE POLICY "School admins can view their school plan assignments"
  ON public.manual_plan_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = manual_plan_assignments.school_id
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "School admins can manage their school plan assignments"
  ON public.manual_plan_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = manual_plan_assignments.school_id
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policies for school_system_history (read-only for admins)
CREATE POLICY "School admins can view their school system history"
  ON public.school_system_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = school_system_history.school_id
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert history records"
  ON public.school_system_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for school_admin_metrics
CREATE POLICY "School admins can view their school metrics"
  ON public.school_admin_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = school_admin_metrics.school_id
    )
    OR public.is_super_admin(auth.uid())
  );

-- Function to check if user is school admin for a specific school
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = 'school_admin' 
    AND school_id = _school_id
  )
$$;

-- Function to log school system history
CREATE OR REPLACE FUNCTION public.log_school_history(
  p_school_id uuid,
  p_action_type text,
  p_action_description text,
  p_previous_state jsonb DEFAULT NULL,
  p_new_state jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_role text;
BEGIN
  -- Determine the user's role
  SELECT role::text INTO v_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid() AND school_id = p_school_id
  LIMIT 1;
  
  INSERT INTO public.school_system_history (
    school_id,
    action_type,
    action_description,
    performed_by,
    performed_by_role,
    previous_state,
    new_state
  ) VALUES (
    p_school_id,
    p_action_type,
    p_action_description,
    auth.uid(),
    COALESCE(v_user_role, 'unknown'),
    p_previous_state,
    p_new_state
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_plan_assignments_school ON public.manual_plan_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_manual_plan_assignments_active ON public.manual_plan_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_school_system_history_school ON public.school_system_history(school_id);
CREATE INDEX IF NOT EXISTS idx_school_system_history_created ON public.school_system_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_admin_onboarding_user ON public.school_admin_onboarding(user_id);
-- Create billing status enum
CREATE TYPE public.billing_status AS ENUM ('active', 'trial', 'suspended');

-- Add billing fields to schools table
ALTER TABLE public.schools 
ADD COLUMN billing_status billing_status NOT NULL DEFAULT 'trial',
ADD COLUMN billing_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN billing_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
ADD COLUMN billing_notes TEXT;

-- Create usage metrics table
CREATE TABLE public.school_usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  uploads_analyzed INTEGER NOT NULL DEFAULT 0,
  ai_generations INTEGER NOT NULL DEFAULT 0,
  parent_insights_generated INTEGER NOT NULL DEFAULT 0,
  adaptive_support_plans_generated INTEGER NOT NULL DEFAULT 0,
  total_students INTEGER NOT NULL DEFAULT 0,
  total_teachers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, month_year)
);

-- Enable RLS
ALTER TABLE public.school_usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view usage metrics"
ON public.school_usage_metrics
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage usage metrics"
ON public.school_usage_metrics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create usage audit log table
CREATE TABLE public.usage_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'blocked', 'success', 'violation', 'override'
  metric_type TEXT NOT NULL,
  current_usage INTEGER,
  limit_value INTEGER,
  plan TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs (read-only for most users)
CREATE POLICY "Admins can view audit logs"
ON public.usage_audit_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create audit logs"
ON public.usage_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger for updated_at on usage metrics
CREATE TRIGGER update_school_usage_metrics_updated_at
  BEFORE UPDATE ON public.school_usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create current month's usage record
CREATE OR REPLACE FUNCTION public.get_or_create_usage_metrics(p_school_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_id UUID;
BEGIN
  v_month_year := to_char(CURRENT_DATE, 'YYYY-MM');
  
  -- Try to get existing record
  SELECT id INTO v_id 
  FROM school_usage_metrics 
  WHERE school_id = p_school_id AND month_year = v_month_year;
  
  -- Create if not exists
  IF v_id IS NULL THEN
    INSERT INTO school_usage_metrics (school_id, month_year)
    VALUES (p_school_id, v_month_year)
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;

-- Function to atomically increment usage and check limits
CREATE OR REPLACE FUNCTION public.increment_usage_metric(
  p_school_id UUID,
  p_metric TEXT,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_current_usage INTEGER;
  v_new_usage INTEGER;
  v_result JSONB;
BEGIN
  v_month_year := to_char(CURRENT_DATE, 'YYYY-MM');
  
  -- Ensure usage record exists
  PERFORM get_or_create_usage_metrics(p_school_id);
  
  -- Lock the row and get current usage
  EXECUTE format(
    'SELECT %I FROM school_usage_metrics WHERE school_id = $1 AND month_year = $2 FOR UPDATE',
    p_metric
  ) INTO v_current_usage USING p_school_id, v_month_year;
  
  -- Check limit (p_limit = -1 means unlimited)
  IF p_limit >= 0 AND v_current_usage >= p_limit THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'current_usage', v_current_usage,
      'limit', p_limit,
      'reason', 'limit_exceeded'
    );
    RETURN v_result;
  END IF;
  
  -- Increment atomically
  v_new_usage := v_current_usage + 1;
  EXECUTE format(
    'UPDATE school_usage_metrics SET %I = $1 WHERE school_id = $2 AND month_year = $3',
    p_metric
  ) USING v_new_usage, p_school_id, v_month_year;
  
  v_result := jsonb_build_object(
    'allowed', true,
    'current_usage', v_new_usage,
    'limit', p_limit,
    'remaining', CASE WHEN p_limit >= 0 THEN p_limit - v_new_usage ELSE -1 END
  );
  
  RETURN v_result;
END;
$$;
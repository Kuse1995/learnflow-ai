-- ============================================================================
-- SERVICE_ROLE ENFORCEMENT: Restrict sensitive AI operations
-- ============================================================================

-- Create a function to check if the current role is service_role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
$$;

-- Grant execute to all (needed for RLS policy checks)
GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, anon;

-- ============================================================================
-- STUDENT LEARNING PROFILES - Service role write only
-- ============================================================================

-- Enable RLS if not already
ALTER TABLE public.student_learning_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing write policies if any
DROP POLICY IF EXISTS "Service role can insert learning profiles" ON public.student_learning_profiles;
DROP POLICY IF EXISTS "Service role can update learning profiles" ON public.student_learning_profiles;
DROP POLICY IF EXISTS "Service role can delete learning profiles" ON public.student_learning_profiles;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to learning profiles"
ON public.student_learning_profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to learning profiles"
ON public.student_learning_profiles
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to learning profiles"
ON public.student_learning_profiles
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- STUDENT INTERVENTION PLANS - Service role generation only
-- ============================================================================

ALTER TABLE public.student_intervention_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to intervention plans" ON public.student_intervention_plans;
DROP POLICY IF EXISTS "Teachers can update intervention plans" ON public.student_intervention_plans;
DROP POLICY IF EXISTS "Deny client deletes to intervention plans" ON public.student_intervention_plans;

-- Only service_role can INSERT (generate new plans)
CREATE POLICY "Deny client inserts to intervention plans"
ON public.student_intervention_plans
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Teachers can UPDATE (acknowledge) but not create
CREATE POLICY "Teachers can update intervention plans"
ON public.student_intervention_plans
FOR UPDATE
TO authenticated
USING (
  public.can_access_student(auth.uid(), student_id)
)
WITH CHECK (
  public.can_access_student(auth.uid(), student_id)
);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to intervention plans"
ON public.student_intervention_plans
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- PARENT INSIGHT SUMMARIES - Service role generation only
-- ============================================================================

ALTER TABLE public.parent_insight_summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to parent insights" ON public.parent_insight_summaries;
DROP POLICY IF EXISTS "Teachers can update parent insights" ON public.parent_insight_summaries;
DROP POLICY IF EXISTS "Deny client deletes to parent insights" ON public.parent_insight_summaries;

-- Only service_role can INSERT (generate drafts)
CREATE POLICY "Deny client inserts to parent insights"
ON public.parent_insight_summaries
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Teachers can UPDATE (approve) but not create
CREATE POLICY "Teachers can update parent insights"
ON public.parent_insight_summaries
FOR UPDATE
TO authenticated
USING (
  public.can_access_student(auth.uid(), student_id)
)
WITH CHECK (
  public.can_access_student(auth.uid(), student_id)
);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to parent insights"
ON public.parent_insight_summaries
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- UPLOAD ANALYSES - Service role write only
-- ============================================================================

ALTER TABLE public.upload_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to upload analyses" ON public.upload_analyses;
DROP POLICY IF EXISTS "Deny client updates to upload analyses" ON public.upload_analyses;
DROP POLICY IF EXISTS "Deny client deletes to upload analyses" ON public.upload_analyses;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to upload analyses"
ON public.upload_analyses
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to upload analyses"
ON public.upload_analyses
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to upload analyses"
ON public.upload_analyses
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- AI ACTION TRACES (diagnostics) - Service role write only
-- ============================================================================

ALTER TABLE public.ai_action_traces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to ai action traces" ON public.ai_action_traces;
DROP POLICY IF EXISTS "Deny client updates to ai action traces" ON public.ai_action_traces;
DROP POLICY IF EXISTS "Deny client deletes to ai action traces" ON public.ai_action_traces;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to ai action traces"
ON public.ai_action_traces
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to ai action traces"
ON public.ai_action_traces
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to ai action traces"
ON public.ai_action_traces
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- AI ABUSE ATTEMPTS (security logging) - Service role write only
-- ============================================================================

ALTER TABLE public.ai_abuse_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to ai abuse attempts" ON public.ai_abuse_attempts;
DROP POLICY IF EXISTS "Deny client updates to ai abuse attempts" ON public.ai_abuse_attempts;
DROP POLICY IF EXISTS "Deny client deletes to ai abuse attempts" ON public.ai_abuse_attempts;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to ai abuse attempts"
ON public.ai_abuse_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to ai abuse attempts"
ON public.ai_abuse_attempts
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to ai abuse attempts"
ON public.ai_abuse_attempts
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- LESSON DIFFERENTIATION SUGGESTIONS - Service role write only
-- ============================================================================

ALTER TABLE public.lesson_differentiation_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to lesson suggestions" ON public.lesson_differentiation_suggestions;
DROP POLICY IF EXISTS "Deny client updates to lesson suggestions" ON public.lesson_differentiation_suggestions;
DROP POLICY IF EXISTS "Deny client deletes to lesson suggestions" ON public.lesson_differentiation_suggestions;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- STUDENT LEARNING PATHS - Service role write only
-- ============================================================================

ALTER TABLE public.student_learning_paths ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Deny client inserts to learning paths" ON public.student_learning_paths;
DROP POLICY IF EXISTS "Deny client updates to learning paths" ON public.student_learning_paths;
DROP POLICY IF EXISTS "Deny client deletes to learning paths" ON public.student_learning_paths;

-- Only service_role can INSERT
CREATE POLICY "Deny client inserts to learning paths"
ON public.student_learning_paths
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Only service_role can UPDATE
CREATE POLICY "Deny client updates to learning paths"
ON public.student_learning_paths
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Only service_role can DELETE
CREATE POLICY "Deny client deletes to learning paths"
ON public.student_learning_paths
FOR DELETE
TO authenticated, anon
USING (false);

-- ============================================================================
-- Comment explaining the security model
-- ============================================================================
COMMENT ON FUNCTION public.is_service_role() IS 
'Checks if the current connection is using service_role. 
Used for RLS policies to restrict write access to AI-generated data.
Client-side keys (anon/authenticated) cannot bypass these restrictions.
Only edge functions running with service_role can write to these tables.';
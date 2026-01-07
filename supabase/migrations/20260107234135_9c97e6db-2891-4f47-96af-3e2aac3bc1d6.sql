-- FIX: Recreate can_access_class with proper UUID handling
DROP FUNCTION IF EXISTS public.can_access_class(UUID, UUID);

CREATE OR REPLACE FUNCTION public.can_access_class(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN := false;
  v_school_id UUID;
  v_teacher_id UUID;
BEGIN
  -- Get class info
  SELECT school_id, teacher_id INTO v_school_id, v_teacher_id
  FROM public.classes
  WHERE id = _class_id;
  
  -- Check if user is the teacher
  IF v_teacher_id = _user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user is school admin
  IF public.has_school_role(_user_id, 'school_admin'::app_role, v_school_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user is platform admin
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate dependent function
DROP FUNCTION IF EXISTS public.can_access_student(UUID, UUID);

CREATE OR REPLACE FUNCTION public.can_access_student(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
BEGIN
  SELECT class_id INTO v_class_id
  FROM public.students
  WHERE id = _student_id;
  
  RETURN public.can_access_class(_user_id, v_class_id);
END;
$$;

-- Create security events table if not exists
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view security events" ON public.security_events;
CREATE POLICY "Platform admins can view security events"
  ON public.security_events FOR SELECT
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "System can insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);

-- AI abuse tracking table
CREATE TABLE IF NOT EXISTS public.ai_abuse_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  class_id UUID REFERENCES public.classes(id),
  feature_type TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  input_hash TEXT,
  blocked BOOLEAN DEFAULT true,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_abuse_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view abuse attempts" ON public.ai_abuse_attempts;
CREATE POLICY "Platform admins can view abuse attempts"
  ON public.ai_abuse_attempts FOR SELECT
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert abuse attempts" ON public.ai_abuse_attempts;
CREATE POLICY "System can insert abuse attempts"
  ON public.ai_abuse_attempts FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_abuse_user ON public.ai_abuse_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_abuse_type ON public.ai_abuse_attempts(attempt_type);
CREATE INDEX IF NOT EXISTS idx_ai_abuse_created ON public.ai_abuse_attempts(created_at DESC);

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  feature_type TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  limit_type TEXT NOT NULL,
  current_count INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view rate limit violations" ON public.rate_limit_violations;
CREATE POLICY "Platform admins can view rate limit violations"
  ON public.rate_limit_violations FOR SELECT
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert rate limit violations" ON public.rate_limit_violations;
CREATE POLICY "System can insert rate limit violations"
  ON public.rate_limit_violations FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON public.rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_feature ON public.rate_limit_violations(feature_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created ON public.rate_limit_violations(created_at DESC);
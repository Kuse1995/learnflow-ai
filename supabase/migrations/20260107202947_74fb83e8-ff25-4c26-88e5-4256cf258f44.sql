-- Create enum for confidence trend
CREATE TYPE public.confidence_trend AS ENUM ('increasing', 'stable', 'declining');

-- Create student learning profiles table
CREATE TABLE public.student_learning_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  strengths text,
  weak_topics text[] DEFAULT '{}',
  error_patterns jsonb DEFAULT '{"conceptual": 0, "procedural": 0, "language": 0, "careless": 0}'::jsonb,
  confidence_trend confidence_trend DEFAULT 'stable',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_learning_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Teachers and admins can read profiles (students cannot)
-- Note: Will be refined when role-based auth is implemented
CREATE POLICY "Teachers can view learning profiles"
ON public.student_learning_profiles
FOR SELECT
TO authenticated
USING (true);

-- RLS: Only service role (AI agents via edge functions) can modify
-- No direct client modifications allowed
CREATE POLICY "AI agents can manage learning profiles"
ON public.student_learning_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for student lookups
CREATE INDEX idx_student_learning_profiles_student_id ON public.student_learning_profiles(student_id);

-- Add trigger for last_updated
CREATE TRIGGER update_student_learning_profiles_last_updated
  BEFORE UPDATE ON public.student_learning_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add table comment
COMMENT ON TABLE public.student_learning_profiles IS 'Persistent AI memory for understanding each student learning state. Updated only by AI agents, readable by teachers/admins.';
COMMENT ON COLUMN public.student_learning_profiles.error_patterns IS 'Structured categories: conceptual, procedural, language, careless';
COMMENT ON COLUMN public.student_learning_profiles.weak_topics IS 'Array of topic identifiers where student struggles';
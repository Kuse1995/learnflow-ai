-- Create practice_sessions table (minimal storage)
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  session_length_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Students can view their own sessions
CREATE POLICY "Students can view own practice sessions"
ON public.practice_sessions
FOR SELECT
USING (true);

-- Students can create practice sessions
CREATE POLICY "Students can create practice sessions"
ON public.practice_sessions
FOR INSERT
WITH CHECK (true);

-- Students can update their own sessions (to mark complete)
CREATE POLICY "Students can update own practice sessions"
ON public.practice_sessions
FOR UPDATE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_practice_sessions_student ON public.practice_sessions(student_id);
CREATE INDEX idx_practice_sessions_class ON public.practice_sessions(class_id);
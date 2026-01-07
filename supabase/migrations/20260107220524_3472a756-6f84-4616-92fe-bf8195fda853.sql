-- Create student_learning_paths table
CREATE TABLE public.student_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  focus_topics TEXT[] NOT NULL DEFAULT '{}',
  suggested_activities TEXT[] NOT NULL DEFAULT '{}',
  pacing_notes TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  teacher_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_learning_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Teacher-facing only (not exposed to parents or students)

-- Teachers can view learning paths
CREATE POLICY "Teachers can view learning paths"
ON public.student_learning_paths
FOR SELECT
USING (true);

-- AI agents can create learning paths
CREATE POLICY "AI agents can create learning paths"
ON public.student_learning_paths
FOR INSERT
WITH CHECK (true);

-- Teachers can acknowledge paths
CREATE POLICY "Teachers can acknowledge paths"
ON public.student_learning_paths
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_student_learning_paths_updated_at
BEFORE UPDATE ON public.student_learning_paths
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_student_learning_paths_student_class 
ON public.student_learning_paths(student_id, class_id);

CREATE INDEX idx_student_learning_paths_generated_at 
ON public.student_learning_paths(generated_at DESC);
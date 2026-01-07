-- Create table for lesson differentiation suggestions
CREATE TABLE public.lesson_differentiation_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_topic TEXT NOT NULL,
  lesson_objective TEXT NOT NULL,
  lesson_duration_minutes INTEGER,
  core_lesson_flow TEXT[] NOT NULL DEFAULT '{}',
  optional_variations TEXT[] NOT NULL DEFAULT '{}',
  extension_opportunities TEXT[] NOT NULL DEFAULT '{}',
  support_strategies TEXT[] NOT NULL DEFAULT '{}',
  materials_needed TEXT[] DEFAULT '{}',
  teacher_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_differentiation_suggestions ENABLE ROW LEVEL SECURITY;

-- Teachers can view all suggestions
CREATE POLICY "Teachers can view lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR SELECT
USING (true);

-- AI agents can create suggestions
CREATE POLICY "AI agents can create lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR INSERT
WITH CHECK (true);

-- Teachers can accept suggestions (update teacher_accepted)
CREATE POLICY "Teachers can update lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Teachers can delete suggestions
CREATE POLICY "Teachers can delete lesson suggestions"
ON public.lesson_differentiation_suggestions
FOR DELETE
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_lesson_differentiation_suggestions_updated_at
BEFORE UPDATE ON public.lesson_differentiation_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.lesson_differentiation_suggestions IS 'AI-generated lesson differentiation suggestions for teachers. Teacher review required before use.';
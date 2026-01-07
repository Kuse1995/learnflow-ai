-- Create lesson_resources table for resource attachments
CREATE TABLE public.lesson_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lesson_differentiation_suggestions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'pdf', 'slides', 'link')),
  url TEXT NOT NULL,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Teachers can view lesson resources
CREATE POLICY "Teachers can view lesson resources"
ON public.lesson_resources
FOR SELECT
USING (true);

-- Teachers can create lesson resources
CREATE POLICY "Teachers can create lesson resources"
ON public.lesson_resources
FOR INSERT
WITH CHECK (true);

-- Teachers can delete lesson resources
CREATE POLICY "Teachers can delete lesson resources"
ON public.lesson_resources
FOR DELETE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_lesson_resources_lesson_id ON public.lesson_resources(lesson_id);
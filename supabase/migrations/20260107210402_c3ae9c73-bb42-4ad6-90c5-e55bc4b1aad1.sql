-- Create teacher action log table
CREATE TABLE public.teacher_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  topic TEXT,
  action_taken TEXT NOT NULL,
  reflection_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teacher_action_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view action logs"
ON public.teacher_action_logs
FOR SELECT
USING (true);

CREATE POLICY "Teachers can create action logs"
ON public.teacher_action_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teachers can update their action logs"
ON public.teacher_action_logs
FOR UPDATE
USING (true);

CREATE POLICY "Teachers can delete their action logs"
ON public.teacher_action_logs
FOR DELETE
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_teacher_action_logs_class_id ON public.teacher_action_logs(class_id);
CREATE INDEX idx_teacher_action_logs_upload_id ON public.teacher_action_logs(upload_id);
CREATE INDEX idx_teacher_action_logs_created_at ON public.teacher_action_logs(created_at DESC);
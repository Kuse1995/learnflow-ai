-- Create parent_insight_summaries table
CREATE TABLE public.parent_insight_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  source_analysis_ids UUID[] DEFAULT '{}',
  summary_text TEXT NOT NULL,
  home_support_tips TEXT[] DEFAULT '{}',
  teacher_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.parent_insight_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Teachers can view all summaries"
ON public.parent_insight_summaries
FOR SELECT
USING (true);

CREATE POLICY "Teachers can manage draft summaries"
ON public.parent_insight_summaries
FOR ALL
USING (teacher_approved = false)
WITH CHECK (true);

CREATE POLICY "AI agents can create summaries"
ON public.parent_insight_summaries
FOR INSERT
WITH CHECK (teacher_approved = false);

CREATE POLICY "Parents can view approved summaries only"
ON public.parent_insight_summaries
FOR SELECT
USING (teacher_approved = true);

-- Add trigger for updated_at
CREATE TRIGGER update_parent_insight_summaries_updated_at
BEFORE UPDATE ON public.parent_insight_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
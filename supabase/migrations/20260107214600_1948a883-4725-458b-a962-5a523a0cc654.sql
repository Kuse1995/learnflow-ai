-- Create student_intervention_plans table
CREATE TABLE public.student_intervention_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  recommended_practice_types TEXT[] NOT NULL DEFAULT '{}',
  support_strategies TEXT[] NOT NULL DEFAULT '{}',
  confidence_support_notes TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_window_days INTEGER NOT NULL DEFAULT 30,
  teacher_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_intervention_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Teachers can view intervention plans"
ON public.student_intervention_plans
FOR SELECT
USING (true);

CREATE POLICY "AI agents can create intervention plans"
ON public.student_intervention_plans
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teachers can acknowledge plans"
ON public.student_intervention_plans
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_student_intervention_plans_updated_at
BEFORE UPDATE ON public.student_intervention_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
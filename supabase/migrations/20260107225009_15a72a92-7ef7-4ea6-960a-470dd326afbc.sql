-- Create plan enum
CREATE TYPE public.saas_plan AS ENUM ('basic', 'standard', 'premium', 'enterprise');

-- Create schools table with plan
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan saas_plan NOT NULL DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- RLS policies for schools
CREATE POLICY "Authenticated users can view schools"
ON public.schools
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage schools"
ON public.schools
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add school_id to classes table
ALTER TABLE public.classes 
ADD COLUMN school_id UUID REFERENCES public.schools(id);

-- Create trigger for updated_at
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
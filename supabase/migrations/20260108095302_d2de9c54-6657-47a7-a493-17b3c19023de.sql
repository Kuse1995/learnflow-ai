-- Add is_demo column to schools table for demo school isolation
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create index for efficient demo school filtering
CREATE INDEX IF NOT EXISTS idx_schools_is_demo ON public.schools(is_demo);

-- Insert the demo school
INSERT INTO public.schools (
  name,
  plan,
  billing_status,
  billing_start_date,
  is_demo,
  is_archived
) VALUES (
  'North Park School (Demo)',
  'premium',
  'active',
  CURRENT_DATE,
  true,
  false
);

-- Add comment for documentation
COMMENT ON COLUMN public.schools.is_demo IS 'Indicates if this is a demo school for testing/demonstration purposes. Demo data should be isolated from real schools.';
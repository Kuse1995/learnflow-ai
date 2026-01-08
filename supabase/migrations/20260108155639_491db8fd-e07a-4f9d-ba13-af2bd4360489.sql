-- Add country and timezone to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Zambia';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Lusaka';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_code TEXT;

-- Create school_subjects table for school-specific subjects
CREATE TABLE IF NOT EXISTS public.school_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT, -- e.g., 'core', 'elective', 'vocational'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(school_id, name)
);

-- Enable RLS on school_subjects
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_subjects
CREATE POLICY "school_subjects_select" ON public.school_subjects
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND school_id = school_subjects.school_id
    )
  );

CREATE POLICY "school_subjects_insert" ON public.school_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND school_id = school_subjects.school_id 
        AND role = 'school_admin'
    )
  );

CREATE POLICY "school_subjects_update" ON public.school_subjects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND school_id = school_subjects.school_id 
        AND role = 'school_admin'
    )
  );

CREATE POLICY "school_subjects_delete" ON public.school_subjects
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND school_id = school_subjects.school_id 
        AND role = 'school_admin'
    )
  );

-- Seed common Zambian curriculum subjects
INSERT INTO public.school_subjects (school_id, name, code, category, sort_order)
SELECT s.id, subj.name, subj.code, subj.category, subj.sort_order
FROM public.schools s
CROSS JOIN (VALUES
  ('Mathematics', 'MATH', 'core', 1),
  ('English', 'ENG', 'core', 2),
  ('Science', 'SCI', 'core', 3),
  ('Social Studies', 'SS', 'core', 4),
  ('Creative Arts', 'CA', 'elective', 5),
  ('Physical Education', 'PE', 'elective', 6),
  ('Religious Education', 'RE', 'elective', 7),
  ('Local Language', 'LL', 'elective', 8),
  ('Technology Studies', 'TECH', 'elective', 9),
  ('Home Economics', 'HE', 'vocational', 10)
) AS subj(name, code, category, sort_order)
ON CONFLICT (school_id, name) DO NOTHING;
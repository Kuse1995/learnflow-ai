-- Create student_guardians linking table for parent-student relationships
CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL, -- References demo_users or real user
  guardian_type text NOT NULL DEFAULT 'parent', -- parent, guardian, other
  relationship text, -- mother, father, guardian, etc.
  is_primary boolean DEFAULT false,
  is_demo boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, guardian_id)
);

-- Enable RLS
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- Parents can view their own guardian links
CREATE POLICY "Guardians can view their links"
  ON public.student_guardians FOR SELECT
  TO authenticated
  USING (guardian_id = auth.uid() OR is_demo = true);

-- Teachers can view guardian links for their students
CREATE POLICY "Teachers can view student guardians"
  ON public.student_guardians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = student_guardians.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Service role manages all
CREATE POLICY "Service role manages guardians"
  ON public.student_guardians FOR ALL
  TO service_role
  USING (true);

-- Add subject column to classes if not exists
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject text;

-- Add is_demo column to classes for demo isolation
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Add is_demo column to students for demo isolation  
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create demo class: Grade 5A Mathematics
INSERT INTO public.classes (id, name, grade, subject, school_id, teacher_id, is_demo) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Grade 5A', '5', 'Mathematics', '5e508bfd-bd20-4461-8687-450a450111b8', NULL, true);

-- Create 3 demo students linked to Grade 5A
INSERT INTO public.students (id, student_id, name, class_id, is_demo) VALUES
  ('11111111-1111-1111-1111-111111111111', 'DEMO-001', 'Chanda Mwila', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
  ('22222222-2222-2222-2222-222222222222', 'DEMO-002', 'Luyando Phiri', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
  ('33333333-3333-3333-3333-333333333333', 'DEMO-003', 'Tinashe Zulu', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true);

-- Link parent Mr. Mwila to student Chanda Mwila only
INSERT INTO public.student_guardians (student_id, guardian_id, guardian_type, relationship, is_primary, is_demo) VALUES
  ('11111111-1111-1111-1111-111111111111', '8fda097c-a140-4b12-8f09-31df77373e51', 'parent', 'father', true, true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_demo ON public.classes(is_demo);
CREATE INDEX IF NOT EXISTS idx_students_is_demo ON public.students(is_demo);

-- Add comments
COMMENT ON TABLE public.student_guardians IS 'Links students to their parents/guardians';
COMMENT ON COLUMN public.classes.is_demo IS 'Indicates demo class for demonstration purposes';
COMMENT ON COLUMN public.students.is_demo IS 'Indicates demo student for demonstration purposes';
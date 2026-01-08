-- Create student_diagnostics table
CREATE TABLE IF NOT EXISTS public.student_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES public.uploads(id) ON DELETE SET NULL,
  observation_type text NOT NULL,
  observation text NOT NULL,
  subject text,
  topic text,
  confidence_level text,
  evidence_date date NOT NULL DEFAULT CURRENT_DATE,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_diagnostics ENABLE ROW LEVEL SECURITY;

-- Teachers can view diagnostics for their students
CREATE POLICY "Teachers view student diagnostics"
  ON public.student_diagnostics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = student_diagnostics.student_id
        AND c.teacher_id = auth.uid()
    )
    OR is_demo = true
  );

-- Service role manages all
CREATE POLICY "Service role manages diagnostics"
  ON public.student_diagnostics FOR ALL
  TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_diagnostics_student ON public.student_diagnostics(student_id);
CREATE INDEX IF NOT EXISTS idx_student_diagnostics_demo ON public.student_diagnostics(is_demo);
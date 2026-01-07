-- Create join table for upload-student associations
CREATE TABLE public.upload_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(upload_id, student_id)
);

-- Enable RLS
ALTER TABLE public.upload_students ENABLE ROW LEVEL SECURITY;

-- RLS policies matching uploads table
CREATE POLICY "Authenticated users can view upload_students"
ON public.upload_students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage upload_students"
ON public.upload_students
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add index for efficient student lookups
CREATE INDEX idx_upload_students_student_id ON public.upload_students(student_id);
CREATE INDEX idx_upload_students_upload_id ON public.upload_students(upload_id);

-- Add comment explaining the semantics
COMMENT ON TABLE public.upload_students IS 'Join table for upload-student associations. Empty association means upload applies to all students in the class.';
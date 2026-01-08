-- Add grade and school_id to students table for direct enrollment
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Update existing students to get school_id from their class
UPDATE public.students s
SET school_id = c.school_id
FROM public.classes c
WHERE s.class_id = c.id AND s.school_id IS NULL;

-- Create index for school-level queries
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);

-- Add RLS policy for school admins to manage students
CREATE POLICY "School admins can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.school_id = students.school_id
    AND ur.role IN ('school_admin', 'admin')
    AND ur.is_active = true
  )
);

CREATE POLICY "School admins can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.school_id = students.school_id
    AND ur.role IN ('school_admin', 'admin')
    AND ur.is_active = true
  )
);

CREATE POLICY "School admins can view all school students"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.school_id = students.school_id
    AND ur.role IN ('school_admin', 'admin')
    AND ur.is_active = true
  )
);
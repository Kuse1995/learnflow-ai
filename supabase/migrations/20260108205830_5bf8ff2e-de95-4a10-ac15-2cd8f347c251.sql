-- Drop the existing admin policy that has incorrect logic
DROP POLICY IF EXISTS "admins_manage_links" ON guardian_student_links;

-- Create a new policy that allows school admins to manage guardian links
-- for any student in their school (not just students assigned to classes)
CREATE POLICY "admins_manage_links" ON guardian_student_links
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN user_roles ur ON s.school_id = ur.school_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id FROM students s
    JOIN user_roles ur ON s.school_id = ur.school_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
  )
);
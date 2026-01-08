-- Add delete_demo_school function for complete demo school removal
CREATE OR REPLACE FUNCTION public.delete_demo_school(target_school_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_target_demo boolean;
BEGIN
  -- Verify the school is actually a demo school
  SELECT is_demo INTO is_target_demo
  FROM schools
  WHERE id = target_school_id;

  IF is_target_demo IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'School not found'
    );
  END IF;

  IF is_target_demo = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete non-demo school with this function'
    );
  END IF;

  -- Delete in proper order respecting foreign keys
  DELETE FROM parent_insight_summaries WHERE student_id IN (SELECT id FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM adaptive_support_plans WHERE student_id IN (SELECT id FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM student_diagnostics WHERE student_id IN (SELECT id FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM student_learning_profiles WHERE student_id IN (SELECT id FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM upload_analyses WHERE upload_id IN (SELECT id FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id);
  DELETE FROM teacher_action_logs WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id);
  DELETE FROM attendance_records WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id);
  DELETE FROM student_guardians WHERE student_id IN (SELECT id FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id));
  DELETE FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = target_school_id);
  DELETE FROM classes WHERE school_id = target_school_id;
  DELETE FROM demo_users WHERE school_id = target_school_id;
  DELETE FROM schools WHERE id = target_school_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Demo school and all linked data permanently deleted',
    'deleted_at', now()
  );
END;
$$;

-- Restrict execution to service_role only
REVOKE EXECUTE ON FUNCTION public.delete_demo_school(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_demo_school(uuid) FROM authenticated;

COMMENT ON FUNCTION public.delete_demo_school(uuid) IS 'Permanently deletes a demo school and all linked records. Service role only.';
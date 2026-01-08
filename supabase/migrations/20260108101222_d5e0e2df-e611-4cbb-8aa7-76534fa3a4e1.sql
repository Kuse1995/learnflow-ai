-- Demo Safety Controls: Prevent demo data from affecting production systems

-- 1. Create function to check if data is demo (reusable across triggers)
CREATE OR REPLACE FUNCTION public.is_demo_record(record_id uuid, table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE table_name
    WHEN 'students' THEN
      RETURN EXISTS (SELECT 1 FROM students WHERE id = record_id AND is_demo = true);
    WHEN 'classes' THEN
      RETURN EXISTS (SELECT 1 FROM classes WHERE id = record_id AND is_demo = true);
    WHEN 'schools' THEN
      RETURN EXISTS (SELECT 1 FROM schools WHERE id = record_id AND is_demo = true);
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 2. Create trigger function to block demo data from notification queues
CREATE OR REPLACE FUNCTION public.block_demo_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if related student is demo
  IF NEW.student_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM students WHERE id = NEW.student_id AND is_demo = true) THEN
      RAISE NOTICE 'Blocked notification for demo student %', NEW.student_id;
      RETURN NULL; -- Silently reject the insert
    END IF;
  END IF;
  
  -- Check if related class is demo
  IF NEW.class_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM classes WHERE id = NEW.class_id AND is_demo = true) THEN
      RAISE NOTICE 'Blocked notification for demo class %', NEW.class_id;
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Apply trigger to parent_messages (notification queue)
DROP TRIGGER IF EXISTS block_demo_parent_messages ON public.parent_messages;
CREATE TRIGGER block_demo_parent_messages
  BEFORE INSERT ON public.parent_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.block_demo_notifications();

-- 4. Create trigger function to block demo data from analytics events
CREATE OR REPLACE FUNCTION public.block_demo_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if school is demo
  IF NEW.school_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM schools WHERE id = NEW.school_id AND is_demo = true) THEN
      RAISE NOTICE 'Blocked analytics event for demo school %', NEW.school_id;
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Apply trigger to feature_adoption_events (analytics)
DROP TRIGGER IF EXISTS block_demo_feature_adoption ON public.feature_adoption_events;
CREATE TRIGGER block_demo_feature_adoption
  BEFORE INSERT ON public.feature_adoption_events
  FOR EACH ROW
  EXECUTE FUNCTION public.block_demo_analytics();

-- 6. Create admin function to reset all demo data
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_counts jsonb;
BEGIN
  -- Delete in proper order respecting foreign keys
  DELETE FROM public.parent_insight_summaries WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
  DELETE FROM public.adaptive_support_plans WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
  DELETE FROM public.student_diagnostics WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
  DELETE FROM public.student_learning_profiles WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
  DELETE FROM public.upload_analyses WHERE upload_id IN (SELECT id FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE is_demo = true));
  DELETE FROM public.uploads WHERE class_id IN (SELECT id FROM classes WHERE is_demo = true);
  DELETE FROM public.teacher_action_logs WHERE class_id IN (SELECT id FROM classes WHERE is_demo = true);
  DELETE FROM public.attendance_records WHERE class_id IN (SELECT id FROM classes WHERE is_demo = true);
  DELETE FROM public.student_guardians WHERE is_demo = true;
  DELETE FROM public.students WHERE is_demo = true;
  DELETE FROM public.classes WHERE is_demo = true;
  DELETE FROM public.demo_users WHERE school_id IN (SELECT id FROM schools WHERE is_demo = true);
  -- Note: We keep the demo school itself for re-seeding
  
  deleted_counts := jsonb_build_object(
    'status', 'success',
    'message', 'Demo data has been reset. Demo school preserved for re-seeding.',
    'reset_at', now()
  );
  
  RETURN deleted_counts;
END;
$$;

-- 7. Create RLS policy for admin-only demo reset
-- Only service_role or super_admins can execute reset_demo_data
REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM authenticated;

-- 8. Create view to list all demo data for admin visibility
CREATE OR REPLACE VIEW public.demo_data_summary AS
SELECT 
  'schools' as table_name,
  COUNT(*) as record_count
FROM schools WHERE is_demo = true
UNION ALL
SELECT 'classes', COUNT(*) FROM classes WHERE is_demo = true
UNION ALL
SELECT 'students', COUNT(*) FROM students WHERE is_demo = true
UNION ALL
SELECT 'demo_users', COUNT(*) FROM demo_users
UNION ALL
SELECT 'teacher_action_logs', COUNT(*) FROM teacher_action_logs WHERE is_demo = true
UNION ALL
SELECT 'adaptive_support_plans', COUNT(*) FROM adaptive_support_plans WHERE is_demo = true
UNION ALL
SELECT 'student_diagnostics', COUNT(*) FROM student_diagnostics WHERE is_demo = true;

-- Grant view access to authenticated users (admins can see counts)
GRANT SELECT ON public.demo_data_summary TO authenticated;

COMMENT ON FUNCTION public.reset_demo_data() IS 'Resets all demo data while preserving the demo school for re-seeding. Service role only.';
COMMENT ON FUNCTION public.block_demo_notifications() IS 'Trigger function that silently blocks demo data from entering notification queues.';
COMMENT ON FUNCTION public.block_demo_analytics() IS 'Trigger function that silently blocks demo data from analytics events.';
COMMENT ON VIEW public.demo_data_summary IS 'Summary view of all demo data counts for admin oversight.';
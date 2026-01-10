
-- Drop and recreate the hard_delete_school_cascade function with view-safety and future-proofing
CREATE OR REPLACE FUNCTION public.hard_delete_school_cascade(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_ids uuid[];
  v_student_ids uuid[];
  v_guardian_ids uuid[];
  v_table_record RECORD;
  v_delete_sql text;
  v_phase text := 'INIT';
BEGIN
  -- Phase 1: Cache all related IDs upfront
  v_phase := 'CACHE_IDS';
  
  SELECT COALESCE(array_agg(id), '{}') INTO v_class_ids
  FROM classes WHERE school_id = p_school_id;
  
  SELECT COALESCE(array_agg(id), '{}') INTO v_student_ids
  FROM students WHERE school_id = p_school_id;
  
  SELECT COALESCE(array_agg(DISTINCT gs.guardian_id), '{}') INTO v_guardian_ids
  FROM guardian_student_links gs
  WHERE gs.student_id = ANY(v_student_ids);

  -- Phase 2: Explicit deletes for tables requiring special handling (joins, no direct FK)
  v_phase := 'EXPLICIT_DELETES';
  
  -- Payment-related (deep nesting)
  DELETE FROM payment_installment_allocations 
  WHERE installment_id IN (
    SELECT id FROM payment_plan_installments 
    WHERE plan_id IN (SELECT id FROM payment_plans WHERE school_id = p_school_id)
  );
  
  DELETE FROM payment_plan_installments 
  WHERE plan_id IN (SELECT id FROM payment_plans WHERE school_id = p_school_id);
  
  DELETE FROM payment_plans WHERE school_id = p_school_id;
  
  -- Message-related (deep nesting)
  DELETE FROM message_edit_history 
  WHERE message_id IN (SELECT id FROM parent_messages WHERE school_id = p_school_id);
  
  DELETE FROM delivery_attempts 
  WHERE message_id IN (SELECT id FROM parent_messages WHERE school_id = p_school_id);
  
  DELETE FROM parent_messages WHERE school_id = p_school_id;
  
  -- Guardian-related
  DELETE FROM guardian_phone_registry WHERE guardian_id = ANY(v_guardian_ids);
  DELETE FROM guardian_student_links WHERE student_id = ANY(v_student_ids);
  DELETE FROM guardian_link_retention WHERE school_id = p_school_id;
  DELETE FROM guardian_link_incidents WHERE school_id = p_school_id;
  DELETE FROM guardian_link_requests WHERE school_id = p_school_id;
  DELETE FROM guardian_link_audit_log WHERE student_id = ANY(v_student_ids);
  DELETE FROM guardians WHERE id = ANY(v_guardian_ids);
  
  -- Restore requests (references backup_snapshots)
  DELETE FROM restore_requests WHERE school_id = p_school_id;
  
  -- Phase 3: Auto-delete from ALL base tables with school_id, class_id, or student_id
  v_phase := 'AUTO_DELETE_SWEEP';
  
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN (
        -- Skip tables we handle explicitly or at the end
        'schools', 'classes', 'students', 'user_roles', 'school_subscriptions',
        'payment_plan_installments', 'payment_installment_allocations', 'payment_plans',
        'message_edit_history', 'delivery_attempts', 'parent_messages',
        'guardian_phone_registry', 'guardian_student_links', 'guardian_link_retention',
        'guardian_link_incidents', 'guardian_link_requests', 'guardian_link_audit_log',
        'guardians', 'restore_requests',
        -- Skip system/config tables
        'super_admins', 'demo_super_admins', 'feature_flags', 'app_versions',
        'deployment_checks', 'error_codes', 'plans'
      )
  LOOP
    -- Try deleting by school_id first
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = v_table_record.table_name 
        AND column_name = 'school_id'
    ) THEN
      v_delete_sql := format('DELETE FROM public.%I WHERE school_id = $1', v_table_record.table_name);
      EXECUTE v_delete_sql USING p_school_id;
    -- Then try by class_id
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = v_table_record.table_name 
        AND column_name = 'class_id'
    ) THEN
      v_delete_sql := format('DELETE FROM public.%I WHERE class_id = ANY($1)', v_table_record.table_name);
      EXECUTE v_delete_sql USING v_class_ids;
    -- Finally try by student_id
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = v_table_record.table_name 
        AND column_name = 'student_id'
    ) THEN
      v_delete_sql := format('DELETE FROM public.%I WHERE student_id = ANY($1)', v_table_record.table_name);
      EXECUTE v_delete_sql USING v_student_ids;
    END IF;
  END LOOP;

  -- Phase 4: Delete core entities in correct order
  v_phase := 'DELETE_STUDENTS';
  DELETE FROM students WHERE school_id = p_school_id;
  
  v_phase := 'DELETE_CLASSES';
  DELETE FROM classes WHERE school_id = p_school_id;
  
  v_phase := 'DELETE_USER_ROLES';
  DELETE FROM user_roles WHERE school_id = p_school_id;
  
  v_phase := 'DELETE_SUBSCRIPTIONS';
  DELETE FROM school_subscriptions WHERE school_id = p_school_id;
  
  v_phase := 'DELETE_SCHOOL';
  DELETE FROM schools WHERE id = p_school_id;

EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'hard_delete_school_cascade failed during [%]: %', v_phase, SQLERRM;
END;
$$;

-- Step 1: Fix platform_audit_logs foreign keys to ON DELETE SET NULL
-- Drop and recreate target_subscription_id FK
ALTER TABLE public.platform_audit_logs 
DROP CONSTRAINT IF EXISTS platform_audit_logs_target_subscription_id_fkey;

ALTER TABLE public.platform_audit_logs
ADD CONSTRAINT platform_audit_logs_target_subscription_id_fkey 
FOREIGN KEY (target_subscription_id) REFERENCES public.school_subscriptions(id) ON DELETE SET NULL;

-- Drop and recreate target_school_id FK
ALTER TABLE public.platform_audit_logs 
DROP CONSTRAINT IF EXISTS platform_audit_logs_target_school_id_fkey;

ALTER TABLE public.platform_audit_logs
ADD CONSTRAINT platform_audit_logs_target_school_id_fkey 
FOREIGN KEY (target_school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

-- Step 2: Replace hard_delete_school_cascade with improved version
CREATE OR REPLACE FUNCTION public.hard_delete_school_cascade(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_class_ids uuid[];
  v_student_ids uuid[];
  v_guardian_ids uuid[];
  v_subscription_ids uuid[];
  v_phase text := 'INIT';
  v_table_name text;
  v_sql text;
  v_has_school_id boolean;
  v_has_target_school_id boolean;
  v_has_class_id boolean;
  v_has_target_class_id boolean;
  v_has_student_id boolean;
  v_has_target_student_id boolean;
BEGIN
  -- Verify school exists
  IF NOT EXISTS (SELECT 1 FROM schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'School with ID % does not exist', p_school_id;
  END IF;

  -- Cache IDs for efficient lookups
  v_phase := 'CACHE_IDS';
  SELECT array_agg(id) INTO v_class_ids FROM classes WHERE school_id = p_school_id;
  SELECT array_agg(id) INTO v_student_ids FROM students WHERE class_id = ANY(COALESCE(v_class_ids, ARRAY[]::uuid[]));
  SELECT array_agg(id) INTO v_subscription_ids FROM school_subscriptions WHERE school_id = p_school_id;
  
  SELECT array_agg(DISTINCT gsl.guardian_id) INTO v_guardian_ids
  FROM guardian_student_links gsl
  WHERE gsl.student_id = ANY(COALESCE(v_student_ids, ARRAY[]::uuid[]));

  -- Coalesce to empty arrays to prevent NULL issues
  v_class_ids := COALESCE(v_class_ids, ARRAY[]::uuid[]);
  v_student_ids := COALESCE(v_student_ids, ARRAY[]::uuid[]);
  v_guardian_ids := COALESCE(v_guardian_ids, ARRAY[]::uuid[]);
  v_subscription_ids := COALESCE(v_subscription_ids, ARRAY[]::uuid[]);

  -- Step A: Detach audit log references (so they don't block deletion)
  v_phase := 'DETACH_AUDIT_LOG_FKS';
  UPDATE platform_audit_logs SET target_subscription_id = NULL 
  WHERE target_subscription_id = ANY(v_subscription_ids);
  UPDATE platform_audit_logs SET target_school_id = NULL 
  WHERE target_school_id = p_school_id;

  -- Step B: Explicit deletes for nested/join tables
  v_phase := 'DELETE_PAYMENT_NESTED';
  DELETE FROM payment_installment_allocations WHERE installment_id IN (
    SELECT ppi.id FROM payment_plan_installments ppi
    JOIN student_payment_plans spp ON ppi.payment_plan_id = spp.id
    WHERE spp.school_id = p_school_id
  );
  DELETE FROM payment_plan_installments WHERE payment_plan_id IN (
    SELECT id FROM student_payment_plans WHERE school_id = p_school_id
  );

  v_phase := 'DELETE_MESSAGE_NESTED';
  DELETE FROM message_edit_history WHERE message_id IN (
    SELECT id FROM parent_messages WHERE school_id = p_school_id
  );
  DELETE FROM delivery_attempts WHERE message_id IN (
    SELECT id FROM parent_messages WHERE school_id = p_school_id
  );

  -- Step C: Delete restore_jobs (uses target_* columns)
  v_phase := 'DELETE_RESTORE_JOBS';
  DELETE FROM restore_jobs WHERE target_school_id = p_school_id;
  DELETE FROM restore_jobs WHERE target_class_id = ANY(v_class_ids);
  DELETE FROM restore_jobs WHERE target_student_id = ANY(v_student_ids);

  -- Step D: Auto-delete sweep for all base tables with school/class/student refs
  v_phase := 'AUTO_DELETE_SWEEP';
  FOR v_table_name IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('schools', 'classes', 'students', 'user_roles', 
                             'school_subscriptions', 'guardians', 'platform_audit_logs',
                             'restore_jobs', 'payment_plan_installments', 
                             'payment_installment_allocations', 'message_edit_history',
                             'delivery_attempts')
  LOOP
    -- Check which columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'school_id'
    ) INTO v_has_school_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'target_school_id'
    ) INTO v_has_target_school_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'class_id'
    ) INTO v_has_class_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'target_class_id'
    ) INTO v_has_target_class_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'student_id'
    ) INTO v_has_student_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'target_student_id'
    ) INTO v_has_target_student_id;

    -- Delete by school_id
    IF v_has_school_id THEN
      v_sql := format('DELETE FROM %I WHERE school_id = $1', v_table_name);
      EXECUTE v_sql USING p_school_id;
    END IF;
    
    -- Delete by target_school_id
    IF v_has_target_school_id THEN
      v_sql := format('DELETE FROM %I WHERE target_school_id = $1', v_table_name);
      EXECUTE v_sql USING p_school_id;
    END IF;

    -- Delete by class_id
    IF v_has_class_id AND array_length(v_class_ids, 1) > 0 THEN
      v_sql := format('DELETE FROM %I WHERE class_id = ANY($1)', v_table_name);
      EXECUTE v_sql USING v_class_ids;
    END IF;
    
    -- Delete by target_class_id
    IF v_has_target_class_id AND array_length(v_class_ids, 1) > 0 THEN
      v_sql := format('DELETE FROM %I WHERE target_class_id = ANY($1)', v_table_name);
      EXECUTE v_sql USING v_class_ids;
    END IF;

    -- Delete by student_id
    IF v_has_student_id AND array_length(v_student_ids, 1) > 0 THEN
      v_sql := format('DELETE FROM %I WHERE student_id = ANY($1)', v_table_name);
      EXECUTE v_sql USING v_student_ids;
    END IF;
    
    -- Delete by target_student_id
    IF v_has_target_student_id AND array_length(v_student_ids, 1) > 0 THEN
      v_sql := format('DELETE FROM %I WHERE target_student_id = ANY($1)', v_table_name);
      EXECUTE v_sql USING v_student_ids;
    END IF;
  END LOOP;

  -- Step E: Delete guardians (only if they have no other student links)
  v_phase := 'DELETE_ORPHAN_GUARDIANS';
  DELETE FROM guardians g
  WHERE g.id = ANY(v_guardian_ids)
    AND NOT EXISTS (
      SELECT 1 FROM guardian_student_links gsl
      WHERE gsl.guardian_id = g.id
        AND gsl.student_id != ALL(v_student_ids)
    );

  -- Step F: Delete core entities in correct order
  v_phase := 'DELETE_STUDENTS';
  DELETE FROM students WHERE id = ANY(v_student_ids);

  v_phase := 'DELETE_CLASSES';
  DELETE FROM classes WHERE id = ANY(v_class_ids);

  v_phase := 'DELETE_USER_ROLES';
  DELETE FROM user_roles WHERE school_id = p_school_id;

  v_phase := 'DELETE_SUBSCRIPTIONS';
  DELETE FROM school_subscriptions WHERE id = ANY(v_subscription_ids);

  v_phase := 'DELETE_SCHOOL';
  DELETE FROM schools WHERE id = p_school_id;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'hard_delete_school_cascade failed during [%]: %', v_phase, SQLERRM;
END;
$$;
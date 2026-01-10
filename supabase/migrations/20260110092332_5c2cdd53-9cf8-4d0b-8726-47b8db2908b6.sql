-- Drop existing function first (has different return type)
DROP FUNCTION IF EXISTS public.hard_delete_school_cascade(uuid);

-- Recreate with correct table names, existence guards, and proper student caching
CREATE FUNCTION public.hard_delete_school_cascade(p_school_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_name text;
  v_deleted_counts jsonb := '{}'::jsonb;
  v_table_name text;
  v_count bigint;
  v_phase text := 'INIT';
  v_class_ids uuid[];
  v_student_ids uuid[];
  v_guardian_ids uuid[];
  v_subscription_ids uuid[];
  v_plan_ids uuid[];
BEGIN
  -- Verify school exists
  SELECT name INTO v_school_name FROM schools WHERE id = p_school_id;
  IF v_school_name IS NULL THEN
    RAISE EXCEPTION 'School with ID % not found', p_school_id;
  END IF;

  -- Cache related IDs for efficient deletion
  v_phase := 'CACHE_IDS';
  
  SELECT array_agg(id) INTO v_class_ids FROM classes WHERE school_id = p_school_id;
  v_class_ids := COALESCE(v_class_ids, ARRAY[]::uuid[]);
  
  -- Cache students by school_id directly (not via class) to catch unassigned students
  SELECT array_agg(id) INTO v_student_ids FROM students WHERE school_id = p_school_id;
  v_student_ids := COALESCE(v_student_ids, ARRAY[]::uuid[]);
  
  SELECT array_agg(id) INTO v_guardian_ids FROM guardians WHERE school_id = p_school_id;
  v_guardian_ids := COALESCE(v_guardian_ids, ARRAY[]::uuid[]);
  
  SELECT array_agg(id) INTO v_subscription_ids FROM school_subscriptions WHERE school_id = p_school_id;
  v_subscription_ids := COALESCE(v_subscription_ids, ARRAY[]::uuid[]);

  -- Cache payment plan IDs
  SELECT array_agg(id) INTO v_plan_ids FROM payment_plans WHERE school_id = p_school_id;
  v_plan_ids := COALESCE(v_plan_ids, ARRAY[]::uuid[]);

  -- Detach audit log foreign keys (set to NULL instead of blocking delete)
  v_phase := 'DETACH_AUDIT_LOG_FKS';
  UPDATE platform_audit_logs SET target_subscription_id = NULL 
    WHERE target_subscription_id = ANY(v_subscription_ids);
  UPDATE platform_audit_logs SET target_school_id = NULL 
    WHERE target_school_id = p_school_id;

  -- Delete payment-related nested tables (with existence guards)
  v_phase := 'DELETE_PAYMENT_NESTED';
  
  IF to_regclass('public.payment_installment_allocations') IS NOT NULL AND array_length(v_plan_ids, 1) > 0 THEN
    DELETE FROM payment_installment_allocations WHERE plan_id = ANY(v_plan_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('payment_installment_allocations', v_count);
  END IF;
  
  IF to_regclass('public.payment_plan_installments') IS NOT NULL AND array_length(v_plan_ids, 1) > 0 THEN
    DELETE FROM payment_plan_installments WHERE plan_id = ANY(v_plan_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('payment_plan_installments', v_count);
  END IF;
  
  IF to_regclass('public.payment_plans') IS NOT NULL THEN
    DELETE FROM payment_plans WHERE school_id = p_school_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('payment_plans', v_count);
  END IF;

  -- Delete message-related nested tables (with existence guards)
  v_phase := 'DELETE_MESSAGE_NESTED';
  
  IF to_regclass('public.delivery_attempts') IS NOT NULL THEN
    DELETE FROM delivery_attempts 
      WHERE message_id IN (SELECT id FROM parent_messages WHERE school_id = p_school_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('delivery_attempts', v_count);
  END IF;

  -- Delete restore_jobs by target columns (with existence guard)
  v_phase := 'DELETE_RESTORE_JOBS';
  
  IF to_regclass('public.restore_jobs') IS NOT NULL THEN
    DELETE FROM restore_jobs WHERE target_school_id = p_school_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('restore_jobs_by_target_school', v_count);
    
    IF array_length(v_class_ids, 1) > 0 THEN
      DELETE FROM restore_jobs WHERE target_class_id = ANY(v_class_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_deleted_counts := v_deleted_counts || jsonb_build_object('restore_jobs_by_target_class', v_count);
    END IF;
    
    IF array_length(v_student_ids, 1) > 0 THEN
      DELETE FROM restore_jobs WHERE target_student_id = ANY(v_student_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_deleted_counts := v_deleted_counts || jsonb_build_object('restore_jobs_by_target_student', v_count);
    END IF;
  END IF;

  -- Auto-delete from all tables with school_id, target_school_id, class_id, target_class_id, student_id, target_student_id, guardian_id
  v_phase := 'AUTO_DELETE_SWEEP';
  
  FOR v_table_name IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('school_id', 'target_school_id', 'class_id', 'target_class_id', 'student_id', 'target_student_id', 'guardian_id')
      AND c.table_name NOT IN ('schools', 'classes', 'students', 'guardians', 'user_roles', 'school_subscriptions')
    ORDER BY c.table_name
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE school_id = $1', v_table_name) USING p_school_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_school_id', v_count);
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE target_school_id = $1', v_table_name) USING p_school_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_target_school_id', v_count);
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      IF array_length(v_class_ids, 1) > 0 THEN
        EXECUTE format('DELETE FROM %I WHERE class_id = ANY($1)', v_table_name) USING v_class_ids;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_class_id', v_count);
        END IF;
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      IF array_length(v_class_ids, 1) > 0 THEN
        EXECUTE format('DELETE FROM %I WHERE target_class_id = ANY($1)', v_table_name) USING v_class_ids;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_target_class_id', v_count);
        END IF;
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      IF array_length(v_student_ids, 1) > 0 THEN
        EXECUTE format('DELETE FROM %I WHERE student_id = ANY($1)', v_table_name) USING v_student_ids;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_student_id', v_count);
        END IF;
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      IF array_length(v_student_ids, 1) > 0 THEN
        EXECUTE format('DELETE FROM %I WHERE target_student_id = ANY($1)', v_table_name) USING v_student_ids;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_target_student_id', v_count);
        END IF;
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    
    BEGIN
      IF array_length(v_guardian_ids, 1) > 0 THEN
        EXECUTE format('DELETE FROM %I WHERE guardian_id = ANY($1)', v_table_name) USING v_guardian_ids;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_deleted_counts := v_deleted_counts || jsonb_build_object(v_table_name || '_by_guardian_id', v_count);
        END IF;
      END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END LOOP;

  -- Delete core entities in dependency order
  v_phase := 'DELETE_STUDENTS';
  DELETE FROM students WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('students', v_count);

  v_phase := 'DELETE_GUARDIANS';
  DELETE FROM guardians WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('guardians', v_count);

  v_phase := 'DELETE_CLASSES';
  DELETE FROM classes WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('classes', v_count);

  v_phase := 'DELETE_ROLES';
  DELETE FROM user_roles WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('user_roles', v_count);

  v_phase := 'DELETE_SUBSCRIPTIONS';
  DELETE FROM school_subscriptions WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('school_subscriptions', v_count);

  v_phase := 'DELETE_SCHOOL';
  DELETE FROM schools WHERE id = p_school_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('schools', v_count);

  RETURN jsonb_build_object(
    'success', true,
    'school_name', v_school_name,
    'deleted_counts', v_deleted_counts
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'hard_delete_school_cascade failed during [%]: %', v_phase, SQLERRM;
END;
$$;
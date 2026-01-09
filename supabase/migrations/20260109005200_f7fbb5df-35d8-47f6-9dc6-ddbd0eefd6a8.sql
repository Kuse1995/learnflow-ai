-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION public.archive_school_cascade(p_school_id uuid, p_archived_by uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
BEGIN
  -- 1. Archive the school itself
  UPDATE schools 
  SET 
    is_archived = true,
    archived_at = v_now,
    billing_status = 'suspended'
  WHERE id = p_school_id;

  -- 2. Soft-delete all classes belonging to the school
  UPDATE classes 
  SET 
    deleted_at = v_now,
    deleted_by = p_archived_by
  WHERE school_id = p_school_id 
    AND deleted_at IS NULL;

  -- 3. Soft-delete all students in those classes
  UPDATE students 
  SET 
    deleted_at = v_now,
    deleted_by = p_archived_by
  WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id)
    AND deleted_at IS NULL;

  -- 4. Revoke all user roles for this school
  UPDATE user_roles 
  SET 
    revoked_at = v_now,
    revoked_by = p_archived_by
  WHERE school_id = p_school_id 
    AND revoked_at IS NULL;

  -- 5. Archive all guardians linked to this school
  UPDATE guardians 
  SET 
    deleted_at = v_now,
    deleted_by = p_archived_by
  WHERE school_id = p_school_id 
    AND deleted_at IS NULL;

  -- 6. Soft-delete guardian-student links (use deleted_at, not is_active)
  UPDATE guardian_student_links 
  SET 
    deleted_at = v_now,
    deleted_by = p_archived_by
  WHERE student_id IN (
    SELECT s.id FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.school_id = p_school_id
  ) AND deleted_at IS NULL;

  -- 7. Suspend the school subscription
  UPDATE school_subscriptions 
  SET 
    status = 'cancelled',
    cancelled_at = v_now
  WHERE school_id = p_school_id 
    AND status = 'active';

  -- 8. Log the archive action in audit_logs
  INSERT INTO audit_logs (
    action,
    actor_id,
    actor_type,
    entity_type,
    entity_id,
    summary,
    environment,
    entry_hash,
    previous_hash
  ) VALUES (
    'school_archived',
    p_archived_by,
    'user',
    'school',
    p_school_id::text,
    'School and all related data archived',
    'production',
    encode(sha256(random()::text::bytea), 'hex'),
    NULL
  );
END;
$$;
-- Create a function to cascade archive a school and all its related data
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

  -- 5. Archive all guardians linked to students in this school
  UPDATE guardians 
  SET 
    deleted_at = v_now,
    deleted_by = p_archived_by
  WHERE school_id = p_school_id 
    AND deleted_at IS NULL;

  -- 6. Deactivate guardian-student links
  UPDATE guardian_student_links 
  SET 
    is_active = false,
    revoked_at = v_now,
    revoked_by = p_archived_by
  WHERE student_id IN (
    SELECT s.id FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.school_id = p_school_id
  ) AND is_active = true;

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

-- Add revoked_at and revoked_by columns to user_roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'revoked_at') THEN
    ALTER TABLE user_roles ADD COLUMN revoked_at timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'revoked_by') THEN
    ALTER TABLE user_roles ADD COLUMN revoked_by uuid;
  END IF;
END $$;

-- Add deleted_at and deleted_by columns to guardians if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardians' AND column_name = 'deleted_at') THEN
    ALTER TABLE guardians ADD COLUMN deleted_at timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardians' AND column_name = 'deleted_by') THEN
    ALTER TABLE guardians ADD COLUMN deleted_by uuid;
  END IF;
END $$;

-- Create index for faster lookups on archived/deleted records
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked ON user_roles(school_id) WHERE revoked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardians_deleted ON guardians(school_id) WHERE deleted_at IS NOT NULL;
-- Create a function to HARD DELETE a school and ALL its related data permanently
-- WARNING: This is irreversible and will permanently delete all data
CREATE OR REPLACE FUNCTION public.hard_delete_school_cascade(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete AI-related data
  DELETE FROM ai_action_traces WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  DELETE FROM ai_action_traces WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  DELETE FROM ai_abuse_attempts WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete adaptive support plans
  DELETE FROM adaptive_support_plans WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete learning profiles
  DELETE FROM learning_profiles WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete parent insights
  DELETE FROM parent_insights WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete student work analyses
  DELETE FROM student_work_analyses WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete attendance records
  DELETE FROM attendance_records WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete uploads and upload analyses
  DELETE FROM upload_analyses WHERE upload_id IN (SELECT id FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id));
  DELETE FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete fee-related data
  DELETE FROM fee_receipts WHERE school_id = p_school_id;
  DELETE FROM fee_reminder_logs WHERE school_id = p_school_id;
  DELETE FROM fee_payments WHERE school_id = p_school_id;
  DELETE FROM fee_correction_requests WHERE school_id = p_school_id;
  DELETE FROM fee_audit_logs WHERE school_id = p_school_id;
  DELETE FROM fee_adjustments WHERE school_id = p_school_id;
  DELETE FROM student_fee_ledger WHERE school_id = p_school_id;
  DELETE FROM student_fee_assignments WHERE school_id = p_school_id;
  DELETE FROM fee_structures WHERE school_id = p_school_id;
  DELETE FROM fee_categories WHERE school_id = p_school_id;
  DELETE FROM fee_reminder_templates WHERE school_id = p_school_id;
  DELETE FROM fee_term_closures WHERE school_id = p_school_id;
  DELETE FROM fee_receipt_sequences WHERE school_id = p_school_id;
  
  -- Delete guardian links and related data
  DELETE FROM guardian_link_incidents WHERE school_id = p_school_id;
  DELETE FROM guardian_link_audit_log WHERE guardian_id IN (SELECT id FROM guardians WHERE school_id = p_school_id);
  DELETE FROM guardian_link_requests WHERE school_id = p_school_id;
  DELETE FROM guardian_student_links WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  DELETE FROM guardians WHERE school_id = p_school_id;
  
  -- Delete parent messages and delivery attempts
  DELETE FROM delivery_attempts WHERE message_id IN (SELECT id FROM parent_messages WHERE school_id = p_school_id);
  DELETE FROM parent_messages WHERE school_id = p_school_id;
  DELETE FROM communication_rules WHERE school_id = p_school_id;
  DELETE FROM delivery_processor_state WHERE school_id = p_school_id;
  
  -- Delete teacher invitations
  DELETE FROM teacher_invitations WHERE school_id = p_school_id;
  
  -- Delete students
  DELETE FROM students WHERE school_id = p_school_id;
  
  -- Delete classes
  DELETE FROM classes WHERE school_id = p_school_id;
  
  -- Delete user roles for this school
  DELETE FROM user_roles WHERE school_id = p_school_id;
  
  -- Delete school subscriptions
  DELETE FROM school_subscriptions WHERE school_id = p_school_id;
  
  -- Delete backup data
  DELETE FROM backups WHERE school_id = p_school_id;
  DELETE FROM backup_snapshots WHERE school_id = p_school_id;
  DELETE FROM backup_schedules WHERE school_id = p_school_id;
  DELETE FROM backup_schedule_config WHERE school_id = p_school_id;
  
  -- Delete billing events
  DELETE FROM billing_events WHERE school_id = p_school_id;
  
  -- Delete compliance settings
  DELETE FROM compliance_settings WHERE school_id = p_school_id;
  
  -- Delete feature adoption events
  DELETE FROM feature_adoption_events WHERE school_id = p_school_id;
  
  -- Finally, delete the school itself
  DELETE FROM schools WHERE id = p_school_id;
END;
$$;
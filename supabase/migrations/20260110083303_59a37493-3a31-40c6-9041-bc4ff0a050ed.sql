-- Fix hard_delete_school_cascade to use correct table names
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
  
  -- Delete student learning profiles (FIXED table name)
  DELETE FROM student_learning_profiles WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete student learning paths
  DELETE FROM student_learning_paths WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete student intervention plans
  DELETE FROM student_intervention_plans WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete student diagnostics
  DELETE FROM student_diagnostics WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete parent insight summaries (FIXED table name)
  DELETE FROM parent_insight_summaries WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete attendance records
  DELETE FROM attendance_records WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete upload related data
  DELETE FROM upload_analyses WHERE upload_id IN (SELECT id FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id));
  DELETE FROM upload_students WHERE upload_id IN (SELECT id FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id));
  DELETE FROM uploads WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete lesson resources and differentiation
  DELETE FROM lesson_differentiation_suggestions WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  DELETE FROM lesson_resources WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
  -- Delete teacher action logs
  DELETE FROM teacher_action_logs WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  DELETE FROM teacher_action_logs WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete teacher class assignments
  DELETE FROM teacher_class_assignments WHERE class_id IN (SELECT id FROM classes WHERE school_id = p_school_id);
  
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
  
  -- Delete term reports
  DELETE FROM term_report_exports WHERE school_id = p_school_id;
  DELETE FROM term_reports WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete practice sessions
  DELETE FROM practice_sessions WHERE student_id IN (SELECT id FROM students WHERE school_id = p_school_id);
  
  -- Delete school subjects
  DELETE FROM school_subjects WHERE school_id = p_school_id;
  
  -- Delete school AI controls
  DELETE FROM school_ai_controls WHERE school_id = p_school_id;
  
  -- Delete school admin metrics and onboarding
  DELETE FROM school_admin_metrics WHERE school_id = p_school_id;
  DELETE FROM school_admin_onboarding WHERE school_id = p_school_id;
  
  -- Delete school change logs
  DELETE FROM school_change_logs WHERE school_id = p_school_id;
  
  -- Delete school export jobs
  DELETE FROM school_export_jobs WHERE school_id = p_school_id;
  
  -- Delete school rollout status
  DELETE FROM school_rollout_status WHERE school_id = p_school_id;
  
  -- Delete school usage metrics
  DELETE FROM school_usage_metrics WHERE school_id = p_school_id;
  
  -- Delete restore requests
  DELETE FROM restore_requests WHERE school_id = p_school_id;
  
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
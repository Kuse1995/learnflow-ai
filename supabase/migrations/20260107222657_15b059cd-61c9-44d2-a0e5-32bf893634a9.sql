-- Drop the existing table (will be replaced by a read-only view)
DROP TABLE IF EXISTS public.student_learning_timeline CASCADE;

-- Create the unified learning timeline view
-- This is READ-ONLY: no inserts, updates, or deletes allowed
CREATE VIEW public.student_learning_timeline AS

-- Upload Analyses (completed only) - per student via upload_students junction
SELECT
  'analysis_' || ua.id::text || '_' || us.student_id::text AS timeline_id,
  us.student_id,
  ua.class_id,
  'analysis'::text AS event_type,
  ua.analyzed_at AS event_date,
  'Learning evidence analyzed from uploaded work.'::text AS summary_text,
  jsonb_build_object('upload_id', ua.upload_id) AS metadata
FROM public.upload_analyses ua
JOIN public.upload_students us ON us.upload_id = ua.upload_id
WHERE ua.status = 'completed'
  AND ua.analyzed_at IS NOT NULL

UNION ALL

-- Teacher Action Logs - fan out to all students in the class
SELECT
  'teaching_action_' || tal.id::text || '_' || s.id::text AS timeline_id,
  s.id AS student_id,
  tal.class_id,
  'teaching_action'::text AS event_type,
  tal.created_at AS event_date,
  COALESCE('Teaching action recorded: ' || tal.topic, 'Teaching action recorded.')::text AS summary_text,
  jsonb_build_object(
    'topic', tal.topic,
    'action_taken', tal.action_taken
  ) AS metadata
FROM public.teacher_action_logs tal
JOIN public.students s ON s.class_id = tal.class_id

UNION ALL

-- Student Intervention Plans (Adaptive Support)
SELECT
  'support_plan_' || sip.id::text AS timeline_id,
  sip.student_id,
  sip.class_id,
  'adaptive_support_plan'::text AS event_type,
  sip.generated_at AS event_date,
  'Adaptive support plan generated.'::text AS summary_text,
  jsonb_build_object(
    'acknowledged', sip.teacher_acknowledged,
    'source_window_days', sip.source_window_days
  ) AS metadata
FROM public.student_intervention_plans sip

UNION ALL

-- Parent Insight Summaries (approved only)
SELECT
  'parent_update_' || pis.id::text AS timeline_id,
  pis.student_id,
  pis.class_id,
  'parent_update'::text AS event_type,
  COALESCE(pis.approved_at, pis.created_at) AS event_date,
  'Parent insight summary shared.'::text AS summary_text,
  jsonb_build_object('shared', true) AS metadata
FROM public.parent_insight_summaries pis
WHERE pis.teacher_approved = true;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.student_learning_timeline IS 'Read-only unified timeline of learning evidence per student. Sources: upload_analyses, teacher_action_logs, student_intervention_plans, parent_insight_summaries.';
-- ============================================================================
-- ATTACH DEMO SAFETY TRIGGERS TO TABLES
-- ============================================================================

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS tr_block_demo_notifications ON parent_messages;
DROP TRIGGER IF EXISTS tr_block_demo_analytics ON feature_adoption_events;

-- Create trigger on parent_messages to block demo notifications
CREATE TRIGGER tr_block_demo_notifications
  BEFORE INSERT ON parent_messages
  FOR EACH ROW
  EXECUTE FUNCTION block_demo_notifications();

-- Create trigger on feature_adoption_events to block demo analytics
CREATE TRIGGER tr_block_demo_analytics
  BEFORE INSERT ON feature_adoption_events
  FOR EACH ROW
  EXECUTE FUNCTION block_demo_analytics();

-- ============================================================================
-- CREATE LIVE TEST SCHOOL FOR SMOKE TESTING
-- ============================================================================

-- Insert a live (non-demo) school for comparison testing
INSERT INTO schools (id, name, is_demo, created_at)
VALUES (
  'b1b2b3b4-c5c6-d7d8-e9e0-f1f2f3f4f5f6',
  'Riverside Primary School (Live)',
  false,
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create a class for the live school
INSERT INTO classes (id, name, school_id, grade, is_demo, created_at)
VALUES (
  'c1c2c3c4-d5d6-e7e8-f9f0-a1a2a3a4a5a6',
  'Grade 4B',
  'b1b2b3b4-c5c6-d7d8-e9e0-f1f2f3f4f5f6',
  '4',
  false,
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create students for the live school (including student_id as text identifier)
INSERT INTO students (id, student_id, name, class_id, is_demo, created_at)
VALUES 
  ('d1d2d3d4-e5e6-f7f8-a9a0-b1b2b3b4b5b6', 'RPS-2026-001', 'Mary Mwanza', 'c1c2c3c4-d5d6-e7e8-f9f0-a1a2a3a4a5a6', false, now()),
  ('d2d3d4d5-e6e7-f8f9-a0a1-b2b3b4b5b6b7', 'RPS-2026-002', 'James Banda', 'c1c2c3c4-d5d6-e7e8-f9f0-a1a2a3a4a5a6', false, now()),
  ('d3d4d5d6-e7e8-f9a0-a1a2-b3b4b5b6b7b8', 'RPS-2026-003', 'Grace Tembo', 'c1c2c3c4-d5d6-e7e8-f9f0-a1a2a3a4a5a6', false, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- UPDATE DEMO DATA SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW demo_data_summary AS
SELECT 'schools' as table_name, COUNT(*) as record_count FROM schools WHERE is_demo = true
UNION ALL
SELECT 'classes', COUNT(*) FROM classes WHERE is_demo = true
UNION ALL
SELECT 'students', COUNT(*) FROM students WHERE is_demo = true
UNION ALL
SELECT 'demo_users', COUNT(*) FROM demo_users WHERE school_id IN (SELECT id FROM schools WHERE is_demo = true)
UNION ALL
SELECT 'teacher_action_logs', COUNT(*) FROM teacher_action_logs WHERE is_demo = true
UNION ALL
SELECT 'adaptive_support_plans', COUNT(*) FROM adaptive_support_plans WHERE is_demo = true
UNION ALL
SELECT 'student_diagnostics', COUNT(*) FROM student_diagnostics WHERE is_demo = true
UNION ALL
SELECT 'parent_insight_summaries', COUNT(*) FROM parent_insight_summaries WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
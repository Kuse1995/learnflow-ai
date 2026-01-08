-- Add is_demo column to teacher_action_logs for demo isolation
ALTER TABLE public.teacher_action_logs ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create index for filtering demo data
CREATE INDEX IF NOT EXISTS idx_teacher_action_logs_is_demo ON public.teacher_action_logs(is_demo);

-- Insert demo Teaching Actions for Grade 5A
INSERT INTO public.teacher_action_logs (class_id, topic, action_taken, reflection_notes, is_demo, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fractions', 'Used visual fraction models and group discussion', 'Students responded well to hands-on manipulatives. The group discussion helped clarify misconceptions about equivalent fractions.', true, now() - interval '5 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Word Problems', 'Guided students through worked examples', 'Breaking down problems step-by-step was effective. Will continue using this approach for multi-step problems.', true, now() - interval '3 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Revision', 'Provided extra practice sheets and oral explanation', 'Extra practice helped reinforce concepts before assessment. Oral explanations allowed students to ask clarifying questions.', true, now() - interval '1 day');
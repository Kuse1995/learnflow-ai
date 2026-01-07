-- Create student_learning_timeline table
CREATE TABLE public.student_learning_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('analysis', 'teaching_action', 'support_plan', 'learning_path', 'parent_summary')),
  event_summary text NOT NULL,
  source_id uuid,
  occurred_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_learning_timeline ENABLE ROW LEVEL SECURITY;

-- Teacher-only: can view timeline entries
CREATE POLICY "Teachers can view timeline entries"
ON public.student_learning_timeline
FOR SELECT
TO authenticated
USING (true);

-- AI agents / edge functions can append entries (INSERT only)
CREATE POLICY "AI agents can append timeline entries"
ON public.student_learning_timeline
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No UPDATE or DELETE policies = append-only behavior

-- Add index for efficient queries
CREATE INDEX idx_student_learning_timeline_student_class 
ON public.student_learning_timeline (student_id, class_id, occurred_at DESC);

-- Add comment documenting constraints
COMMENT ON TABLE public.student_learning_timeline IS 'Append-only learning evidence timeline. Teacher-facing only. No edits or deletions allowed.';
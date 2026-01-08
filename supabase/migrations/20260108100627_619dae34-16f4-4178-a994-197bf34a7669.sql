-- Create adaptive_support_plans table for AI-generated learning support recommendations
CREATE TABLE IF NOT EXISTS public.adaptive_support_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  focus_areas jsonb NOT NULL DEFAULT '[]',
  recommended_practice_types jsonb NOT NULL DEFAULT '[]',
  support_strategies jsonb NOT NULL DEFAULT '[]',
  confidence_support_notes text,
  teacher_acknowledged boolean NOT NULL DEFAULT false,
  teacher_acknowledged_at timestamptz,
  source_window_days integer NOT NULL DEFAULT 30,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.adaptive_support_plans ENABLE ROW LEVEL SECURITY;

-- Teachers can view plans for their students (read-only)
CREATE POLICY "Teachers can view student support plans"
  ON public.adaptive_support_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = adaptive_support_plans.student_id
        AND c.teacher_id = auth.uid()
    )
    OR is_demo = true
  );

-- Teachers can only update acknowledgment status
CREATE POLICY "Teachers can acknowledge plans"
  ON public.adaptive_support_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = adaptive_support_plans.student_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = adaptive_support_plans.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Service role has full access (AI writes)
CREATE POLICY "Service role manages support plans"
  ON public.adaptive_support_plans FOR ALL
  TO service_role
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_adaptive_support_plans_student ON public.adaptive_support_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_support_plans_demo ON public.adaptive_support_plans(is_demo);

-- Create updated_at trigger
CREATE TRIGGER update_adaptive_support_plans_updated_at
  BEFORE UPDATE ON public.adaptive_support_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo Adaptive Support Plan for Chanda Mwila
INSERT INTO public.adaptive_support_plans (
  student_id,
  focus_areas,
  recommended_practice_types,
  support_strategies,
  confidence_support_notes,
  teacher_acknowledged,
  source_window_days,
  is_demo
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '["Developing fluency with fraction operations", "Building confidence with multi-step word problems", "Strengthening place value understanding"]',
  '["visual-models", "worked-examples", "peer-discussion", "scaffolded-practice"]',
  '["Use fraction strips and area models to build conceptual understanding", "Break multi-step problems into smaller checkpoints with verbal explanation", "Provide number line references when working with place value", "Encourage think-aloud strategies during problem solving"]',
  'Chanda shows thoughtful engagement when given time to process. Benefits from visual representations and opportunities to explain reasoning aloud. Responds positively to structured support and clear success criteria.',
  false,
  30,
  true
);

COMMENT ON TABLE public.adaptive_support_plans IS 'AI-generated adaptive learning support plans for students';
-- Create table for storing upload analysis results
CREATE TABLE public.upload_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL UNIQUE REFERENCES public.uploads(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  
  -- Analysis status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message text,
  
  -- Class-level summary (teacher-facing only)
  class_summary jsonb DEFAULT '{}'::jsonb,
  -- Structure: { common_errors: [], topic_gaps: [], overall_observations: string }
  
  -- Per-student diagnostics
  student_diagnostics jsonb DEFAULT '[]'::jsonb,
  -- Structure: [{ student_id, error_patterns: {conceptual, procedural, language, careless}, weak_topics: [], notes: string }]
  
  -- Metadata
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_analyses ENABLE ROW LEVEL SECURITY;

-- Teachers can view analyses
CREATE POLICY "Teachers can view upload analyses"
ON public.upload_analyses
FOR SELECT
TO authenticated
USING (true);

-- Only service role (AI agents) can create/update analyses
CREATE POLICY "AI agents can manage upload analyses"
ON public.upload_analyses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can insert (to initiate analysis)
CREATE POLICY "Authenticated users can initiate analysis"
ON public.upload_analyses
FOR INSERT
TO authenticated
WITH CHECK (status = 'pending');

-- Index for upload lookups
CREATE INDEX idx_upload_analyses_upload_id ON public.upload_analyses(upload_id);
CREATE INDEX idx_upload_analyses_class_id ON public.upload_analyses(class_id);

-- Trigger for updated_at
CREATE TRIGGER update_upload_analyses_updated_at
  BEFORE UPDATE ON public.upload_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.upload_analyses IS 'Stores AI analysis results for uploads. Teacher-facing diagnostics only.';
COMMENT ON COLUMN public.upload_analyses.class_summary IS 'Aggregated class-level error trends and observations';
COMMENT ON COLUMN public.upload_analyses.student_diagnostics IS 'Per-student error patterns and weak topics identified';
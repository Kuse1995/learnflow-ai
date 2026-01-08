-- Term Reports table for school-level aggregated reporting
CREATE TABLE public.term_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL, -- e.g., "Term 1 2026", "First Term 2025"
  academic_year TEXT NOT NULL, -- e.g., "2025", "2026"
  term_number INTEGER NOT NULL CHECK (term_number >= 1 AND term_number <= 4),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  
  -- Section A: System Adoption (aggregated counts only)
  active_teachers_count INTEGER NOT NULL DEFAULT 0,
  uploads_analyzed_count INTEGER NOT NULL DEFAULT 0,
  active_classes_count INTEGER NOT NULL DEFAULT 0,
  ai_suggestions_used_count INTEGER NOT NULL DEFAULT 0,
  parent_insights_count INTEGER NOT NULL DEFAULT 0,
  support_plans_count INTEGER NOT NULL DEFAULT 0,
  
  -- Section B: Learning Support Activity
  adaptive_plans_generated INTEGER NOT NULL DEFAULT 0,
  parent_insights_approved INTEGER NOT NULL DEFAULT 0,
  common_subjects_engaged JSONB DEFAULT '[]'::jsonb, -- Aggregated only, no student data
  
  -- Section C: Engagement Patterns (neutral)
  most_used_features JSONB DEFAULT '[]'::jsonb,
  least_used_features JSONB DEFAULT '[]'::jsonb,
  emerging_adoption_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Section D: Administrative Notes (internal only)
  admin_notes TEXT,
  
  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one report per term per school
  UNIQUE(school_id, academic_year, term_number)
);

-- Enable RLS
ALTER TABLE public.term_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only school admins and super admins can access
CREATE POLICY "School admins can view their school reports"
  ON public.term_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'school_admin'
      AND user_roles.school_id = term_reports.school_id
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "School admins can create reports for their school"
  ON public.term_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'school_admin'
      AND user_roles.school_id = term_reports.school_id
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "School admins can update their school reports"
  ON public.term_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'school_admin'
      AND user_roles.school_id = term_reports.school_id
    )
    OR is_super_admin(auth.uid())
  );

-- Term Report Exports table for tracking what was exported
CREATE TABLE public.term_report_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_report_id UUID NOT NULL REFERENCES public.term_reports(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'csv')),
  exported_by UUID NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.term_report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view their exports"
  ON public.term_report_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM term_reports tr
      JOIN user_roles ur ON ur.school_id = tr.school_id
      WHERE tr.id = term_report_exports.term_report_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'school_admin'
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "School admins can create exports"
  ON public.term_report_exports FOR INSERT
  WITH CHECK (exported_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_term_reports_school ON public.term_reports(school_id);
CREATE INDEX idx_term_reports_year_term ON public.term_reports(academic_year, term_number);
CREATE INDEX idx_term_report_exports_report ON public.term_report_exports(term_report_id);

-- Function to generate term report data
CREATE OR REPLACE FUNCTION public.generate_term_report_data(
  p_school_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_teachers_count INTEGER;
  v_classes_count INTEGER;
  v_uploads_count INTEGER;
  v_insights_count INTEGER;
  v_plans_count INTEGER;
BEGIN
  -- Count active teachers
  SELECT COUNT(DISTINCT user_id) INTO v_teachers_count
  FROM user_roles
  WHERE school_id = p_school_id AND role = 'teacher';
  
  -- Count active classes
  SELECT COUNT(*) INTO v_classes_count
  FROM classes
  WHERE school_id = p_school_id AND deleted_at IS NULL;
  
  -- Count uploads in period (from usage metrics)
  SELECT COALESCE(SUM(uploads_analyzed), 0) INTO v_uploads_count
  FROM school_usage_metrics
  WHERE school_id = p_school_id;
  
  -- Count approved parent insights
  SELECT COALESCE(SUM(parent_insights_generated), 0) INTO v_insights_count
  FROM school_usage_metrics
  WHERE school_id = p_school_id;
  
  -- Count adaptive support plans
  SELECT COALESCE(SUM(adaptive_support_plans_generated), 0) INTO v_plans_count
  FROM school_usage_metrics
  WHERE school_id = p_school_id;
  
  result := jsonb_build_object(
    'active_teachers_count', v_teachers_count,
    'active_classes_count', v_classes_count,
    'uploads_analyzed_count', v_uploads_count,
    'parent_insights_count', v_insights_count,
    'support_plans_count', v_plans_count
  );
  
  RETURN result;
END;
$$;
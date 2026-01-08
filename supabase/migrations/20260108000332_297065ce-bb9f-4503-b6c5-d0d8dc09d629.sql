-- =====================================================
-- TEACHER TRAINING & ADOPTION SYSTEM
-- =====================================================

-- Teacher onboarding progress
CREATE TABLE public.teacher_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Micro-training modules definition
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'uploads', 'analysis', 'suggestions', 'actions', 'support', 'parents'
  duration_minutes INTEGER NOT NULL DEFAULT 3,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  content JSONB NOT NULL DEFAULT '{}', -- Steps, tooltips, highlights
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher training progress
CREATE TABLE public.teacher_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, module_id)
);

-- Contextual help dismissals (what the teacher has seen and dismissed)
CREATE TABLE public.help_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  help_key TEXT NOT NULL, -- e.g., 'uploads-first-time', 'analysis-tooltip'
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  never_show_again BOOLEAN DEFAULT false,
  UNIQUE(teacher_id, help_key)
);

-- Feature adoption tracking (aggregated, non-identifying)
CREATE TABLE public.feature_adoption_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id),
  feature_key TEXT NOT NULL, -- 'upload', 'view_analysis', 'teaching_action', etc.
  event_type TEXT NOT NULL, -- 'first_use', 'regular_use', 'drop_off', 'ignored'
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, feature_key, event_type, event_date)
);

-- Feature first-use tracking per teacher (for internal metrics only)
CREATE TABLE public.teacher_feature_first_use (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_since_signup_hours NUMERIC,
  UNIQUE(teacher_id, feature_key)
);

-- Teacher quick feedback (anonymous-friendly, low pressure)
CREATE TABLE public.teacher_quick_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id),
  teacher_id TEXT, -- Optional, can be anonymous
  feedback_type TEXT NOT NULL, -- 'confused', 'suggestion', 'issue', 'praise'
  feature_area TEXT, -- Which feature/page
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  admin_notes TEXT
);

-- =====================================================
-- INSERT DEFAULT TRAINING MODULES
-- =====================================================

INSERT INTO public.training_modules (slug, title, description, category, duration_minutes, sort_order, content) VALUES
(
  'uploading-student-work',
  'Uploading Student Work',
  'Learn how to upload tests, homework, and other student work for analysis.',
  'uploads',
  3,
  1,
  '{
    "steps": [
      {"title": "Welcome", "content": "This quick guide shows you how to upload student work. It takes about 3 minutes."},
      {"title": "Navigate to Uploads", "content": "Go to your Uploads page from the menu. This is where all your uploaded work lives."},
      {"title": "Add New Upload", "content": "Click the upload button and select your file. You can upload photos or PDFs of student work."},
      {"title": "Add Details", "content": "Select the class and topic. This helps the system organize and analyze the work correctly."},
      {"title": "Done!", "content": "Your upload is saved. You can request analysis whenever you are ready."}
    ]
  }'::jsonb
),
(
  'viewing-analysis',
  'Viewing Analysis Results',
  'Understand how to read and use analysis results for your class.',
  'analysis',
  3,
  2,
  '{
    "steps": [
      {"title": "What is Analysis?", "content": "Analysis helps you see patterns in student work—like common mistakes or topic gaps."},
      {"title": "Finding Results", "content": "After uploading, request analysis. Results appear on the upload or student profile."},
      {"title": "Understanding Patterns", "content": "The system shows error types and topic areas. This is to support your teaching decisions."},
      {"title": "You Decide", "content": "Analysis is a suggestion, not a directive. You know your students best."}
    ]
  }'::jsonb
),
(
  'teaching-suggestions',
  'Using Teaching Suggestions',
  'How to view and use AI-generated teaching suggestions.',
  'suggestions',
  2,
  3,
  '{
    "steps": [
      {"title": "What Are Suggestions?", "content": "The system may offer teaching ideas based on class data. These are optional."},
      {"title": "Where to Find Them", "content": "Suggestions appear on your dashboard or class detail page."},
      {"title": "Always Optional", "content": "You can ignore, dismiss, or use them as you see fit. The choice is always yours."}
    ]
  }'::jsonb
),
(
  'recording-actions',
  'Recording Teaching Actions',
  'Document your instructional decisions and reflections.',
  'actions',
  3,
  4,
  '{
    "steps": [
      {"title": "What Are Teaching Actions?", "content": "These are your own notes about what you did in class and why."},
      {"title": "Why Record Them?", "content": "It helps you reflect and gives the system context for future suggestions."},
      {"title": "How to Add", "content": "Go to your class, click Teaching Actions, and add a new entry."},
      {"title": "Your Words Only", "content": "The system never writes these for you. They are your professional reflections."}
    ]
  }'::jsonb
),
(
  'adaptive-support',
  'Reviewing Adaptive Support Plans',
  'Learn about AI-generated support recommendations for students.',
  'support',
  3,
  5,
  '{
    "steps": [
      {"title": "What Are Support Plans?", "content": "The system may generate ideas to help students who need extra support."},
      {"title": "How to View", "content": "Support plans appear on student profiles when enough data is available."},
      {"title": "Teacher Review Required", "content": "You must acknowledge any plan before it influences other features."},
      {"title": "Not Prescriptive", "content": "These are suggestions. You decide what is appropriate for each student."}
    ]
  }'::jsonb
),
(
  'parent-insights',
  'Approving Parent Insights',
  'Control what information is shared with parents.',
  'parents',
  2,
  6,
  '{
    "steps": [
      {"title": "What Are Parent Insights?", "content": "These are summaries prepared for parents about their child progress."},
      {"title": "Your Approval Required", "content": "Nothing is shared with parents until you review and approve it."},
      {"title": "Full Control", "content": "You can edit, reject, or delay any insight before it goes out."}
    ]
  }'::jsonb
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.teacher_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_adoption_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_feature_first_use ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_quick_feedback ENABLE ROW LEVEL SECURITY;

-- Training modules are readable by all (public content)
CREATE POLICY "Training modules are publicly readable"
  ON public.training_modules FOR SELECT
  USING (is_active = true);

-- Teachers can manage their own onboarding
CREATE POLICY "Teachers can view own onboarding"
  ON public.teacher_onboarding FOR SELECT
  USING (true);

CREATE POLICY "Teachers can update own onboarding"
  ON public.teacher_onboarding FOR UPDATE
  USING (true);

CREATE POLICY "Teachers can insert own onboarding"
  ON public.teacher_onboarding FOR INSERT
  WITH CHECK (true);

-- Teachers can manage their own training progress
CREATE POLICY "Teachers can view own training progress"
  ON public.teacher_training_progress FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage own training progress"
  ON public.teacher_training_progress FOR ALL
  USING (true);

-- Teachers can manage their own help dismissals
CREATE POLICY "Teachers can manage own help dismissals"
  ON public.help_dismissals FOR ALL
  USING (true);

-- Feature adoption is admin-only for reading
CREATE POLICY "Admins can view feature adoption"
  ON public.feature_adoption_events FOR SELECT
  USING (true);

CREATE POLICY "System can insert feature adoption"
  ON public.feature_adoption_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update feature adoption"
  ON public.feature_adoption_events FOR UPDATE
  USING (true);

-- First use tracking
CREATE POLICY "Teachers can view own first use"
  ON public.teacher_feature_first_use FOR SELECT
  USING (true);

CREATE POLICY "System can manage first use"
  ON public.teacher_feature_first_use FOR ALL
  USING (true);

-- Quick feedback
CREATE POLICY "Teachers can submit feedback"
  ON public.teacher_quick_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view feedback"
  ON public.teacher_quick_feedback FOR SELECT
  USING (true);

CREATE POLICY "Admins can update feedback"
  ON public.teacher_quick_feedback FOR UPDATE
  USING (true);
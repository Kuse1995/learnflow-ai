-- =============================================
-- LAUNCH MODE: Environment & Feature Control
-- =============================================

-- Update system_environment to add production mode controls
ALTER TABLE public.system_environment 
ADD COLUMN IF NOT EXISTS rate_limit_multiplier DECIMAL(3,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS schema_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_experimental_features BOOLEAN DEFAULT false;

-- =============================================
-- Create app_role enum for user roles
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('platform_admin', 'school_admin', 'teacher', 'parent', 'student');
  END IF;
END$$;

-- =============================================
-- SCHOOL ONBOARDING: Manual-first system
-- =============================================

-- User accounts table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Will be linked after account activation
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'teacher',
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  is_activated BOOLEAN DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (separate from user_accounts for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role, school_id)
);

-- Teacher-class assignments
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_account_id UUID REFERENCES public.user_accounts(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(teacher_account_id, class_id)
);

-- School-level AI controls
CREATE TABLE IF NOT EXISTS public.school_ai_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ai_enabled BOOLEAN DEFAULT true,
  allowed_features TEXT[] DEFAULT ARRAY['teaching_suggestions', 'upload_analysis_limited'],
  paused_until TIMESTAMP WITH TIME ZONE,
  pause_reason TEXT,
  enabled_classes UUID[] DEFAULT '{}',
  enabled_grades TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- =============================================
-- SOFT DELETES: Critical records protection
-- =============================================

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- =============================================
-- SYSTEM STATUS & SUPPORT
-- =============================================

CREATE TABLE IF NOT EXISTS public.error_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution_steps TEXT[],
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational',
  message TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  incident_started_at TIMESTAMP WITH TIME ZONE,
  incident_resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- LEGAL PLACEHOLDERS
-- =============================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert placeholder legal documents
INSERT INTO public.legal_documents (document_type, title, content, version) VALUES
('terms_of_use', 'Terms of Use', 'These Terms of Use govern your access to and use of our school management platform. By accessing the platform, you agree to these terms.

1. Acceptable Use: You agree to use the platform only for lawful educational purposes.
2. Data Responsibility: Teachers and administrators must protect student privacy.
3. Account Security: Keep your login credentials confidential.
4. Service Availability: We strive for high availability but cannot guarantee uninterrupted access.

This is a placeholder document. Please consult with legal counsel before deployment.', '1.0'),
('privacy_policy', 'Privacy Policy', 'This Privacy Policy describes how we collect, use, and protect information.

1. Information We Collect: Student names, academic records, attendance data.
2. How We Use Information: To provide educational management services.
3. Data Protection: We implement appropriate security measures.
4. Data Retention: We retain data in accordance with educational requirements.

This is a placeholder document. Please consult with legal counsel before deployment.', '1.0'),
('data_retention', 'Data Retention Policy', 'This policy outlines how long we retain different types of data.

Student Records: Retained for enrollment duration plus 7 years.
Attendance Records: Retained for 5 years.
Learning Analytics: Retained for 3 years after graduation.
Audit Logs: Retained for 7 years.

This is a placeholder document. Please consult with legal counsel before deployment.', '1.0')
ON CONFLICT (document_type) DO NOTHING;

-- Insert common error codes
INSERT INTO public.error_codes (code, category, title, description, resolution_steps, severity) VALUES
('E001', 'Authentication', 'Login Failed', 'Unable to authenticate with provided credentials', ARRAY['Check email and password', 'Ensure account is activated', 'Contact school administrator'], 'warning'),
('E002', 'Network', 'Connection Lost', 'Unable to connect to server', ARRAY['Check internet connection', 'Wait and try again', 'Work offline if available'], 'warning'),
('E003', 'Permission', 'Access Denied', 'You do not have permission for this action', ARRAY['Contact your administrator', 'Verify your role permissions'], 'error'),
('E004', 'Data', 'Save Failed', 'Unable to save your changes', ARRAY['Check your connection', 'Try again', 'Contact support if persistent'], 'error'),
('E005', 'Limit', 'Usage Limit Reached', 'Your school has reached its usage limit', ARRAY['Wait for next billing cycle', 'Contact administrator about upgrade'], 'warning'),
('E006', 'AI', 'Generation Failed', 'AI feature temporarily unavailable', ARRAY['Try again in a few minutes', 'AI may be paused by administrator'], 'warning')
ON CONFLICT (code) DO NOTHING;

-- Insert initial system status
INSERT INTO public.system_status (component, status, message) VALUES
('Database', 'operational', 'All database services running normally'),
('Authentication', 'operational', 'Login and authentication services active'),
('AI Services', 'operational', 'AI generation features available'),
('File Storage', 'operational', 'File upload and storage working'),
('Backup System', 'operational', 'Automated backups running on schedule')
ON CONFLICT DO NOTHING;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_ai_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- User accounts policies
CREATE POLICY "Super admins can manage all user accounts"
ON public.user_accounts FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own account"
ON public.user_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Teacher class assignments policies
CREATE POLICY "Super admins can manage all assignments"
ON public.teacher_class_assignments FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

-- School AI controls policies
CREATE POLICY "Super admins can manage all AI controls"
ON public.school_ai_controls FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read AI controls"
ON public.school_ai_controls FOR SELECT TO authenticated
USING (true);

-- Error codes (read-only for all)
CREATE POLICY "Anyone can read error codes"
ON public.error_codes FOR SELECT TO authenticated
USING (true);

-- System status policies
CREATE POLICY "Super admins can manage system status"
ON public.system_status FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read system status"
ON public.system_status FOR SELECT TO authenticated
USING (true);

-- Legal documents policies
CREATE POLICY "Anyone can read active legal documents"
ON public.legal_documents FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage legal documents"
ON public.legal_documents FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_accounts_school ON public.user_accounts(school_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON public.teacher_class_assignments(teacher_account_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class ON public.teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_students_deleted ON public.students(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_deleted ON public.classes(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_user_accounts_updated_at
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_ai_controls_updated_at
BEFORE UPDATE ON public.school_ai_controls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_documents_updated_at
BEFORE UPDATE ON public.legal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user has role for a specific school
CREATE OR REPLACE FUNCTION public.has_school_role(_user_id UUID, _role app_role, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND school_id = _school_id
  )
$$;

-- Check if AI is enabled for a school
CREATE OR REPLACE FUNCTION public.is_ai_enabled_for_school(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_controls school_ai_controls;
BEGIN
  SELECT * INTO v_controls FROM school_ai_controls WHERE school_id = p_school_id;
  
  IF v_controls IS NULL THEN
    RETURN true;
  END IF;
  
  IF NOT v_controls.ai_enabled THEN
    RETURN false;
  END IF;
  
  IF v_controls.paused_until IS NOT NULL AND v_controls.paused_until > now() THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Soft delete a student
CREATE OR REPLACE FUNCTION public.soft_delete_student(p_student_id UUID, p_deleted_by UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE students 
  SET deleted_at = now(), deleted_by = p_deleted_by
  WHERE id = p_student_id AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Restore a soft-deleted student
CREATE OR REPLACE FUNCTION public.restore_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE students 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = p_student_id AND deleted_at IS NOT NULL;
  RETURN FOUND;
END;
$$;
-- System Environment Configuration
CREATE TABLE public.system_environment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
  is_production BOOLEAN NOT NULL DEFAULT false,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version_tag TEXT,
  debug_mode_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.super_admins(id)
);

-- Feature Flags
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  environment TEXT[] DEFAULT ARRAY['development', 'staging', 'production'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.super_admins(id)
);

-- Migration Log
CREATE TABLE public.migration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  environment TEXT NOT NULL,
  applied_by UUID REFERENCES public.super_admins(id),
  rollback_supported BOOLEAN NOT NULL DEFAULT false,
  rollback_executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'rolled_back')),
  error_message TEXT,
  notes TEXT
);

-- App Versions
CREATE TABLE public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  notes TEXT,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deployed_by UUID REFERENCES public.super_admins(id),
  breaking_change BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT false,
  changelog TEXT[]
);

-- Deployment Checks
CREATE TABLE public.deployment_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_name TEXT NOT NULL,
  description TEXT,
  check_type TEXT NOT NULL CHECK (check_type IN ('pre_deploy', 'post_deploy', 'rollback')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'skipped')),
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  result_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_environment
CREATE POLICY "Super admins can manage system environment"
  ON public.system_environment
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read system environment"
  ON public.system_environment
  FOR SELECT
  USING (true);

-- RLS Policies for feature_flags
CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (true);

-- RLS Policies for migration_logs
CREATE POLICY "Super admins can manage migration logs"
  ON public.migration_logs
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for app_versions
CREATE POLICY "Super admins can manage app versions"
  ON public.app_versions
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read app versions"
  ON public.app_versions
  FOR SELECT
  USING (true);

-- RLS Policies for deployment_checks
CREATE POLICY "Super admins can manage deployment checks"
  ON public.deployment_checks
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Insert default system environment
INSERT INTO public.system_environment (environment, is_production, version_tag, debug_mode_enabled)
VALUES ('development', false, '1.0.0', true);

-- Insert default feature flags
INSERT INTO public.feature_flags (key, description, enabled) VALUES
  ('ai_enabled', 'Enable AI-powered features across the platform', true),
  ('parent_insights_enabled', 'Enable parent insight generation and viewing', true),
  ('adaptive_support_enabled', 'Enable adaptive support plan generation', true),
  ('lesson_differentiation_enabled', 'Enable lesson differentiation suggestions', true),
  ('learning_paths_enabled', 'Enable personalized learning path generation', true),
  ('practice_sessions_enabled', 'Enable student practice sessions', true),
  ('bulk_generation_enabled', 'Enable bulk AI generation features', false),
  ('billing_enabled', 'Enable billing and payment features (future)', false),
  ('maintenance_banner_enabled', 'Show maintenance notification banner', false),
  ('debug_tools_enabled', 'Enable developer debug tools', true);

-- Insert initial app version
INSERT INTO public.app_versions (version, notes, breaking_change, is_current, changelog)
VALUES ('1.0.0', 'Initial platform release', false, true, ARRAY[
  'Core teacher dashboard',
  'Student management',
  'Upload and analysis system',
  'AI-powered insights',
  'Parent communication',
  'Platform admin controls'
]);

-- Insert default deployment checks
INSERT INTO public.deployment_checks (check_name, description, check_type, is_blocking, status) VALUES
  ('backups_verified', 'All database backups are current and verified', 'pre_deploy', true, 'pending'),
  ('no_critical_incidents', 'No unresolved critical incidents', 'pre_deploy', true, 'pending'),
  ('ai_health_check', 'AI services are healthy or properly disabled', 'pre_deploy', true, 'pending'),
  ('read_only_available', 'Read-only mode toggle is functional', 'pre_deploy', false, 'pending'),
  ('database_migrations', 'All database migrations applied successfully', 'post_deploy', true, 'pending'),
  ('edge_functions_healthy', 'All edge functions responding', 'post_deploy', true, 'pending'),
  ('rollback_tested', 'Rollback procedure verified', 'rollback', true, 'pending');

-- Add audit action for feature flag changes
ALTER TYPE public.platform_audit_action ADD VALUE IF NOT EXISTS 'feature_flag_changed';
ALTER TYPE public.platform_audit_action ADD VALUE IF NOT EXISTS 'deployment_initiated';
ALTER TYPE public.platform_audit_action ADD VALUE IF NOT EXISTS 'rollback_executed';
ALTER TYPE public.platform_audit_action ADD VALUE IF NOT EXISTS 'environment_changed';

-- Create indexes for performance
CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(enabled);
CREATE INDEX idx_migration_logs_name ON public.migration_logs(migration_name);
CREATE INDEX idx_app_versions_current ON public.app_versions(is_current);
CREATE INDEX idx_deployment_checks_type ON public.deployment_checks(check_type);
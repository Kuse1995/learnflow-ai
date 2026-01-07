
-- Create backup_type enum
CREATE TYPE public.backup_type AS ENUM ('full', 'incremental', 'manual');

-- Create backup_scope enum  
CREATE TYPE public.backup_scope AS ENUM ('system', 'school', 'class', 'student');

-- Create backup_status enum
CREATE TYPE public.backup_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Create restore_status enum
CREATE TYPE public.restore_status AS ENUM ('pending', 'previewing', 'confirmed', 'in_progress', 'completed', 'failed', 'cancelled');

-- Create backups table
CREATE TABLE public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type backup_type NOT NULL,
  scope backup_scope NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  class_id UUID REFERENCES public.classes(id),
  student_id UUID REFERENCES public.students(id),
  status backup_status NOT NULL DEFAULT 'pending',
  version_id TEXT NOT NULL,
  app_version TEXT,
  environment TEXT NOT NULL DEFAULT 'development',
  file_url TEXT,
  file_size_bytes BIGINT,
  record_counts JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create restore_jobs table
CREATE TABLE public.restore_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES public.backups(id) NOT NULL,
  scope backup_scope NOT NULL,
  target_school_id UUID REFERENCES public.schools(id),
  target_class_id UUID REFERENCES public.classes(id),
  target_student_id UUID REFERENCES public.students(id),
  status restore_status NOT NULL DEFAULT 'pending',
  preview_summary JSONB,
  impact_summary JSONB,
  records_restored JSONB DEFAULT '{}'::jsonb,
  initiated_by UUID NOT NULL,
  confirmed_by UUID,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backup_schedules table
CREATE TABLE public.backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  backup_type backup_type NOT NULL,
  scope backup_scope NOT NULL DEFAULT 'system',
  school_id UUID REFERENCES public.schools(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offline_export_queue for resume uploads
CREATE TABLE public.offline_export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) NOT NULL,
  export_type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_recovery_mode table
CREATE TABLE public.system_recovery_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID,
  read_only_mode BOOLEAN NOT NULL DEFAULT false,
  emergency_admin_enabled BOOLEAN NOT NULL DEFAULT false,
  expected_resolution TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default recovery mode row
INSERT INTO public.system_recovery_mode (is_active, read_only_mode) VALUES (false, false);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_export_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_recovery_mode ENABLE ROW LEVEL SECURITY;

-- Backups policies
CREATE POLICY "Super admins can manage all backups"
ON public.backups FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view backups for their school"
ON public.backups FOR SELECT
USING (school_id IS NOT NULL);

CREATE POLICY "Authenticated users can create manual backups"
ON public.backups FOR INSERT
WITH CHECK (backup_type = 'manual');

-- Restore jobs policies
CREATE POLICY "Super admins can manage all restore jobs"
ON public.restore_jobs FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Initiators can view their restore jobs"
ON public.restore_jobs FOR SELECT
USING (initiated_by = auth.uid());

CREATE POLICY "Authenticated users can create restore jobs"
ON public.restore_jobs FOR INSERT
WITH CHECK (initiated_by = auth.uid());

CREATE POLICY "Initiators can update their restore jobs"
ON public.restore_jobs FOR UPDATE
USING (initiated_by = auth.uid());

-- Backup schedules policies
CREATE POLICY "Super admins can manage backup schedules"
ON public.backup_schedules FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view backup schedules"
ON public.backup_schedules FOR SELECT
USING (true);

-- Offline export queue policies
CREATE POLICY "Users can manage their school exports"
ON public.offline_export_queue FOR ALL
USING (true);

-- System recovery mode policies
CREATE POLICY "Anyone can view recovery mode"
ON public.system_recovery_mode FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage recovery mode"
ON public.system_recovery_mode FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Function to generate version ID
CREATE OR REPLACE FUNCTION public.generate_backup_version_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'v' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 8);
END;
$$;

-- Create indexes
CREATE INDEX idx_backups_school ON public.backups(school_id);
CREATE INDEX idx_backups_status ON public.backups(status);
CREATE INDEX idx_backups_created ON public.backups(created_at DESC);
CREATE INDEX idx_restore_jobs_backup ON public.restore_jobs(backup_id);
CREATE INDEX idx_restore_jobs_status ON public.restore_jobs(status);
CREATE INDEX idx_offline_queue_school ON public.offline_export_queue(school_id);
CREATE INDEX idx_offline_queue_status ON public.offline_export_queue(status);

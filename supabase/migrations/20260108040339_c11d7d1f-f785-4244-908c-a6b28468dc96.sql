-- Backup Snapshots table (full daily backups)
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  backup_type TEXT NOT NULL DEFAULT 'snapshot' CHECK (backup_type IN ('snapshot', 'incremental')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  file_size_bytes BIGINT,
  record_counts JSONB DEFAULT '{}',
  encrypted BOOLEAN DEFAULT TRUE,
  storage_location TEXT,
  checksum TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Incidents table
CREATE TABLE IF NOT EXISTS public.system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('database_unavailable', 'ai_service_down', 'network_unstable', 'storage_failure', 'sync_failure', 'other')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  affected_services TEXT[] DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  auto_resolved BOOLEAN DEFAULT FALSE,
  user_message TEXT,
  internal_details JSONB,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restore Requests table
CREATE TABLE IF NOT EXISTS public.restore_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restore_point TIMESTAMPTZ NOT NULL,
  restore_scope TEXT NOT NULL CHECK (restore_scope IN ('full', 'attendance', 'fees', 'grades', 'students', 'classes')),
  backup_snapshot_id UUID REFERENCES public.backup_snapshots(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'failed', 'cancelled')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_restored INTEGER,
  data_loss_window_hours INTEGER,
  affected_modules TEXT[],
  dry_run BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  audit_log_id UUID,
  integrity_check_passed BOOLEAN,
  integrity_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offline Sync Queue table
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID REFERENCES public.classes(id),
  user_id TEXT NOT NULL,
  device_id TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('attendance', 'notes', 'grades', 'uploads')),
  entity_data JSONB NOT NULL,
  local_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  conflict_resolution TEXT CHECK (conflict_resolution IN ('local_wins', 'server_wins', 'admin_review', 'merged')),
  conflict_resolved_by TEXT,
  conflict_resolved_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- System Status table (for read-only mode)
CREATE TABLE IF NOT EXISTS public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) UNIQUE,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'read_only', 'maintenance')),
  status_message TEXT,
  affected_features TEXT[] DEFAULT '{}',
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_resolution TIMESTAMPTZ,
  auto_entered BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backup Schedule Configuration
CREATE TABLE IF NOT EXISTS public.backup_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) UNIQUE,
  snapshot_time TIME NOT NULL DEFAULT '02:00:00',
  snapshot_timezone TEXT NOT NULL DEFAULT 'Africa/Lusaka',
  snapshot_retention_days INTEGER NOT NULL DEFAULT 30,
  incremental_retention_days INTEGER NOT NULL DEFAULT 14,
  enabled BOOLEAN DEFAULT TRUE,
  last_snapshot_at TIMESTAMPTZ,
  next_snapshot_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedule_config ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin access)
CREATE POLICY "Admin view backup snapshots" ON public.backup_snapshots FOR SELECT USING (true);
CREATE POLICY "System manage backup snapshots" ON public.backup_snapshots FOR ALL USING (true);

CREATE POLICY "View system incidents" ON public.system_incidents FOR SELECT USING (true);
CREATE POLICY "System manage incidents" ON public.system_incidents FOR ALL USING (true);

CREATE POLICY "Admin view restore requests" ON public.restore_requests FOR SELECT USING (true);
CREATE POLICY "Admin manage restore requests" ON public.restore_requests FOR ALL USING (true);

CREATE POLICY "User view own sync queue" ON public.offline_sync_queue FOR SELECT USING (true);
CREATE POLICY "User manage own sync queue" ON public.offline_sync_queue FOR ALL USING (true);

CREATE POLICY "View system status" ON public.system_status FOR SELECT USING (true);
CREATE POLICY "Admin manage system status" ON public.system_status FOR ALL USING (true);

CREATE POLICY "Admin view backup config" ON public.backup_schedule_config FOR SELECT USING (true);
CREATE POLICY "Admin manage backup config" ON public.backup_schedule_config FOR ALL USING (true);

-- Function to check if system is read-only
CREATE OR REPLACE FUNCTION public.is_system_read_only(p_school_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_school_id IS NOT NULL THEN
    SELECT status INTO v_status FROM system_status WHERE school_id = p_school_id;
  ELSE
    SELECT status INTO v_status FROM system_status WHERE school_id IS NULL LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_status, 'operational') IN ('read_only', 'maintenance');
END;
$$;

-- Function to enter read-only mode
CREATE OR REPLACE FUNCTION public.enter_read_only_mode(
  p_school_id UUID,
  p_reason TEXT,
  p_auto BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_status (school_id, status, status_message, auto_entered)
  VALUES (p_school_id, 'read_only', p_reason, p_auto)
  ON CONFLICT (school_id) DO UPDATE SET
    status = 'read_only',
    status_message = p_reason,
    auto_entered = p_auto,
    entered_at = now(),
    updated_at = now();
  
  -- Log incident
  INSERT INTO system_incidents (school_id, incident_type, severity, user_message, auto_resolved)
  VALUES (p_school_id, 'other', 'warning', p_reason, FALSE);
  
  RETURN TRUE;
END;
$$;

-- Function to exit read-only mode
CREATE OR REPLACE FUNCTION public.exit_read_only_mode(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE system_status 
  SET status = 'operational', updated_at = now()
  WHERE school_id = p_school_id;
  
  -- Resolve related incidents
  UPDATE system_incidents
  SET resolved_at = now(), auto_resolved = TRUE
  WHERE school_id = p_school_id AND resolved_at IS NULL;
  
  RETURN TRUE;
END;
$$;

-- Function to queue offline data
CREATE OR REPLACE FUNCTION public.queue_offline_data(
  p_school_id UUID,
  p_class_id UUID,
  p_user_id TEXT,
  p_device_id TEXT,
  p_entity_type TEXT,
  p_entity_data JSONB,
  p_local_timestamp TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO offline_sync_queue (
    school_id, class_id, user_id, device_id, 
    entity_type, entity_data, local_timestamp
  )
  VALUES (
    p_school_id, p_class_id, p_user_id, p_device_id,
    p_entity_type, p_entity_data, p_local_timestamp
  )
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_school ON public.backup_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_status ON public.backup_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_system_incidents_school ON public.system_incidents(school_id);
CREATE INDEX IF NOT EXISTS idx_system_incidents_resolved ON public.system_incidents(resolved_at);
CREATE INDEX IF NOT EXISTS idx_restore_requests_school ON public.restore_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON public.offline_sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON public.offline_sync_queue(user_id);
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { logAuditEvent } from "@/lib/audit-logger";

export type BackupType = 'full' | 'incremental' | 'manual';
export type BackupScope = 'system' | 'school' | 'class' | 'student';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type RestoreStatus = 'pending' | 'previewing' | 'confirmed' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Backup {
  id: string;
  backup_type: BackupType;
  scope: BackupScope;
  school_id: string | null;
  class_id: string | null;
  student_id: string | null;
  status: BackupStatus;
  version_id: string;
  app_version: string | null;
  environment: string;
  file_url: string | null;
  file_size_bytes: number | null;
  record_counts: Json;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface RestoreJob {
  id: string;
  backup_id: string;
  scope: BackupScope;
  target_school_id: string | null;
  target_class_id: string | null;
  target_student_id: string | null;
  status: RestoreStatus;
  preview_summary: Json;
  impact_summary: Json;
  records_restored: Json;
  initiated_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SystemRecoveryMode {
  id: string;
  is_active: boolean;
  reason: string | null;
  activated_at: string | null;
  activated_by: string | null;
  read_only_mode: boolean;
  emergency_admin_enabled: boolean;
  expected_resolution: string | null;
  updated_at: string;
}

// Fetch backups
export function useBackups(schoolId?: string, limit = 50) {
  return useQuery({
    queryKey: ["backups", schoolId, limit],
    queryFn: async () => {
      let query = supabase
        .from("backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Backup[];
    },
  });
}

// Fetch single backup
export function useBackup(backupId?: string) {
  return useQuery({
    queryKey: ["backup", backupId],
    queryFn: async () => {
      if (!backupId) return null;
      const { data, error } = await supabase
        .from("backups")
        .select("*")
        .eq("id", backupId)
        .single();
      if (error) throw error;
      return data as Backup;
    },
    enabled: !!backupId,
  });
}

// Fetch restore jobs
export function useRestoreJobs(backupId?: string) {
  return useQuery({
    queryKey: ["restore-jobs", backupId],
    queryFn: async () => {
      let query = supabase
        .from("restore_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (backupId) {
        query = query.eq("backup_id", backupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RestoreJob[];
    },
  });
}

// Fetch system recovery mode
export function useSystemRecoveryMode() {
  return useQuery({
    queryKey: ["system-recovery-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_recovery_mode")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as SystemRecoveryMode;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}

// Create manual backup
export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scope: BackupScope;
      school_id?: string;
      class_id?: string;
      student_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate version ID
      const versionId = `v${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
      
      const { data, error } = await supabase
        .from("backups")
        .insert({
          backup_type: 'manual' as BackupType,
          scope: input.scope,
          school_id: input.school_id || null,
          class_id: input.class_id || null,
          student_id: input.student_id || null,
          status: 'pending' as BackupStatus,
          version_id: versionId,
          environment: import.meta.env.MODE || 'development',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the backup creation
      await logAuditEvent({
        actor_type: 'admin',
        actor_id: user?.id,
        action: 'backup_created',
        entity_type: 'backup',
        entity_id: data.id,
        summary: `Manual backup created for ${input.scope}`,
        metadata: { scope: input.scope, version_id: versionId },
      });

      return data as Backup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}

// Create restore job (preview mode)
export function useCreateRestoreJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      backup_id: string;
      scope: BackupScope;
      target_school_id?: string;
      target_class_id?: string;
      target_student_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("restore_jobs")
        .insert({
          backup_id: input.backup_id,
          scope: input.scope,
          target_school_id: input.target_school_id || null,
          target_class_id: input.target_class_id || null,
          target_student_id: input.target_student_id || null,
          status: 'previewing' as RestoreStatus,
          initiated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RestoreJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restore-jobs"] });
    },
  });
}

// Confirm and execute restore
export function useConfirmRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (restoreJobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("restore_jobs")
        .update({
          status: 'confirmed' as RestoreStatus,
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", restoreJobId)
        .select()
        .single();

      if (error) throw error;

      // Log the restore confirmation
      await logAuditEvent({
        actor_type: 'admin',
        actor_id: user.id,
        action: 'restore_confirmed',
        entity_type: 'restore_job',
        entity_id: restoreJobId,
        summary: `Restore job confirmed and queued for execution`,
        metadata: { backup_id: data.backup_id },
      });

      return data as RestoreJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restore-jobs"] });
    },
  });
}

// Cancel restore job
export function useCancelRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (restoreJobId: string) => {
      const { data, error } = await supabase
        .from("restore_jobs")
        .update({ status: 'cancelled' as RestoreStatus })
        .eq("id", restoreJobId)
        .select()
        .single();

      if (error) throw error;
      return data as RestoreJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restore-jobs"] });
    },
  });
}

// Toggle recovery mode (super admin only)
export function useToggleRecoveryMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      is_active: boolean;
      reason?: string;
      read_only_mode?: boolean;
      emergency_admin_enabled?: boolean;
      expected_resolution?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("system_recovery_mode")
        .update({
          is_active: input.is_active,
          reason: input.reason || null,
          read_only_mode: input.read_only_mode ?? false,
          emergency_admin_enabled: input.emergency_admin_enabled ?? false,
          expected_resolution: input.expected_resolution || null,
          activated_at: input.is_active ? new Date().toISOString() : null,
          activated_by: input.is_active ? user?.id : null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log recovery mode change
      await logAuditEvent({
        actor_type: 'admin',
        actor_id: user?.id,
        action: input.is_active ? 'recovery_mode_activated' : 'recovery_mode_deactivated',
        entity_type: 'system',
        entity_id: null,
        summary: input.is_active 
          ? `System recovery mode activated: ${input.reason || 'No reason provided'}`
          : 'System recovery mode deactivated',
        metadata: input,
      });

      return data as SystemRecoveryMode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-recovery-mode"] });
    },
  });
}

// Check version compatibility
export function checkVersionCompatibility(backupVersion: string, currentVersion: string): {
  compatible: boolean;
  warning: string | null;
} {
  // Simple version comparison - in production would be more sophisticated
  const backupDate = backupVersion.match(/v(\d{8})/)?.[1];
  const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  if (!backupDate) {
    return { compatible: true, warning: null };
  }

  const daysDiff = Math.abs(parseInt(currentDate) - parseInt(backupDate));
  
  if (daysDiff > 30) {
    return {
      compatible: true,
      warning: "This backup is more than 30 days old. Some data structures may have changed.",
    };
  }

  return { compatible: true, warning: null };
}

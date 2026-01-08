/**
 * Disaster Recovery System
 * 
 * Core utilities for backup management, restore operations,
 * and system continuity
 */

import { supabase } from '@/integrations/supabase/client';

export type BackupType = 'snapshot' | 'incremental';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
export type RestoreScope = 'full' | 'attendance' | 'fees' | 'grades' | 'students' | 'classes';
export type RestoreStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface BackupSnapshot {
  id: string;
  school_id: string | null;
  backup_type: BackupType;
  status: BackupStatus;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  file_size_bytes: number | null;
  record_counts: Record<string, number>;
  encrypted: boolean;
  storage_location: string | null;
  checksum: string | null;
  error_message: string | null;
}

export interface RestoreRequest {
  id: string;
  school_id: string;
  requested_by: string;
  requested_at: string;
  restore_point: string;
  restore_scope: RestoreScope;
  backup_snapshot_id: string | null;
  status: RestoreStatus;
  confirmed_at: string | null;
  confirmed_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  records_restored: number | null;
  data_loss_window_hours: number | null;
  affected_modules: string[] | null;
  dry_run: boolean;
  error_message: string | null;
  integrity_check_passed: boolean | null;
  integrity_check_at: string | null;
}

export interface BackupScheduleConfig {
  id: string;
  school_id: string | null;
  snapshot_time: string;
  snapshot_timezone: string;
  snapshot_retention_days: number;
  incremental_retention_days: number;
  enabled: boolean;
  last_snapshot_at: string | null;
  next_snapshot_at: string | null;
}

export const RESTORE_SCOPE_LABELS: Record<RestoreScope, string> = {
  full: 'Full System Restore',
  attendance: 'Attendance Records',
  fees: 'Financial Data',
  grades: 'Grades & Assessments',
  students: 'Student Records',
  classes: 'Class Data',
};

export const RESTORE_SCOPE_DESCRIPTIONS: Record<RestoreScope, string> = {
  full: 'Restore all data to the selected point in time',
  attendance: 'Restore attendance records only',
  fees: 'Restore payments, receipts, and fee assignments',
  grades: 'Restore grade and assessment data',
  students: 'Restore student profiles and enrollments',
  classes: 'Restore class configurations and assignments',
};

/**
 * Get available backup snapshots for a school
 */
export async function getBackupSnapshots(schoolId: string): Promise<BackupSnapshot[]> {
  const { data, error } = await supabase
    .from('backup_snapshots')
    .select('*')
    .eq('school_id', schoolId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Failed to fetch backup snapshots:', error);
    return [];
  }

  return (data || []) as unknown as BackupSnapshot[];
}

/**
 * Get backup schedule configuration
 */
export async function getBackupScheduleConfig(schoolId: string): Promise<BackupScheduleConfig | null> {
  const { data, error } = await supabase
    .from('backup_schedule_config')
    .select('*')
    .eq('school_id', schoolId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Failed to fetch backup config:', error);
    }
    return null;
  }

  return data as unknown as BackupScheduleConfig;
}

/**
 * Update backup schedule configuration
 */
export async function updateBackupScheduleConfig(
  schoolId: string,
  config: Partial<BackupScheduleConfig>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('backup_schedule_config')
    .upsert({
      school_id: schoolId,
      ...config,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Calculate data loss window (hours between restore point and now)
 */
export function calculateDataLossWindow(restorePoint: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - restorePoint.getTime();
  return Math.round(diffMs / (1000 * 60 * 60));
}

/**
 * Get affected modules for a restore scope
 */
export function getAffectedModules(scope: RestoreScope): string[] {
  const moduleMap: Record<RestoreScope, string[]> = {
    full: ['students', 'classes', 'attendance', 'fees', 'grades', 'uploads', 'insights'],
    attendance: ['attendance'],
    fees: ['payments', 'receipts', 'ledger', 'adjustments'],
    grades: ['grades', 'assessments', 'reports'],
    students: ['students', 'profiles', 'enrollments'],
    classes: ['classes', 'sections', 'assignments'],
  };
  return moduleMap[scope];
}

/**
 * Request a restore operation
 */
export async function requestRestore(
  schoolId: string,
  requestedBy: string,
  restorePoint: Date,
  scope: RestoreScope,
  snapshotId?: string,
  isDryRun: boolean = false
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const dataLossHours = calculateDataLossWindow(restorePoint);
  const affectedModules = getAffectedModules(scope);

  const { data, error } = await supabase
    .from('restore_requests')
    .insert({
      school_id: schoolId,
      requested_by: requestedBy,
      restore_point: restorePoint.toISOString(),
      restore_scope: scope,
      backup_snapshot_id: snapshotId || null,
      data_loss_window_hours: dataLossHours,
      affected_modules: affectedModules,
      dry_run: isDryRun,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, requestId: data.id };
}

/**
 * Confirm a restore request
 */
export async function confirmRestore(
  requestId: string,
  confirmedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('restore_requests')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: confirmedBy,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) {
    return { success: false, error: error.message };
  }

  // Log to audit
  await supabase
    .from('system_audit_logs')
    .insert([{
      user_id: confirmedBy,
      role_used: 'admin',
      action: 'restore_confirmed',
      entity_type: 'restore_request',
      entity_id: requestId,
      details: JSON.parse(JSON.stringify({ confirmed_at: new Date().toISOString() })),
    }]);

  return { success: true };
}

/**
 * Cancel a restore request
 */
export async function cancelRestore(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('restore_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get restore requests for a school
 */
export async function getRestoreRequests(schoolId: string): Promise<RestoreRequest[]> {
  const { data, error } = await supabase
    .from('restore_requests')
    .select('*')
    .eq('school_id', schoolId)
    .order('requested_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch restore requests:', error);
    return [];
  }

  return (data || []) as unknown as RestoreRequest[];
}

/**
 * Format file size for display
 */
export function formatBackupSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

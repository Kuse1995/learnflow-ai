/**
 * School Data Export System
 * 
 * Handles data ownership, export generation, and manifest creation
 * Schools own their data - platform is a processor, not owner
 */

import { supabase } from '@/integrations/supabase/client';

export type ExportLevel = 'operational' | 'insight' | 'full_archive';

export interface ExportManifest {
  school_id: string;
  school_name: string;
  export_type: ExportLevel;
  generated_at: string;
  record_counts: Record<string, number>;
  tables_included: string[];
  checksum: string;
  version: string;
}

export interface ExportJob {
  id: string;
  school_id: string;
  export_level: ExportLevel;
  status: 'pending' | 'processing' | 'ready' | 'expired' | 'failed';
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  record_counts: Record<string, number>;
  manifest: ExportManifest | null;
  error_message: string | null;
}

// Tables included in each export level
export const EXPORT_LEVEL_TABLES: Record<ExportLevel, string[]> = {
  operational: [
    'students',
    'classes',
    'attendance_records',
    'fee_payments',
    'fee_receipts',
    'student_fee_ledger',
    'student_fee_assignments',
    'fee_categories',
  ],
  insight: [
    // All operational tables
    'students',
    'classes',
    'attendance_records',
    'fee_payments',
    'fee_receipts',
    'student_fee_ledger',
    'student_fee_assignments',
    'fee_categories',
    // Plus insight tables
    'adaptive_support_plans',
    'teacher_action_logs',
    'parent_insight_summaries',
    'uploads',
    'upload_analyses',
    'ai_action_traces',
    'audit_logs',
  ],
  full_archive: [
    // All insight tables
    'students',
    'classes',
    'attendance_records',
    'fee_payments',
    'fee_receipts',
    'student_fee_ledger',
    'student_fee_assignments',
    'fee_categories',
    'adaptive_support_plans',
    'teacher_action_logs',
    'parent_insight_summaries',
    'uploads',
    'upload_analyses',
    'ai_action_traces',
    'audit_logs',
    // Plus archive tables
    'record_change_log',
    'system_audit_logs',
    'fee_audit_logs',
    'fee_adjustments',
    'fee_correction_requests',
    'communication_rules',
    'parent_messages',
    'delivery_attempts',
  ],
};

export const EXPORT_LEVEL_LABELS: Record<ExportLevel, string> = {
  operational: 'Operational Export',
  insight: 'Insight Export',
  full_archive: 'Full Archive',
};

export const EXPORT_LEVEL_DESCRIPTIONS: Record<ExportLevel, string> = {
  operational: 'Students, classes, attendance, fees, payments - core operational data',
  insight: 'Operational data plus learning profiles, support plans, teacher logs, parent insights',
  full_archive: 'Complete archive including soft-deleted records, change history, and system metadata',
};

/**
 * Generate a simple checksum for manifest integrity
 */
export function generateChecksum(data: Record<string, number>): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Create export manifest
 */
export function createExportManifest(
  schoolId: string,
  schoolName: string,
  exportType: ExportLevel,
  recordCounts: Record<string, number>
): ExportManifest {
  return {
    school_id: schoolId,
    school_name: schoolName,
    export_type: exportType,
    generated_at: new Date().toISOString(),
    record_counts: recordCounts,
    tables_included: EXPORT_LEVEL_TABLES[exportType],
    checksum: generateChecksum(recordCounts),
    version: '1.0.0',
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Check if school can request new export
 */
export async function canRequestExport(schoolId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('school_export_jobs')
    .select('id, status')
    .eq('school_id', schoolId)
    .in('status', ['pending', 'processing'])
    .limit(1);

  if (error) {
    return { allowed: false, reason: 'Failed to check export status' };
  }

  if (data && data.length > 0) {
    return { allowed: false, reason: 'An export is already in progress' };
  }

  return { allowed: true };
}

/**
 * Request a new export job
 */
export async function requestExport(
  schoolId: string,
  exportLevel: ExportLevel,
  requestedBy: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('log_export_request', {
    p_school_id: schoolId,
    p_export_level: exportLevel,
    p_requested_by: requestedBy,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, jobId: data as string };
}

/**
 * Get export jobs for a school
 */
export async function getExportJobs(schoolId: string): Promise<ExportJob[]> {
  const { data, error } = await supabase
    .from('school_export_jobs')
    .select('*')
    .eq('school_id', schoolId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch export jobs:', error);
    return [];
  }

  return (data || []) as unknown as ExportJob[];
}

/**
 * Generate CSV content from data
 */
export function generateCSV(data: Record<string, unknown>[], tableName: string): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate JSON content from data
 */
export function generateJSON(data: Record<string, unknown>[], tableName: string): string {
  return JSON.stringify({
    table: tableName,
    exported_at: new Date().toISOString(),
    record_count: data.length,
    data,
  }, null, 2);
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

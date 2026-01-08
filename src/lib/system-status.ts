/**
 * System Status Management
 * 
 * Handles read-only mode, degraded states, and system health monitoring
 */

import { supabase } from '@/integrations/supabase/client';

export type SystemStatusType = 'operational' | 'degraded' | 'read_only' | 'maintenance';
export type IncidentType = 'database_unavailable' | 'ai_service_down' | 'network_unstable' | 'storage_failure' | 'sync_failure' | 'other';
export type IncidentSeverity = 'info' | 'warning' | 'critical';

export interface SystemStatus {
  id: string;
  school_id: string | null;
  status: SystemStatusType;
  status_message: string | null;
  affected_features: string[];
  entered_at: string;
  expected_resolution: string | null;
  auto_entered: boolean;
}

export interface SystemIncident {
  id: string;
  school_id: string | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  affected_services: string[];
  detected_at: string;
  resolved_at: string | null;
  resolution_action: string | null;
  auto_resolved: boolean;
  user_message: string | null;
  internal_details: Record<string, unknown> | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export const STATUS_LABELS: Record<SystemStatusType, string> = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  read_only: 'Read-Only Mode',
  maintenance: 'Maintenance',
};

export const STATUS_DESCRIPTIONS: Record<SystemStatusType, string> = {
  operational: 'All systems are functioning normally',
  degraded: 'Some features may be slower than usual',
  read_only: 'Data viewing only - changes are temporarily disabled',
  maintenance: 'System is undergoing scheduled maintenance',
};

// User-friendly messages (non-technical, non-panic)
export const USER_FRIENDLY_MESSAGES: Record<IncidentType, string> = {
  database_unavailable: 'Some features are temporarily unavailable. Your data is safe.',
  ai_service_down: 'AI-powered features are temporarily unavailable. Other features work normally.',
  network_unstable: 'Connection is unstable. Some features may be delayed.',
  storage_failure: 'File uploads are temporarily unavailable. Other features work normally.',
  sync_failure: 'Data sync is delayed. Your local changes are saved.',
  other: 'Some features are temporarily unavailable. Your data is safe.',
};

/**
 * Get current system status
 */
export async function getSystemStatus(schoolId?: string): Promise<SystemStatus | null> {
  const { data, error } = schoolId
    ? await supabase.from('system_status').select('*').eq('school_id', schoolId).single()
    : await supabase.from('system_status').select('*').is('school_id', null).single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Failed to fetch system status:', error);
    }
    return null;
  }

  return data as unknown as SystemStatus;
}

/**
 * Check if system is read-only
 */
export async function isSystemReadOnly(schoolId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_system_read_only', {
    p_school_id: schoolId || null,
  });

  if (error) {
    console.error('Failed to check read-only status:', error);
    return false;
  }

  return data === true;
}

/**
 * Enter read-only mode
 */
export async function enterReadOnlyMode(
  schoolId: string,
  reason: string,
  isAuto: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('enter_read_only_mode', {
    p_school_id: schoolId,
    p_reason: reason,
    p_auto: isAuto,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Exit read-only mode
 */
export async function exitReadOnlyMode(schoolId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('exit_read_only_mode', {
    p_school_id: schoolId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get active incidents
 */
export async function getActiveIncidents(schoolId?: string): Promise<SystemIncident[]> {
  let query = supabase
    .from('system_incidents')
    .select('*')
    .is('resolved_at', null)
    .order('detected_at', { ascending: false });

  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch active incidents:', error);
    return [];
  }

  return (data || []) as unknown as SystemIncident[];
}

/**
 * Get incident history
 */
export async function getIncidentHistory(schoolId?: string, limit: number = 50): Promise<SystemIncident[]> {
  let query = supabase
    .from('system_incidents')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch incident history:', error);
    return [];
  }

  return (data || []) as unknown as SystemIncident[];
}

/**
 * Create a new incident
 */
export async function createIncident(
  incidentType: IncidentType,
  severity: IncidentSeverity,
  affectedServices: string[],
  schoolId?: string,
  internalDetails?: Record<string, unknown>
): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('system_incidents')
    .insert([{
      school_id: schoolId || null,
      incident_type: incidentType,
      severity,
      affected_services: affectedServices,
      user_message: USER_FRIENDLY_MESSAGES[incidentType],
      internal_details: internalDetails ? JSON.parse(JSON.stringify(internalDetails)) : null,
    }])
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, incidentId: data.id };
}

/**
 * Resolve an incident
 */
export async function resolveIncident(
  incidentId: string,
  resolutionAction: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('system_incidents')
    .update({
      resolved_at: new Date().toISOString(),
      resolution_action: resolutionAction,
    })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Acknowledge an incident (admin viewed it)
 */
export async function acknowledgeIncident(
  incidentId: string,
  acknowledgedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('system_incidents')
    .update({
      acknowledged_by: acknowledgedBy,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Calculate incident duration
 */
export function calculateIncidentDuration(incident: SystemIncident): string {
  const start = new Date(incident.detected_at);
  const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

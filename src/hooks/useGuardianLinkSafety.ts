import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { IncidentType, IncidentSeverity, IncidentStatus } from '@/lib/guardian-link-safety';

export interface LinkIncident {
  id: string;
  linkId: string | null;
  linkRequestId: string | null;
  guardianId: string;
  studentId: string;
  schoolId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  discoveredBy: string;
  discoveredByRole: string;
  discoveredAt: string;
  status: IncidentStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  linkRemoved: boolean;
  dataAccessedDuringIncident: boolean | null;
  parentNotified: boolean;
  schoolAdminNotified: boolean;
  rootCause: string | null;
  preventiveMeasures: string | null;
  createdAt: string;
}

export interface RetentionRecord {
  id: string;
  originalLinkId: string | null;
  guardianId: string;
  studentId: string;
  schoolId: string;
  relationshipType: string | null;
  permissionTier: string | null;
  deletedAt: string;
  deletedBy: string;
  deletionReason: string;
  retentionUntil: string;
  recoveredAt: string | null;
  recoveredBy: string | null;
}

/**
 * One-click unlink guardian from student
 */
export function useUnlinkGuardian() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      reason,
      isMislink = false,
    }: {
      guardianId: string;
      studentId: string;
      reason: string;
      isMislink?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('unlink_guardian_student', {
        p_guardian_id: guardianId,
        p_student_id: studentId,
        p_reason: reason,
        p_is_mislink: isMislink,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; link_id?: string; incident_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to unlink');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guardian-links'] });
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['retention-records'] });
      toast.success('Guardian unlinked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlink guardian');
    },
  });
}

/**
 * Recover a soft-deleted link
 */
export function useRecoverLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      retentionId,
      reason,
    }: {
      retentionId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('recover_guardian_link', {
        p_retention_id: retentionId,
        p_reason: reason,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to recover link');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-links'] });
      queryClient.invalidateQueries({ queryKey: ['retention-records'] });
      toast.success('Link recovered successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to recover link');
    },
  });
}

/**
 * Check for relink warnings
 */
export function useRelinkWarnings(guardianId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['relink-warnings', guardianId, studentId],
    queryFn: async () => {
      if (!guardianId || !studentId) return null;
      
      const { data, error } = await supabase.rpc('check_relink_warning', {
        p_guardian_id: guardianId,
        p_student_id: studentId,
      });
      
      if (error) throw error;
      
      return data as {
        has_warnings: boolean;
        warnings: string[];
        previous_links: number;
        incidents: number;
      };
    },
    enabled: !!guardianId && !!studentId,
  });
}

/**
 * Get retention records for a school
 */
export function useRetentionRecords(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['retention-records', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('guardian_link_retention')
        .select('*')
        .eq('school_id', schoolId)
        .is('recovered_at', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((row: any): RetentionRecord => ({
        id: row.id,
        originalLinkId: row.original_link_id,
        guardianId: row.guardian_id,
        studentId: row.student_id,
        schoolId: row.school_id,
        relationshipType: row.relationship_type,
        permissionTier: row.permission_tier,
        deletedAt: row.deleted_at,
        deletedBy: row.deleted_by,
        deletionReason: row.deletion_reason,
        retentionUntil: row.retention_until,
        recoveredAt: row.recovered_at,
        recoveredBy: row.recovered_by,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Get incidents for a school
 */
export function useSchoolIncidents(schoolId: string | undefined, statusFilter?: IncidentStatus[]) {
  return useQuery({
    queryKey: ['link-incidents', schoolId, statusFilter],
    queryFn: async () => {
      if (!schoolId) return [];
      
      let query = supabase
        .from('guardian_link_incidents')
        .select(`
          *,
          guardian:guardians(id, display_name),
          student:students(id, name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((row: any): LinkIncident & { guardian: any; student: any } => ({
        id: row.id,
        linkId: row.link_id,
        linkRequestId: row.link_request_id,
        guardianId: row.guardian_id,
        studentId: row.student_id,
        schoolId: row.school_id,
        incidentType: row.incident_type,
        severity: row.severity,
        description: row.description,
        discoveredBy: row.discovered_by,
        discoveredByRole: row.discovered_by_role,
        discoveredAt: row.discovered_at,
        status: row.status,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at,
        resolutionNotes: row.resolution_notes,
        linkRemoved: row.link_removed,
        dataAccessedDuringIncident: row.data_accessed_during_incident,
        parentNotified: row.parent_notified,
        schoolAdminNotified: row.school_admin_notified,
        rootCause: row.root_cause,
        preventiveMeasures: row.preventive_measures,
        createdAt: row.created_at,
        guardian: row.guardian,
        student: row.student,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Create a new incident
 */
export function useCreateIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      schoolId,
      incidentType,
      severity,
      description,
      dataAccessed,
    }: {
      guardianId: string;
      studentId: string;
      schoolId: string;
      incidentType: IncidentType;
      severity: IncidentSeverity;
      description: string;
      dataAccessed?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('guardian_link_incidents')
        .insert({
          guardian_id: guardianId,
          student_id: studentId,
          school_id: schoolId,
          incident_type: incidentType,
          severity,
          description,
          discovered_by: user?.id,
          discovered_by_role: 'school_admin',
          data_accessed_during_incident: dataAccessed,
          school_admin_notified: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-incidents'] });
      toast.success('Incident reported');
    },
    onError: () => {
      toast.error('Failed to report incident');
    },
  });
}

/**
 * Resolve an incident
 */
export function useResolveIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      incidentId,
      resolutionNotes,
      rootCause,
      preventiveMeasures,
    }: {
      incidentId: string;
      resolutionNotes: string;
      rootCause?: string;
      preventiveMeasures?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('guardian_link_incidents')
        .update({
          status: 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
          root_cause: rootCause,
          preventive_measures: preventiveMeasures,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-incidents'] });
      toast.success('Incident resolved');
    },
    onError: () => {
      toast.error('Failed to resolve incident');
    },
  });
}

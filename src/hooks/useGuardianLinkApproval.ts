import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  LinkRequest, 
  LinkAuditEntry, 
  LinkRequestStatus,
  LinkDuration,
  GuardianRole 
} from '@/lib/guardian-link-approval';
import type { ParentPermissionTier } from '@/lib/parent-permissions';

// Type for the raw database row
interface LinkRequestRow {
  id: string;
  guardian_id: string;
  student_id: string;
  relationship_type: GuardianRole;
  permission_tier: ParentPermissionTier;
  duration_type: LinkDuration;
  expires_at: string | null;
  status: LinkRequestStatus;
  initiated_by: string;
  initiated_by_role: string;
  school_id: string;
  requires_parent_confirmation: boolean;
  confirmation_method: string | null;
  confirmation_sent_at: string | null;
  confirmation_expires_at: string | null;
  confirmed_at: string | null;
  verification_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  activated_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
}

function toRequest(row: LinkRequestRow): LinkRequest {
  return {
    id: row.id,
    guardianId: row.guardian_id,
    studentId: row.student_id,
    relationshipType: row.relationship_type,
    permissionTier: row.permission_tier,
    durationType: row.duration_type,
    expiresAt: row.expires_at,
    status: row.status,
    initiatedBy: row.initiated_by,
    initiatedByRole: row.initiated_by_role,
    schoolId: row.school_id,
    requiresParentConfirmation: row.requires_parent_confirmation,
    confirmationMethod: row.confirmation_method,
    confirmationSentAt: row.confirmation_sent_at,
    confirmationExpiresAt: row.confirmation_expires_at,
    confirmedAt: row.confirmed_at,
    verificationNotes: row.verification_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    rejectionReason: row.rejection_reason,
    activatedAt: row.activated_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    createdAt: row.created_at,
  };
}

/**
 * Get all link requests for a school
 */
export function useSchoolLinkRequests(schoolId: string | undefined, statusFilter?: LinkRequestStatus[]) {
  return useQuery({
    queryKey: ['link-requests', schoolId, statusFilter],
    queryFn: async () => {
      if (!schoolId) return [];
      
      let query = supabase
        .from('guardian_link_requests')
        .select(`
          *,
          guardian:guardians(id, display_name, primary_phone, email),
          student:students(id, name, class_id)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((row: any) => ({
        ...toRequest(row),
        guardian: row.guardian,
        student: row.student,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Get pending link requests (for approval queue)
 */
export function usePendingLinkRequests(schoolId: string | undefined) {
  return useSchoolLinkRequests(schoolId, ['pending_review', 'pending_confirmation']);
}

/**
 * Get audit log for a link request
 */
export function useLinkAuditLog(requestId: string | undefined) {
  return useQuery({
    queryKey: ['link-audit', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('guardian_link_audit_log')
        .select('*')
        .eq('link_request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((row: any): LinkAuditEntry => ({
        id: row.id,
        linkRequestId: row.link_request_id,
        guardianId: row.guardian_id,
        studentId: row.student_id,
        action: row.action,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        performedBy: row.performed_by,
        performedByRole: row.performed_by_role,
        reason: row.reason,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    },
    enabled: !!requestId,
  });
}

/**
 * Initiate a new link request
 */
export function useInitiateLinkRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      relationshipType,
      permissionTier,
      durationType,
      expiresAt,
      requiresConfirmation,
      confirmationMethod,
      verificationNotes,
    }: {
      guardianId: string;
      studentId: string;
      relationshipType: GuardianRole;
      permissionTier: ParentPermissionTier;
      durationType: LinkDuration;
      expiresAt?: string;
      requiresConfirmation?: boolean;
      confirmationMethod?: string;
      verificationNotes?: string;
    }) => {
      const { data, error } = await supabase.rpc('initiate_guardian_link', {
        p_guardian_id: guardianId,
        p_student_id: studentId,
        p_relationship_type: relationshipType,
        p_permission_tier: permissionTier,
        p_duration_type: durationType,
        p_expires_at: expiresAt || null,
        p_requires_confirmation: requiresConfirmation || false,
        p_confirmation_method: confirmationMethod || null,
        p_verification_notes: verificationNotes || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      toast.success('Link request created');
    },
    onError: () => {
      toast.error('Failed to create link request');
    },
  });
}

/**
 * Approve a link request
 */
export function useApproveLinkRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      sendConfirmation,
      reviewNotes,
    }: {
      requestId: string;
      sendConfirmation?: boolean;
      reviewNotes?: string;
    }) => {
      const { data, error } = await supabase.rpc('approve_guardian_link', {
        p_request_id: requestId,
        p_send_confirmation: sendConfirmation || false,
        p_review_notes: reviewNotes || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['link-audit', variables.requestId] });
      toast.success(variables.sendConfirmation 
        ? 'Confirmation sent to parent' 
        : 'Link activated');
    },
    onError: () => {
      toast.error('Failed to approve request');
    },
  });
}

/**
 * Reject a link request
 */
export function useRejectLinkRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('reject_guardian_link', {
        p_request_id: requestId,
        p_reason: reason,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['link-audit', variables.requestId] });
      toast.success('Request rejected');
    },
    onError: () => {
      toast.error('Failed to reject request');
    },
  });
}

/**
 * Revoke an active link
 */
export function useRevokeLinkRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('revoke_guardian_link', {
        p_request_id: requestId,
        p_reason: reason,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      queryClient.invalidateQueries({ queryKey: ['link-audit', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-permissions'] });
      toast.success('Link revoked');
    },
    onError: () => {
      toast.error('Failed to revoke link');
    },
  });
}

/**
 * Confirm a link (parent-side, with code)
 */
export function useConfirmLinkRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      confirmationCode,
    }: {
      requestId: string;
      confirmationCode: string;
    }) => {
      const { data, error } = await supabase.rpc('confirm_guardian_link', {
        p_request_id: requestId,
        p_confirmation_code: confirmationCode,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-requests'] });
      toast.success('Link confirmed and activated');
    },
    onError: (error: any) => {
      if (error.message?.includes('expired')) {
        toast.error('Confirmation has expired');
      } else if (error.message?.includes('Invalid')) {
        toast.error('Invalid confirmation code');
      } else {
        toast.error('Failed to confirm link');
      }
    },
  });
}

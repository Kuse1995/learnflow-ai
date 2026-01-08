/**
 * Message Approval Hooks
 * 
 * Provides hooks for the teacher-controlled message review system.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { 
  type ApprovalRole,
  getApprovalPermissions,
  validateRejectionReason,
} from '@/lib/message-approval-rules';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ParentMessage = Database['public']['Tables']['parent_messages']['Row'];

export interface MessageEditHistory {
  id: string;
  message_id: string;
  edited_by: string;
  edited_at: string;
  edit_type: string;
  previous_body: string | null;
  new_body: string | null;
  previous_subject: string | null;
  new_subject: string | null;
  change_summary: string | null;
}

export interface MessageApprovalLog {
  id: string;
  message_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  role_at_action: string;
  reason: string | null;
  previous_status: string | null;
  new_status: string | null;
}

export interface MessageWithApprovalInfo extends ParentMessage {
  editHistory?: MessageEditHistory[];
  approvalLog?: MessageApprovalLog[];
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch messages requiring review (AI-generated pending approval)
 */
export function useMessagesForReview(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['messages-for-review', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('parent_messages')
        .select('*')
        .eq('school_id', schoolId)
        .eq('delivery_status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ParentMessage[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetch AI-generated drafts that need review
 */
export function useAIDraftsForReview(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['ai-drafts', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('parent_messages')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_ai_generated', true)
        .in('delivery_status', ['pending'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ParentMessage[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetch edit history for a message
 */
export function useMessageEditHistory(messageId: string | undefined) {
  return useQuery({
    queryKey: ['message-edit-history', messageId],
    queryFn: async () => {
      if (!messageId) return [];
      
      const { data, error } = await supabase
        .from('message_edit_history')
        .select('*')
        .eq('message_id', messageId)
        .order('edited_at', { ascending: false });
      
      if (error) throw error;
      return data as MessageEditHistory[];
    },
    enabled: !!messageId,
  });
}

/**
 * Fetch approval log for a message
 */
export function useMessageApprovalLog(messageId: string | undefined) {
  return useQuery({
    queryKey: ['message-approval-log', messageId],
    queryFn: async () => {
      if (!messageId) return [];
      
      const { data, error } = await supabase
        .from('message_approval_log')
        .select('*')
        .eq('message_id', messageId)
        .order('performed_at', { ascending: false });
      
      if (error) throw error;
      return data as MessageApprovalLog[];
    },
    enabled: !!messageId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Edit a message draft
 */
export function useEditMessageDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      messageId,
      newSubject,
      newBody,
      changeSummary,
    }: {
      messageId: string;
      newSubject?: string;
      newBody?: string;
      changeSummary?: string;
    }) => {
      const { data, error } = await supabase.rpc('edit_message_draft', {
        p_message_id: messageId,
        p_new_subject: newSubject ?? null,
        p_new_body: newBody ?? null,
        p_change_summary: changeSummary ?? null,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to edit message');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      queryClient.invalidateQueries({ 
        queryKey: ['message-edit-history', variables.messageId] 
      });
      
      toast({
        title: 'Message Updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to edit message.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Submit a message for approval
 */
export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase.rpc('submit_message_for_approval', {
        p_message_id: messageId,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit for approval');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      
      toast({
        title: 'Submitted for Approval',
        description: 'Message has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit for approval.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve and lock a message
 */
export function useApproveAndLockMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      messageId,
      reason,
    }: {
      messageId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('approve_and_lock_message', {
        p_message_id: messageId,
        p_reason: reason ?? null,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve message');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['message-queue'] });
      queryClient.invalidateQueries({ 
        queryKey: ['message-approval-log', variables.messageId] 
      });
      
      toast({
        title: 'Message Approved',
        description: 'Message has been approved, locked, and queued for delivery.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve message.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reject a message with reason
 */
export function useRejectMessageWithReason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      messageId,
      reason,
    }: {
      messageId: string;
      reason: string;
    }) => {
      // Validate rejection reason
      const validation = validateRejectionReason(reason);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const { data, error } = await supabase.rpc('reject_message_with_reason', {
        p_message_id: messageId,
        p_reason: reason,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject message');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      queryClient.invalidateQueries({ 
        queryKey: ['message-approval-log', variables.messageId] 
      });
      
      toast({
        title: 'Message Rejected',
        description: 'Message has been returned to draft for revision.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject message.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// COMBINED HOOK FOR MESSAGE WITH FULL CONTEXT
// ============================================================================

/**
 * Get a message with all approval context
 */
export function useMessageWithApprovalContext(
  messageId: string | undefined,
  role: ApprovalRole
) {
  const permissions = getApprovalPermissions(role);
  
  const messageQuery = useQuery({
    queryKey: ['parent-message', messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      const { data, error } = await supabase
        .from('parent_messages')
        .select('*')
        .eq('id', messageId)
        .single();
      
      if (error) throw error;
      return data as ParentMessage;
    },
    enabled: !!messageId,
  });
  
  const editHistoryQuery = useMessageEditHistory(
    permissions.canViewEditHistory ? messageId : undefined
  );
  
  const approvalLogQuery = useMessageApprovalLog(
    permissions.canViewApprovalLog ? messageId : undefined
  );
  
  const message = messageQuery.data;
  
  return {
    message: message ? {
      ...message,
      editHistory: editHistoryQuery.data,
      approvalLog: approvalLogQuery.data,
      canEdit: !message.is_locked && 
               ['draft', 'pending'].includes(message.delivery_status) &&
               permissions.canEditOwnDrafts,
      canApprove: message.delivery_status === 'pending' && 
                  permissions.canApproveMessages,
      canReject: message.delivery_status === 'pending' && 
                 permissions.canRejectMessages,
    } as MessageWithApprovalInfo : null,
    isLoading: messageQuery.isLoading || 
               editHistoryQuery.isLoading || 
               approvalLogQuery.isLoading,
    error: messageQuery.error || editHistoryQuery.error || approvalLogQuery.error,
  };
}

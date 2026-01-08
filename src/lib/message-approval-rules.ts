/**
 * Message Approval Rules
 * 
 * Defines the teacher-controlled review system for parent messages.
 * AI-generated messages MUST be reviewed before sending.
 */

// ============================================================================
// APPROVAL RULES
// ============================================================================

export const MESSAGE_APPROVAL_RULES = {
  // AI-generated messages ALWAYS require approval
  aiMessagesRequireApproval: true,
  
  // Once approved, message becomes immutable
  approvedMessagesAreLocked: true,
  
  // Teachers can edit drafts and pending messages
  editableStates: ['draft', 'pending'] as const,
  
  // Rejection requires a reason
  rejectionReasonRequired: true,
  
  // Minimum rejection reason length
  minRejectionReasonLength: 10,
};

// ============================================================================
// APPROVAL PERMISSIONS
// ============================================================================

export type ApprovalRole = 'teacher' | 'school_admin' | 'platform_admin';

export interface ApprovalPermissions {
  canCreateDrafts: boolean;
  canEditOwnDrafts: boolean;
  canEditOthersDrafts: boolean;
  canSubmitForApproval: boolean;
  canApproveMessages: boolean;
  canRejectMessages: boolean;
  canViewApprovalLog: boolean;
  canViewEditHistory: boolean;
}

export const APPROVAL_PERMISSIONS: Record<ApprovalRole, ApprovalPermissions> = {
  teacher: {
    canCreateDrafts: true,
    canEditOwnDrafts: true,
    canEditOthersDrafts: false,
    canSubmitForApproval: true,
    canApproveMessages: true, // Teachers can approve their own AI drafts
    canRejectMessages: false,
    canViewApprovalLog: true,
    canViewEditHistory: true,
  },
  school_admin: {
    canCreateDrafts: true,
    canEditOwnDrafts: true,
    canEditOthersDrafts: true,
    canSubmitForApproval: true,
    canApproveMessages: true,
    canRejectMessages: true,
    canViewApprovalLog: true,
    canViewEditHistory: true,
  },
  platform_admin: {
    canCreateDrafts: true,
    canEditOwnDrafts: true,
    canEditOthersDrafts: true,
    canSubmitForApproval: true,
    canApproveMessages: true,
    canRejectMessages: true,
    canViewApprovalLog: true,
    canViewEditHistory: true,
  },
};

// ============================================================================
// APPROVAL FLOW STATES
// ============================================================================

interface ApprovalState {
  label: string;
  description: string;
  allowedActions: string[];
  nextStates: string[];
  isLocked?: boolean;
  isTerminal?: boolean;
}

export const APPROVAL_FLOW: {
  states: Record<string, ApprovalState>;
  aiMessageFlow: { step: number; state: string; description: string }[];
} = {
  states: {
    draft: {
      label: 'Draft',
      description: 'Message is being composed or edited',
      allowedActions: ['edit', 'delete', 'submit'],
      nextStates: ['pending'],
      isLocked: false,
    },
    pending: {
      label: 'Pending Review',
      description: 'Awaiting teacher review and approval',
      allowedActions: ['edit', 'approve', 'reject'],
      nextStates: ['queued', 'draft'],
      isLocked: false,
    },
    queued: {
      label: 'Approved & Queued',
      description: 'Message approved and locked, ready for delivery',
      allowedActions: ['view'],
      nextStates: ['sent', 'failed'],
      isLocked: true,
    },
    sent: {
      label: 'Sent',
      description: 'Message has been sent to delivery provider',
      allowedActions: ['view'],
      nextStates: ['delivered', 'failed'],
      isLocked: true,
    },
    delivered: {
      label: 'Delivered',
      description: 'Message confirmed delivered to parent',
      allowedActions: ['view'],
      nextStates: [],
      isLocked: true,
      isTerminal: true,
    },
    failed: {
      label: 'Failed',
      description: 'Delivery failed',
      allowedActions: ['view'],
      nextStates: [],
      isLocked: true,
      isTerminal: true,
    },
  },
  
  aiMessageFlow: [
    { step: 1, state: 'draft', description: 'AI generates message draft' },
    { step: 2, state: 'draft', description: 'Teacher reviews and optionally edits' },
    { step: 3, state: 'pending', description: 'Teacher submits for approval' },
    { step: 4, state: 'queued', description: 'Teacher approves - message locks' },
    { step: 5, state: 'sent', description: 'System delivers message' },
  ],
};

// ============================================================================
// EDIT TYPES
// ============================================================================

export type EditType = 'created' | 'edited' | 'approved' | 'rejected' | 'submitted';

export const EDIT_TYPE_LABELS: Record<EditType, string> = {
  created: 'Created',
  edited: 'Edited',
  approved: 'Approved',
  rejected: 'Rejected',
  submitted: 'Submitted for Approval',
};

// ============================================================================
// REJECTION REASONS (common presets)
// ============================================================================

export const COMMON_REJECTION_REASONS = [
  'Content needs more specific details about the student',
  'Tone is not appropriate for parent communication',
  'Contains inaccurate information',
  'Message is too long or complex',
  'Missing important context',
  'Suggestion not aligned with school policy',
  'Duplicate of previously sent message',
  'Other (please specify)',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getApprovalPermissions(role: ApprovalRole): ApprovalPermissions {
  return APPROVAL_PERMISSIONS[role];
}

export function canEditMessage(
  messageStatus: string,
  isLocked: boolean,
  isOwner: boolean,
  role: ApprovalRole
): boolean {
  if (isLocked) return false;
  if (!MESSAGE_APPROVAL_RULES.editableStates.includes(messageStatus as any)) {
    return false;
  }
  
  const permissions = APPROVAL_PERMISSIONS[role];
  if (isOwner) return permissions.canEditOwnDrafts;
  return permissions.canEditOthersDrafts;
}

export function canApproveMessage(
  messageStatus: string,
  role: ApprovalRole
): boolean {
  if (messageStatus !== 'pending') return false;
  return APPROVAL_PERMISSIONS[role].canApproveMessages;
}

export function canRejectMessage(
  messageStatus: string,
  role: ApprovalRole
): boolean {
  if (messageStatus !== 'pending') return false;
  return APPROVAL_PERMISSIONS[role].canRejectMessages;
}

export function isMessageLocked(status: string): boolean {
  const state = APPROVAL_FLOW.states[status as keyof typeof APPROVAL_FLOW.states];
  return state?.isLocked ?? false;
}

export function validateRejectionReason(reason: string): { 
  valid: boolean; 
  error?: string;
} {
  if (!reason || reason.trim() === '') {
    return { valid: false, error: 'Rejection reason is required' };
  }
  if (reason.length < MESSAGE_APPROVAL_RULES.minRejectionReasonLength) {
    return { 
      valid: false, 
      error: `Reason must be at least ${MESSAGE_APPROVAL_RULES.minRejectionReasonLength} characters` 
    };
  }
  return { valid: true };
}

export function requiresApproval(isAiGenerated: boolean): boolean {
  if (isAiGenerated && MESSAGE_APPROVAL_RULES.aiMessagesRequireApproval) {
    return true;
  }
  return false;
}

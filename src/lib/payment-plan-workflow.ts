/**
 * Payment Plan Approval Workflow
 * State machine and role-based permissions for payment plan management
 */

import { supabase } from '@/integrations/supabase/client';
import { PaymentPlanStatus } from './payment-plan-system';

// ==================== ROLE DEFINITIONS ====================

export type PlanWorkflowRole = 
  | 'admin'
  | 'bursar'
  | 'finance_officer'
  | 'teacher'
  | 'parent';

export interface RolePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canActivate: boolean;
  canCancel: boolean;
  canView: boolean;
  canViewAll: boolean;
}

// Role permission matrix
export const ROLE_PERMISSIONS: Record<PlanWorkflowRole, RolePermissions> = {
  admin: {
    canCreate: true,
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    canReject: true,
    canActivate: true,
    canCancel: true,
    canView: true,
    canViewAll: true
  },
  bursar: {
    canCreate: true,
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    canReject: true,
    canActivate: true,
    canCancel: true,
    canView: true,
    canViewAll: true
  },
  finance_officer: {
    canCreate: true,
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    canReject: true,
    canActivate: true,
    canCancel: false, // Cannot cancel, only admin/bursar
    canView: true,
    canViewAll: true
  },
  teacher: {
    canCreate: false,
    canEdit: false,
    canSubmit: false,
    canApprove: false, // Explicitly cannot approve
    canReject: false,
    canActivate: false,
    canCancel: false,
    canView: true, // Can view plans for their students
    canViewAll: false
  },
  parent: {
    canCreate: false, // Cannot self-create
    canEdit: false,
    canSubmit: false,
    canApprove: false,
    canReject: false,
    canActivate: false,
    canCancel: false,
    canView: true, // Can view own child's plan
    canViewAll: false
  }
};

// ==================== STATE MACHINE ====================

export interface StateTransition {
  from: PaymentPlanStatus;
  to: PaymentPlanStatus;
  action: WorkflowAction;
  allowedRoles: PlanWorkflowRole[];
  requiresTimestamp: boolean;
  requiresActor: boolean;
  requiresReason?: boolean;
}

export type WorkflowAction = 
  | 'submit'
  | 'approve'
  | 'reject'
  | 'activate'
  | 'complete'
  | 'cancel'
  | 'reopen';

// Valid state transitions
export const STATE_TRANSITIONS: StateTransition[] = [
  // Draft → Pending Approval
  {
    from: 'draft',
    to: 'pending_approval',
    action: 'submit',
    allowedRoles: ['admin', 'bursar', 'finance_officer'],
    requiresTimestamp: true,
    requiresActor: true
  },
  
  // Pending Approval → Approved
  {
    from: 'pending_approval',
    to: 'approved',
    action: 'approve',
    allowedRoles: ['admin', 'bursar', 'finance_officer'], // NOT teacher, NOT parent
    requiresTimestamp: true,
    requiresActor: true
  },
  
  // Pending Approval → Draft (rejected)
  {
    from: 'pending_approval',
    to: 'draft',
    action: 'reject',
    allowedRoles: ['admin', 'bursar', 'finance_officer'],
    requiresTimestamp: true,
    requiresActor: true,
    requiresReason: true
  },
  
  // Approved → Active
  {
    from: 'approved',
    to: 'active',
    action: 'activate',
    allowedRoles: ['admin', 'bursar', 'finance_officer'],
    requiresTimestamp: true,
    requiresActor: true
  },
  
  // Active → Completed
  {
    from: 'active',
    to: 'completed',
    action: 'complete',
    allowedRoles: ['admin', 'bursar', 'finance_officer'],
    requiresTimestamp: true,
    requiresActor: true
  },
  
  // Draft → Cancelled
  {
    from: 'draft',
    to: 'cancelled',
    action: 'cancel',
    allowedRoles: ['admin', 'bursar'],
    requiresTimestamp: true,
    requiresActor: true,
    requiresReason: true
  },
  
  // Pending Approval → Cancelled
  {
    from: 'pending_approval',
    to: 'cancelled',
    action: 'cancel',
    allowedRoles: ['admin', 'bursar'],
    requiresTimestamp: true,
    requiresActor: true,
    requiresReason: true
  },
  
  // Approved → Cancelled
  {
    from: 'approved',
    to: 'cancelled',
    action: 'cancel',
    allowedRoles: ['admin', 'bursar'],
    requiresTimestamp: true,
    requiresActor: true,
    requiresReason: true
  },
  
  // Active → Cancelled
  {
    from: 'active',
    to: 'cancelled',
    action: 'cancel',
    allowedRoles: ['admin', 'bursar'],
    requiresTimestamp: true,
    requiresActor: true,
    requiresReason: true
  }
];

// ==================== WORKFLOW HISTORY ====================

export interface WorkflowHistoryEntry {
  id: string;
  planId: string;
  action: WorkflowAction;
  fromStatus: PaymentPlanStatus;
  toStatus: PaymentPlanStatus;
  performedBy: string;
  performedByRole: PlanWorkflowRole;
  performedAt: string;
  reason?: string;
  notes?: string;
  ipAddress?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a role can perform an action
 */
export function canPerformAction(
  role: PlanWorkflowRole,
  action: WorkflowAction,
  currentStatus: PaymentPlanStatus
): boolean {
  const transition = STATE_TRANSITIONS.find(
    t => t.from === currentStatus && t.action === action
  );
  
  if (!transition) return false;
  return transition.allowedRoles.includes(role);
}

/**
 * Get available actions for a role given current status
 */
export function getAvailableActions(
  role: PlanWorkflowRole,
  currentStatus: PaymentPlanStatus
): WorkflowAction[] {
  return STATE_TRANSITIONS
    .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
    .map(t => t.action);
}

/**
 * Validate a state transition
 */
export function validateTransition(
  currentStatus: PaymentPlanStatus,
  targetStatus: PaymentPlanStatus,
  role: PlanWorkflowRole,
  reason?: string
): { valid: boolean; error?: string } {
  const transition = STATE_TRANSITIONS.find(
    t => t.from === currentStatus && t.to === targetStatus
  );
  
  if (!transition) {
    return { 
      valid: false, 
      error: `Invalid transition from ${currentStatus} to ${targetStatus}` 
    };
  }
  
  if (!transition.allowedRoles.includes(role)) {
    return { 
      valid: false, 
      error: `Role '${role}' is not authorized to perform this action` 
    };
  }
  
  if (transition.requiresReason && !reason) {
    return { 
      valid: false, 
      error: 'A reason is required for this action' 
    };
  }
  
  return { valid: true };
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: PlanWorkflowRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user has approval authority
 */
export function hasApprovalAuthority(role: PlanWorkflowRole): boolean {
  return ROLE_PERMISSIONS[role].canApprove;
}

/**
 * Get the next expected status after an action
 */
export function getNextStatus(
  currentStatus: PaymentPlanStatus,
  action: WorkflowAction
): PaymentPlanStatus | null {
  const transition = STATE_TRANSITIONS.find(
    t => t.from === currentStatus && t.action === action
  );
  return transition?.to ?? null;
}

// ==================== WORKFLOW OPERATIONS ====================

export interface TransitionResult {
  success: boolean;
  error?: string;
  newStatus?: PaymentPlanStatus;
  historyEntryId?: string;
}

/**
 * Execute a workflow transition
 */
export async function executeTransition(
  planId: string,
  action: WorkflowAction,
  performedBy: string,
  performedByRole: PlanWorkflowRole,
  options?: {
    reason?: string;
    notes?: string;
  }
): Promise<TransitionResult> {
  try {
    // Get current plan status
    const { data: plan, error: fetchError } = await supabase
      .from('payment_plans')
      .select('status')
      .eq('id', planId)
      .single();
    
    if (fetchError || !plan) {
      return { success: false, error: 'Plan not found' };
    }
    
    const currentStatus = plan.status as PaymentPlanStatus;
    
    // Find valid transition
    const transition = STATE_TRANSITIONS.find(
      t => t.from === currentStatus && t.action === action
    );
    
    if (!transition) {
      return { 
        success: false, 
        error: `Cannot ${action} a plan in ${currentStatus} status` 
      };
    }
    
    // Validate role
    if (!transition.allowedRoles.includes(performedByRole)) {
      return { 
        success: false, 
        error: `${performedByRole} is not authorized to ${action} payment plans` 
      };
    }
    
    // Check reason requirement
    if (transition.requiresReason && !options?.reason) {
      return { success: false, error: 'A reason is required for this action' };
    }
    
    const now = new Date().toISOString();
    
    // Build update payload based on action
    const updatePayload: Record<string, unknown> = {
      status: transition.to,
      updated_at: now
    };
    
    // Add action-specific fields
    switch (action) {
      case 'approve':
        updatePayload.approved_by = performedBy;
        updatePayload.approved_at = now;
        updatePayload.approval_notes = options?.notes;
        break;
      case 'cancel':
        updatePayload.cancelled_by = performedBy;
        updatePayload.cancelled_at = now;
        updatePayload.cancellation_reason = options?.reason;
        break;
      case 'activate':
        updatePayload.activated_at = now;
        updatePayload.activated_by = performedBy;
        break;
      case 'complete':
        updatePayload.completed_at = now;
        updatePayload.completed_by = performedBy;
        break;
    }
    
    // Execute the update
    const { error: updateError } = await supabase
      .from('payment_plans')
      .update(updatePayload)
      .eq('id', planId)
      .eq('status', currentStatus); // Optimistic locking
    
    if (updateError) {
      return { success: false, error: 'Failed to update plan status' };
    }
    
    // Log to workflow history
    const { data: historyEntry, error: historyError } = await supabase
      .from('payment_plan_workflow_history')
      .insert({
        plan_id: planId,
        action,
        from_status: currentStatus,
        to_status: transition.to,
        performed_by: performedBy,
        performed_by_role: performedByRole,
        reason: options?.reason,
        notes: options?.notes
      })
      .select('id')
      .single();
    
    if (historyError) {
      console.warn('Failed to log workflow history:', historyError);
    }
    
    return {
      success: true,
      newStatus: transition.to,
      historyEntryId: historyEntry?.id
    };
  } catch (err) {
    console.error('Workflow transition failed:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Submit a plan for approval
 */
export async function submitPlanForApproval(
  planId: string,
  submittedBy: string,
  role: PlanWorkflowRole
): Promise<TransitionResult> {
  return executeTransition(planId, 'submit', submittedBy, role);
}

/**
 * Approve a payment plan
 */
export async function approvePlan(
  planId: string,
  approvedBy: string,
  role: PlanWorkflowRole,
  notes?: string
): Promise<TransitionResult> {
  // Double-check role has approval authority
  if (!hasApprovalAuthority(role)) {
    return { 
      success: false, 
      error: `${role} does not have approval authority` 
    };
  }
  
  return executeTransition(planId, 'approve', approvedBy, role, { notes });
}

/**
 * Reject a payment plan (returns to draft)
 */
export async function rejectPlan(
  planId: string,
  rejectedBy: string,
  role: PlanWorkflowRole,
  reason: string
): Promise<TransitionResult> {
  if (!reason.trim()) {
    return { success: false, error: 'A rejection reason is required' };
  }
  
  return executeTransition(planId, 'reject', rejectedBy, role, { reason });
}

/**
 * Activate an approved plan
 */
export async function activatePlan(
  planId: string,
  activatedBy: string,
  role: PlanWorkflowRole
): Promise<TransitionResult> {
  return executeTransition(planId, 'activate', activatedBy, role);
}

/**
 * Complete a plan (all installments paid)
 */
export async function completePlan(
  planId: string,
  completedBy: string,
  role: PlanWorkflowRole
): Promise<TransitionResult> {
  return executeTransition(planId, 'complete', completedBy, role);
}

/**
 * Cancel a payment plan
 */
export async function cancelPlan(
  planId: string,
  cancelledBy: string,
  role: PlanWorkflowRole,
  reason: string
): Promise<TransitionResult> {
  if (!reason.trim()) {
    return { success: false, error: 'A cancellation reason is required' };
  }
  
  return executeTransition(planId, 'cancel', cancelledBy, role, { reason });
}

/**
 * Get workflow history for a plan
 */
export async function getWorkflowHistory(
  planId: string
): Promise<WorkflowHistoryEntry[]> {
  const { data, error } = await supabase
    .from('payment_plan_workflow_history')
    .select('*')
    .eq('plan_id', planId)
    .order('performed_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch workflow history:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    planId: row.plan_id,
    action: row.action as WorkflowAction,
    fromStatus: row.from_status as PaymentPlanStatus,
    toStatus: row.to_status as PaymentPlanStatus,
    performedBy: row.performed_by,
    performedByRole: row.performed_by_role as PlanWorkflowRole,
    performedAt: row.performed_at,
    reason: row.reason,
    notes: row.notes,
    ipAddress: row.ip_address
  }));
}

/**
 * Get pending approvals for a role
 */
export async function getPendingApprovals(
  schoolId: string,
  role: PlanWorkflowRole
): Promise<{ planId: string; studentId: string; submittedAt: string }[]> {
  if (!hasApprovalAuthority(role)) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('payment_plans')
    .select('id, student_id, updated_at')
    .eq('school_id', schoolId)
    .eq('status', 'pending_approval')
    .order('updated_at', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch pending approvals:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    planId: row.id,
    studentId: row.student_id,
    submittedAt: row.updated_at
  }));
}

// ==================== ACTION DISPLAY CONFIG ====================

export const ACTION_DISPLAY: Record<WorkflowAction, {
  label: string;
  icon: string;
  color: string;
  confirmMessage: string;
}> = {
  submit: {
    label: 'Submit for Approval',
    icon: 'Send',
    color: 'text-blue-600',
    confirmMessage: 'Submit this plan for approval?'
  },
  approve: {
    label: 'Approve',
    icon: 'CheckCircle',
    color: 'text-green-600',
    confirmMessage: 'Approve this payment plan?'
  },
  reject: {
    label: 'Reject',
    icon: 'XCircle',
    color: 'text-red-600',
    confirmMessage: 'Reject this plan? It will return to draft status.'
  },
  activate: {
    label: 'Activate',
    icon: 'Play',
    color: 'text-green-600',
    confirmMessage: 'Activate this plan? Payments can then be recorded.'
  },
  complete: {
    label: 'Mark Complete',
    icon: 'CheckCircle2',
    color: 'text-green-700',
    confirmMessage: 'Mark this plan as completed?'
  },
  cancel: {
    label: 'Cancel',
    icon: 'Ban',
    color: 'text-red-600',
    confirmMessage: 'Cancel this payment plan? This action cannot be undone.'
  },
  reopen: {
    label: 'Reopen',
    icon: 'RotateCcw',
    color: 'text-amber-600',
    confirmMessage: 'Reopen this plan for editing?'
  }
};

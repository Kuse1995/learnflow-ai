/**
 * Fee Audit and History Tracking System
 * Immutable logging of all fee-related changes with correction workflow
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from './audit-logger';
import type { Json } from '@/integrations/supabase/types';

// Action types for fee audit
export type FeeAuditActionType =
  | 'charge_created'
  | 'payment_recorded'
  | 'payment_corrected'
  | 'waiver_applied'
  | 'waiver_reversed'
  | 'fee_assigned'
  | 'fee_unassigned'
  | 'structure_changed'
  | 'balance_adjusted'
  | 'arrangement_created'
  | 'arrangement_updated'
  | 'arrangement_completed'
  | 'arrangement_defaulted'
  | 'reversal_created'
  | 'refund_issued'
  | 'category_changed'
  | 'late_fee_applied'
  | 'late_fee_waived';

export type FeeEntityType =
  | 'ledger_entry'
  | 'fee_payment'
  | 'fee_structure'
  | 'fee_assignment'
  | 'fee_category'
  | 'payment_arrangement';

export type CorrectionType =
  | 'amount_error'
  | 'wrong_student'
  | 'wrong_category'
  | 'duplicate_entry'
  | 'date_error'
  | 'method_error'
  | 'other';

export type CorrectionRequestStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'cancelled';

export type FeeAuditRole = 'bursar' | 'admin' | 'school_admin' | 'system' | 'teacher';

// Fee audit log entry
export interface FeeAuditLog {
  id: string;
  schoolId: string;
  studentId: string;
  actionType: FeeAuditActionType;
  entityType: FeeEntityType;
  entityId: string;
  relatedEntityId?: string;
  previousValues?: Record<string, unknown>;
  newValues: Record<string, unknown>;
  amountAffected?: number;
  currency: string;
  performedBy?: string;
  performedByRole: FeeAuditRole;
  reason: string;
  notes?: string;
  isCorrection: boolean;
  correctsAuditId?: string;
  correctionType?: CorrectionType;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  createdAt: string;
  effectiveDate: string;
  academicYear: number;
  term?: number;
  entryHash: string;
  previousHash?: string;
  sequenceNumber: number;
}

// Correction request
export interface CorrectionRequest {
  id: string;
  schoolId: string;
  studentId: string;
  originalLedgerEntryId: string;
  originalPaymentId?: string;
  originalAmount: number;
  originalPaymentMethod?: string;
  originalPaymentDate?: string;
  correctionType: CorrectionType;
  correctedAmount?: number;
  correctedPaymentMethod?: string;
  correctedPaymentDate?: string;
  correctedCategoryId?: string;
  reason: string;
  supportingEvidence?: string;
  requestedBy: string;
  requestedByRole: string;
  requestedAt: string;
  status: CorrectionRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  appliedBy?: string;
  appliedAt?: string;
  resultingLedgerEntryId?: string;
  resultingAuditLogId?: string;
}

// Input for creating audit log
export interface FeeAuditInput {
  schoolId: string;
  studentId: string;
  actionType: FeeAuditActionType;
  entityType: FeeEntityType;
  entityId: string;
  newValues: Record<string, unknown>;
  amountAffected?: number;
  performedBy?: string;
  performedByRole: FeeAuditRole;
  reason: string;
  academicYear: number;
  term?: number;
  previousValues?: Record<string, unknown>;
  relatedEntityId?: string;
  isCorrection?: boolean;
  correctsAuditId?: string;
  correctionType?: CorrectionType;
  requiresApproval?: boolean;
  notes?: string;
}

// Correction request input
export interface CorrectionRequestInput {
  schoolId: string;
  studentId: string;
  originalLedgerEntryId: string;
  originalPaymentId?: string;
  originalAmount: number;
  originalPaymentMethod?: string;
  originalPaymentDate?: string;
  correctionType: CorrectionType;
  correctedAmount?: number;
  correctedPaymentMethod?: string;
  correctedPaymentDate?: string;
  correctedCategoryId?: string;
  reason: string;
  supportingEvidence?: string;
  requestedBy: string;
  requestedByRole: string;
}

// Audit action configuration
export const AUDIT_ACTION_CONFIG: Record<FeeAuditActionType, {
  label: string;
  icon: string;
  color: string;
  requiresApproval: boolean;
  affectsBalance: boolean;
}> = {
  charge_created: {
    label: 'Charge Created',
    icon: 'Plus',
    color: 'text-blue-600',
    requiresApproval: false,
    affectsBalance: true
  },
  payment_recorded: {
    label: 'Payment Recorded',
    icon: 'DollarSign',
    color: 'text-green-600',
    requiresApproval: false,
    affectsBalance: true
  },
  payment_corrected: {
    label: 'Payment Corrected',
    icon: 'Edit',
    color: 'text-orange-600',
    requiresApproval: true,
    affectsBalance: true
  },
  waiver_applied: {
    label: 'Waiver Applied',
    icon: 'Gift',
    color: 'text-purple-600',
    requiresApproval: true,
    affectsBalance: true
  },
  waiver_reversed: {
    label: 'Waiver Reversed',
    icon: 'RotateCcw',
    color: 'text-red-600',
    requiresApproval: true,
    affectsBalance: true
  },
  fee_assigned: {
    label: 'Fee Assigned',
    icon: 'UserPlus',
    color: 'text-blue-600',
    requiresApproval: false,
    affectsBalance: true
  },
  fee_unassigned: {
    label: 'Fee Unassigned',
    icon: 'UserMinus',
    color: 'text-gray-600',
    requiresApproval: true,
    affectsBalance: true
  },
  structure_changed: {
    label: 'Fee Structure Changed',
    icon: 'Settings',
    color: 'text-amber-600',
    requiresApproval: true,
    affectsBalance: false
  },
  balance_adjusted: {
    label: 'Balance Adjusted',
    icon: 'Scale',
    color: 'text-orange-600',
    requiresApproval: true,
    affectsBalance: true
  },
  arrangement_created: {
    label: 'Payment Plan Created',
    icon: 'Calendar',
    color: 'text-teal-600',
    requiresApproval: true,
    affectsBalance: false
  },
  arrangement_updated: {
    label: 'Payment Plan Updated',
    icon: 'CalendarClock',
    color: 'text-teal-600',
    requiresApproval: true,
    affectsBalance: false
  },
  arrangement_completed: {
    label: 'Payment Plan Completed',
    icon: 'CheckCircle',
    color: 'text-green-600',
    requiresApproval: false,
    affectsBalance: false
  },
  arrangement_defaulted: {
    label: 'Payment Plan Defaulted',
    icon: 'AlertTriangle',
    color: 'text-red-600',
    requiresApproval: false,
    affectsBalance: false
  },
  reversal_created: {
    label: 'Reversal Created',
    icon: 'Undo',
    color: 'text-red-600',
    requiresApproval: true,
    affectsBalance: true
  },
  refund_issued: {
    label: 'Refund Issued',
    icon: 'ArrowLeftRight',
    color: 'text-purple-600',
    requiresApproval: true,
    affectsBalance: true
  },
  category_changed: {
    label: 'Category Changed',
    icon: 'FolderEdit',
    color: 'text-gray-600',
    requiresApproval: false,
    affectsBalance: false
  },
  late_fee_applied: {
    label: 'Late Fee Applied',
    icon: 'Clock',
    color: 'text-red-600',
    requiresApproval: false,
    affectsBalance: true
  },
  late_fee_waived: {
    label: 'Late Fee Waived',
    icon: 'ClockOff',
    color: 'text-green-600',
    requiresApproval: true,
    affectsBalance: true
  }
};

// Correction type configuration
export const CORRECTION_TYPE_CONFIG: Record<CorrectionType, {
  label: string;
  description: string;
  requiresNewValue: boolean;
}> = {
  amount_error: {
    label: 'Amount Error',
    description: 'The recorded amount was incorrect',
    requiresNewValue: true
  },
  wrong_student: {
    label: 'Wrong Student',
    description: 'Payment was recorded against the wrong student',
    requiresNewValue: true
  },
  wrong_category: {
    label: 'Wrong Category',
    description: 'Payment was assigned to the wrong fee category',
    requiresNewValue: true
  },
  duplicate_entry: {
    label: 'Duplicate Entry',
    description: 'This entry was recorded more than once',
    requiresNewValue: false
  },
  date_error: {
    label: 'Date Error',
    description: 'The payment date was recorded incorrectly',
    requiresNewValue: true
  },
  method_error: {
    label: 'Payment Method Error',
    description: 'The payment method was recorded incorrectly',
    requiresNewValue: true
  },
  other: {
    label: 'Other',
    description: 'Other correction reason',
    requiresNewValue: false
  }
};

/**
 * Log a fee audit event
 */
export async function logFeeAudit(input: FeeAuditInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('insert_fee_audit_log', {
      p_school_id: input.schoolId,
      p_student_id: input.studentId,
      p_action_type: input.actionType,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_new_values: input.newValues as Json,
      p_amount_affected: input.amountAffected || null,
      p_performed_by: input.performedBy || null,
      p_performed_by_role: input.performedByRole,
      p_reason: input.reason,
      p_academic_year: input.academicYear,
      p_term: input.term || null,
      p_previous_values: (input.previousValues || null) as Json,
      p_related_entity_id: input.relatedEntityId || null,
      p_is_correction: input.isCorrection || false,
      p_corrects_audit_id: input.correctsAuditId || null,
      p_correction_type: input.correctionType || null,
      p_requires_approval: input.requiresApproval || AUDIT_ACTION_CONFIG[input.actionType].requiresApproval,
      p_notes: input.notes || null
    });

    if (error) {
      console.error('Failed to log fee audit:', error);
      return null;
    }

    // Also log to main audit system for cross-reference
    await logAuditEvent({
      actor_type: input.performedByRole === 'system' ? 'system' : 'admin',
      actor_id: input.performedBy,
      action: `fee_${input.actionType}`,
      entity_type: input.entityType,
      entity_id: input.entityId,
      summary: `${AUDIT_ACTION_CONFIG[input.actionType].label}: ${input.reason}`,
      metadata: {
        student_id: input.studentId,
        amount: input.amountAffected,
        is_correction: input.isCorrection
      }
    });

    return data as string;
  } catch (err) {
    console.error('Fee audit error:', err);
    return null;
  }
}

/**
 * Create a correction request
 */
export async function createCorrectionRequest(
  input: CorrectionRequestInput
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('fee_correction_requests')
      .insert({
        school_id: input.schoolId,
        student_id: input.studentId,
        original_ledger_entry_id: input.originalLedgerEntryId,
        original_payment_id: input.originalPaymentId,
        original_amount: input.originalAmount,
        original_payment_method: input.originalPaymentMethod,
        original_payment_date: input.originalPaymentDate,
        correction_type: input.correctionType,
        corrected_amount: input.correctedAmount,
        corrected_payment_method: input.correctedPaymentMethod,
        corrected_payment_date: input.correctedPaymentDate,
        corrected_category_id: input.correctedCategoryId,
        reason: input.reason,
        supporting_evidence: input.supportingEvidence,
        requested_by: input.requestedBy,
        requested_by_role: input.requestedByRole,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;

    return { id: data.id };
  } catch (err) {
    console.error('Failed to create correction request:', err);
    return null;
  }
}

/**
 * Review a correction request (approve or reject)
 */
export async function reviewCorrectionRequest(
  requestId: string,
  reviewerId: string,
  approved: boolean,
  notes?: string
): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {
      status: approved ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes
    };

    if (!approved && notes) {
      updateData.rejection_reason = notes;
    }

    const { error } = await supabase
      .from('fee_correction_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to review correction:', err);
    return false;
  }
}

/**
 * Apply an approved correction
 */
export async function applyCorrection(
  requestId: string,
  applierId: string,
  applierRole: FeeAuditRole,
  resultingLedgerEntryId: string,
  academicYear: number,
  term?: number
): Promise<boolean> {
  try {
    // Get the correction request
    const { data: request, error: fetchError } = await supabase
      .from('fee_correction_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw fetchError || new Error('Request not found');

    if (request.status !== 'approved') {
      throw new Error('Correction must be approved before applying');
    }

    // Log the correction in fee audit
    const auditLogId = await logFeeAudit({
      schoolId: request.school_id,
      studentId: request.student_id,
      actionType: 'payment_corrected',
      entityType: 'ledger_entry',
      entityId: resultingLedgerEntryId,
      newValues: {
        corrected_amount: request.corrected_amount,
        corrected_method: request.corrected_payment_method,
        corrected_date: request.corrected_payment_date,
        corrected_category: request.corrected_category_id
      },
      amountAffected: (request.corrected_amount || 0) - request.original_amount,
      performedBy: applierId,
      performedByRole: applierRole,
      reason: request.reason,
      academicYear,
      term,
      previousValues: {
        original_amount: request.original_amount,
        original_method: request.original_payment_method,
        original_date: request.original_payment_date
      },
      relatedEntityId: request.original_ledger_entry_id,
      isCorrection: true,
      correctionType: request.correction_type as CorrectionType
    });

    // Update the correction request
    const { error } = await supabase
      .from('fee_correction_requests')
      .update({
        status: 'applied',
        applied_by: applierId,
        applied_at: new Date().toISOString(),
        resulting_ledger_entry_id: resultingLedgerEntryId,
        resulting_audit_log_id: auditLogId
      })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to apply correction:', err);
    return false;
  }
}

/**
 * Get audit history for a student
 */
export async function getStudentFeeAuditHistory(
  studentId: string,
  options?: {
    limit?: number;
    offset?: number;
    actionTypes?: FeeAuditActionType[];
    startDate?: string;
    endDate?: string;
  }
): Promise<FeeAuditLog[]> {
  try {
    let query = supabase
      .from('fee_audit_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (options?.actionTypes?.length) {
      query = query.in('action_type', options.actionTypes);
    }
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      actionType: row.action_type as FeeAuditActionType,
      entityType: row.entity_type as FeeEntityType,
      entityId: row.entity_id,
      relatedEntityId: row.related_entity_id,
      previousValues: row.previous_values as Record<string, unknown> | undefined,
      newValues: row.new_values as Record<string, unknown>,
      amountAffected: row.amount_affected,
      currency: row.currency,
      performedBy: row.performed_by,
      performedByRole: row.performed_by_role as FeeAuditRole,
      reason: row.reason,
      notes: row.notes,
      isCorrection: row.is_correction,
      correctsAuditId: row.corrects_audit_id,
      correctionType: row.correction_type as CorrectionType | undefined,
      requiresApproval: row.requires_approval,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      approvalNotes: row.approval_notes,
      createdAt: row.created_at,
      effectiveDate: row.effective_date,
      academicYear: row.academic_year,
      term: row.term,
      entryHash: row.entry_hash,
      previousHash: row.previous_hash,
      sequenceNumber: row.sequence_number
    }));
  } catch (err) {
    console.error('Failed to fetch audit history:', err);
    return [];
  }
}

/**
 * Verify audit chain integrity
 */
export async function verifyFeeAuditIntegrity(studentId: string): Promise<{
  isValid: boolean;
  brokenAt?: number;
  totalEntries: number;
}> {
  try {
    const { data, error } = await supabase
      .from('fee_audit_logs')
      .select('sequence_number, entry_hash, previous_hash')
      .eq('student_id', studentId)
      .order('sequence_number', { ascending: true });

    if (error) throw error;

    const entries = data || [];
    
    for (let i = 1; i < entries.length; i++) {
      const current = entries[i];
      const previous = entries[i - 1];
      
      if (current.previous_hash !== previous.entry_hash) {
        return {
          isValid: false,
          brokenAt: current.sequence_number,
          totalEntries: entries.length
        };
      }
    }

    return {
      isValid: true,
      totalEntries: entries.length
    };
  } catch (err) {
    console.error('Failed to verify integrity:', err);
    return { isValid: false, totalEntries: 0 };
  }
}

/**
 * Get pending correction requests for a school
 */
export async function getPendingCorrectionRequests(
  schoolId: string
): Promise<CorrectionRequest[]> {
  try {
    const { data, error } = await supabase
      .from('fee_correction_requests')
      .select('*')
      .eq('school_id', schoolId)
      .in('status', ['pending', 'under_review'])
      .order('requested_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      schoolId: row.school_id,
      studentId: row.student_id,
      originalLedgerEntryId: row.original_ledger_entry_id,
      originalPaymentId: row.original_payment_id,
      originalAmount: row.original_amount,
      originalPaymentMethod: row.original_payment_method,
      originalPaymentDate: row.original_payment_date,
      correctionType: row.correction_type as CorrectionType,
      correctedAmount: row.corrected_amount,
      correctedPaymentMethod: row.corrected_payment_method,
      correctedPaymentDate: row.corrected_payment_date,
      correctedCategoryId: row.corrected_category_id,
      reason: row.reason,
      supportingEvidence: row.supporting_evidence,
      requestedBy: row.requested_by,
      requestedByRole: row.requested_by_role,
      requestedAt: row.requested_at,
      status: row.status as CorrectionRequestStatus,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      rejectionReason: row.rejection_reason,
      appliedBy: row.applied_by,
      appliedAt: row.applied_at,
      resultingLedgerEntryId: row.resulting_ledger_entry_id,
      resultingAuditLogId: row.resulting_audit_log_id
    }));
  } catch (err) {
    console.error('Failed to fetch pending corrections:', err);
    return [];
  }
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: FeeAuditLog): {
  title: string;
  description: string;
  icon: string;
  color: string;
  timestamp: string;
} {
  const config = AUDIT_ACTION_CONFIG[entry.actionType];
  const date = new Date(entry.createdAt);
  
  return {
    title: config.label,
    description: entry.reason,
    icon: config.icon,
    color: config.color,
    timestamp: date.toLocaleString()
  };
}

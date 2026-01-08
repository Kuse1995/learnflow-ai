/**
 * Payment Plan System for School Fees
 * Offline-first, manually approved, no automatic deductions
 */

import { supabase } from '@/integrations/supabase/client';
import { formatZMW } from './school-fees-system';

// Plan status types
export type PaymentPlanStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled';

export type InstallmentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'waived';

export type ParentAgreementMethod = 'in_person' | 'phone' | 'written' | 'sms';

// Payment plan interface
export interface PaymentPlan {
  id: string;
  schoolId: string;
  studentId: string;
  academicYear: number;
  term: number;
  planName?: string;
  totalAmount: number;
  balanceAtCreation: number;
  currency: string;
  installmentCount: number;
  startDate: string;
  endDate?: string;
  status: PaymentPlanStatus;
  totalPaid: number;
  remainingAmount: number;
  lastPaymentDate?: string;
  missedInstallments: number;
  createdBy?: string;
  createdByRole?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  offlineId?: string;
  createdOffline: boolean;
  syncedAt?: string;
  notes?: string;
  parentAgreementDate?: string;
  parentAgreementMethod?: ParentAgreementMethod;
  createdAt: string;
  updatedAt: string;
  installments?: Installment[];
}

// Installment interface
export interface Installment {
  id: string;
  planId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: InstallmentStatus;
  amountPaid: number;
  paidDate?: string;
  paymentReference?: string;
  ledgerEntryIds?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Input for creating a payment plan
export interface PaymentPlanInput {
  schoolId: string;
  studentId: string;
  academicYear: number;
  term: number;
  planName?: string;
  totalAmount: number;
  balanceAtCreation: number;
  startDate: string;
  endDate?: string;
  installments: InstallmentInput[];
  notes?: string;
  parentAgreementDate?: string;
  parentAgreementMethod?: ParentAgreementMethod;
  createdBy?: string;
  createdByRole?: string;
}

export interface InstallmentInput {
  amount: number;
  dueDate: string;
  notes?: string;
}

// Plan status configuration
export const PLAN_STATUS_CONFIG: Record<PaymentPlanStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  allowsEditing: boolean;
  allowsPayments: boolean;
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'FileEdit',
    allowsEditing: true,
    allowsPayments: false
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: 'Clock',
    allowsEditing: false,
    allowsPayments: false
  },
  approved: {
    label: 'Approved',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'CheckCircle',
    allowsEditing: false,
    allowsPayments: true
  },
  active: {
    label: 'Active',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'Play',
    allowsEditing: false,
    allowsPayments: true
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle2',
    allowsEditing: false,
    allowsPayments: false
  },
  defaulted: {
    label: 'Defaulted',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'AlertTriangle',
    allowsEditing: false,
    allowsPayments: true
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: 'XCircle',
    allowsEditing: false,
    allowsPayments: false
  }
};

// Installment status configuration
export const INSTALLMENT_STATUS_CONFIG: Record<InstallmentStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  partial: {
    label: 'Partial',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  paid: {
    label: 'Paid',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  waived: {
    label: 'Waived',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
};

/**
 * Validate payment plan input
 */
export function validatePaymentPlanInput(input: PaymentPlanInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.totalAmount <= 0) {
    errors.push('Total amount must be greater than zero');
  }

  if (input.installments.length === 0) {
    errors.push('At least one installment is required');
  }

  if (input.installments.length > 12) {
    errors.push('Maximum 12 installments allowed');
  }

  // Check installments sum to total
  const installmentSum = input.installments.reduce((sum, i) => sum + i.amount, 0);
  if (Math.abs(installmentSum - input.totalAmount) > 0.01) {
    errors.push(`Installments (${formatZMW(installmentSum)}) must equal total amount (${formatZMW(input.totalAmount)})`);
  }

  // Check all amounts are positive
  input.installments.forEach((inst, idx) => {
    if (inst.amount <= 0) {
      errors.push(`Installment ${idx + 1} must have a positive amount`);
    }
  });

  // Check dates are valid and sequential
  const dates = input.installments.map(i => new Date(i.dueDate));
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] < dates[i - 1]) {
      errors.push('Installment due dates must be in chronological order');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate equal installments
 */
export function generateEqualInstallments(
  totalAmount: number,
  count: number,
  startDate: Date,
  intervalDays: number = 30
): InstallmentInput[] {
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * count) * 100) / 100;

  const installments: InstallmentInput[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    // Add remainder to last installment
    const amount = i === count - 1 ? baseAmount + remainder : baseAmount;
    
    installments.push({
      amount,
      dueDate: currentDate.toISOString().split('T')[0]
    });

    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + intervalDays);
  }

  return installments;
}

/**
 * Generate custom installments with flexible amounts
 */
export function generateCustomInstallments(
  amounts: number[],
  dueDates: string[]
): InstallmentInput[] {
  if (amounts.length !== dueDates.length) {
    throw new Error('Amounts and due dates must have the same length');
  }

  return amounts.map((amount, idx) => ({
    amount,
    dueDate: dueDates[idx]
  }));
}

/**
 * Check if student has active plan for term
 */
export async function hasActivePlan(
  studentId: string,
  academicYear: number,
  term: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_active_payment_plan', {
    p_student_id: studentId,
    p_academic_year: academicYear,
    p_term: term
  });

  if (error) {
    console.error('Error checking active plan:', error);
    return false;
  }

  return data === true;
}

/**
 * Create a payment plan (draft status)
 */
export async function createPaymentPlan(
  input: PaymentPlanInput,
  offlineId?: string
): Promise<{ id: string } | null> {
  const validation = validatePaymentPlanInput(input);
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    return null;
  }

  try {
    // Check for existing active plan
    const hasExisting = await hasActivePlan(input.studentId, input.academicYear, input.term);
    if (hasExisting) {
      console.error('Student already has an active plan for this term');
      return null;
    }

    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .insert({
        school_id: input.schoolId,
        student_id: input.studentId,
        academic_year: input.academicYear,
        term: input.term,
        plan_name: input.planName,
        total_amount: input.totalAmount,
        balance_at_creation: input.balanceAtCreation,
        installment_count: input.installments.length,
        start_date: input.startDate,
        end_date: input.endDate,
        remaining_amount: input.totalAmount,
        status: 'draft',
        notes: input.notes,
        parent_agreement_date: input.parentAgreementDate,
        parent_agreement_method: input.parentAgreementMethod,
        created_by: input.createdBy,
        created_by_role: input.createdByRole,
        offline_id: offlineId,
        created_offline: !!offlineId
      })
      .select('id')
      .single();

    if (planError) throw planError;

    // Create installments
    const installmentRows = input.installments.map((inst, idx) => ({
      plan_id: plan.id,
      installment_number: idx + 1,
      amount: inst.amount,
      due_date: inst.dueDate,
      notes: inst.notes
    }));

    const { error: instError } = await supabase
      .from('payment_plan_installments')
      .insert(installmentRows);

    if (instError) throw instError;

    return { id: plan.id };
  } catch (err) {
    console.error('Failed to create payment plan:', err);
    return null;
  }
}

/**
 * Submit plan for approval
 */
export async function submitForApproval(planId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_plans')
      .update({ status: 'pending_approval' })
      .eq('id', planId)
      .eq('status', 'draft');

    return !error;
  } catch (err) {
    console.error('Failed to submit for approval:', err);
    return false;
  }
}

/**
 * Approve a payment plan
 */
export async function approvePlan(
  planId: string,
  approvedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_plans')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        approval_notes: notes
      })
      .eq('id', planId)
      .eq('status', 'pending_approval');

    return !error;
  } catch (err) {
    console.error('Failed to approve plan:', err);
    return false;
  }
}

/**
 * Record payment against an installment
 * Does NOT modify the ledger - just tracks against the plan
 */
export async function recordInstallmentPayment(
  installmentId: string,
  amount: number,
  paymentDate: string,
  paymentReference?: string,
  ledgerEntryId?: string
): Promise<boolean> {
  try {
    // Get current installment
    const { data: installment, error: fetchError } = await supabase
      .from('payment_plan_installments')
      .select('amount, amount_paid, ledger_entry_ids')
      .eq('id', installmentId)
      .single();

    if (fetchError || !installment) throw fetchError;

    const newAmountPaid = installment.amount_paid + amount;
    const newStatus: InstallmentStatus = 
      newAmountPaid >= installment.amount ? 'paid' : 'partial';

    // Update ledger entry IDs array
    const ledgerIds = installment.ledger_entry_ids || [];
    if (ledgerEntryId && !ledgerIds.includes(ledgerEntryId)) {
      ledgerIds.push(ledgerEntryId);
    }

    const { error } = await supabase
      .from('payment_plan_installments')
      .update({
        amount_paid: newAmountPaid,
        status: newStatus,
        paid_date: paymentDate,
        payment_reference: paymentReference,
        ledger_entry_ids: ledgerIds
      })
      .eq('id', installmentId);

    return !error;
  } catch (err) {
    console.error('Failed to record installment payment:', err);
    return false;
  }
}

/**
 * Get payment plan with installments
 */
export async function getPaymentPlan(planId: string): Promise<PaymentPlan | null> {
  try {
    const { data: plan, error } = await supabase
      .from('payment_plans')
      .select(`
        *,
        payment_plan_installments (*)
      `)
      .eq('id', planId)
      .single();

    if (error || !plan) return null;

    return mapPlanFromDb(plan);
  } catch (err) {
    console.error('Failed to fetch payment plan:', err);
    return null;
  }
}

/**
 * Get active plan for student
 */
export async function getStudentActivePlan(
  studentId: string,
  academicYear: number,
  term: number
): Promise<PaymentPlan | null> {
  try {
    const { data: plan, error } = await supabase
      .from('payment_plans')
      .select(`
        *,
        payment_plan_installments (*)
      `)
      .eq('student_id', studentId)
      .eq('academic_year', academicYear)
      .eq('term', term)
      .in('status', ['approved', 'active'])
      .single();

    if (error || !plan) return null;

    return mapPlanFromDb(plan);
  } catch (err) {
    console.error('Failed to fetch active plan:', err);
    return null;
  }
}

/**
 * Cancel a payment plan
 */
export async function cancelPlan(
  planId: string,
  cancelledBy: string,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_plans')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', planId);

    return !error;
  } catch (err) {
    console.error('Failed to cancel plan:', err);
    return false;
  }
}

/**
 * Update overdue installments
 */
export async function updateOverdueInstallments(planId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payment_plan_installments')
      .update({ status: 'overdue' })
      .eq('plan_id', planId)
      .in('status', ['pending', 'partial'])
      .lt('due_date', today)
      .select('id');

    if (error) throw error;

    // Update missed count on plan
    if (data && data.length > 0) {
      await supabase
        .from('payment_plans')
        .update({ missed_installments: data.length })
        .eq('id', planId);
    }

    return data?.length || 0;
  } catch (err) {
    console.error('Failed to update overdue installments:', err);
    return 0;
  }
}

/**
 * Get plan summary for display
 */
export function getPlanSummary(plan: PaymentPlan): {
  progressPercent: number;
  paidInstallments: number;
  totalInstallments: number;
  nextDueDate?: string;
  nextDueAmount?: number;
  isOnTrack: boolean;
} {
  const installments = plan.installments || [];
  const paidInstallments = installments.filter(i => i.status === 'paid').length;
  const progressPercent = plan.totalAmount > 0 
    ? Math.round((plan.totalPaid / plan.totalAmount) * 100) 
    : 0;

  // Find next pending/partial installment
  const nextInstallment = installments
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // Check if on track (no overdue installments)
  const hasOverdue = installments.some(i => i.status === 'overdue');

  return {
    progressPercent,
    paidInstallments,
    totalInstallments: installments.length,
    nextDueDate: nextInstallment?.dueDate,
    nextDueAmount: nextInstallment ? nextInstallment.amount - nextInstallment.amountPaid : undefined,
    isOnTrack: !hasOverdue
  };
}

// Offline storage helpers
const OFFLINE_PLANS_KEY = 'stitch_offline_payment_plans';

export function savePaymentPlanOffline(input: PaymentPlanInput): string {
  const offlineId = `offline_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const plans = getOfflinePaymentPlans();
  plans.push({ ...input, offlineId, createdAt: new Date().toISOString() });
  localStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(plans));
  return offlineId;
}

export function getOfflinePaymentPlans(): Array<PaymentPlanInput & { offlineId: string; createdAt: string }> {
  const stored = localStorage.getItem(OFFLINE_PLANS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function removeOfflinePaymentPlan(offlineId: string): void {
  const plans = getOfflinePaymentPlans().filter(p => p.offlineId !== offlineId);
  localStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(plans));
}

// Helper to map DB row to interface
function mapPlanFromDb(row: Record<string, unknown>): PaymentPlan {
  const installments = (row.payment_plan_installments as Record<string, unknown>[] || [])
    .map((i): Installment => ({
      id: i.id as string,
      planId: i.plan_id as string,
      installmentNumber: i.installment_number as number,
      amount: i.amount as number,
      dueDate: i.due_date as string,
      status: i.status as InstallmentStatus,
      amountPaid: i.amount_paid as number,
      paidDate: i.paid_date as string | undefined,
      paymentReference: i.payment_reference as string | undefined,
      ledgerEntryIds: i.ledger_entry_ids as string[] | undefined,
      notes: i.notes as string | undefined,
      createdAt: i.created_at as string,
      updatedAt: i.updated_at as string
    }))
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    studentId: row.student_id as string,
    academicYear: row.academic_year as number,
    term: row.term as number,
    planName: row.plan_name as string | undefined,
    totalAmount: row.total_amount as number,
    balanceAtCreation: row.balance_at_creation as number,
    currency: row.currency as string,
    installmentCount: row.installment_count as number,
    startDate: row.start_date as string,
    endDate: row.end_date as string | undefined,
    status: row.status as PaymentPlanStatus,
    totalPaid: row.total_paid as number,
    remainingAmount: row.remaining_amount as number,
    lastPaymentDate: row.last_payment_date as string | undefined,
    missedInstallments: row.missed_installments as number,
    createdBy: row.created_by as string | undefined,
    createdByRole: row.created_by_role as string | undefined,
    approvedBy: row.approved_by as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    approvalNotes: row.approval_notes as string | undefined,
    cancelledBy: row.cancelled_by as string | undefined,
    cancelledAt: row.cancelled_at as string | undefined,
    cancellationReason: row.cancellation_reason as string | undefined,
    offlineId: row.offline_id as string | undefined,
    createdOffline: row.created_offline as boolean,
    syncedAt: row.synced_at as string | undefined,
    notes: row.notes as string | undefined,
    parentAgreementDate: row.parent_agreement_date as string | undefined,
    parentAgreementMethod: row.parent_agreement_method as ParentAgreementMethod | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    installments
  };
}

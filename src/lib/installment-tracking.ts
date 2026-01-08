/**
 * Installment Tracking System
 * Tracks payments within payment plans with no penalties or blocking
 */

import { supabase } from '@/integrations/supabase/client';
import { formatZMW } from './school-fees-system';

// Installment status types
export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'missed' | 'waived';

// Payment record within an installment
export interface InstallmentPayment {
  amount: number;
  date: string;
  reference?: string;
  ledgerEntryId?: string;
  notes?: string;
  recordedAt: string;
}

// Full installment details
export interface InstallmentDetails {
  id: string;
  planId: string;
  installmentNumber: number;
  expectedAmount: number;
  dueDate: string;
  amountPaid: number;
  remainingAmount: number;
  status: InstallmentStatus;
  paidDate?: string;
  paymentReference?: string;
  paymentHistory: InstallmentPayment[];
  ledgerEntryIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Input for recording a payment
export interface RecordPaymentInput {
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentReference?: string;
  ledgerEntryId?: string;
  notes?: string;
}

// Installment summary for display
export interface InstallmentSummary {
  number: number;
  expectedAmount: string;
  amountPaid: string;
  remaining: string;
  dueDate: string;
  dueDateFormatted: string;
  status: InstallmentStatus;
  statusLabel: string;
  statusColor: string;
  statusBgColor: string;
  paymentCount: number;
  isOverdue: boolean;
  daysUntilDue: number;
  percentPaid: number;
}

// Status configuration
export const INSTALLMENT_STATUS_CONFIG: Record<InstallmentStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'Clock',
    description: 'Payment not yet due'
  },
  partial: {
    label: 'Partially Paid',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: 'CircleDashed',
    description: 'Some payment received, balance remaining'
  },
  paid: {
    label: 'Paid',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
    description: 'Fully paid'
  },
  missed: {
    label: 'Missed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'AlertCircle',
    description: 'Due date passed without payment (informational only)'
  },
  waived: {
    label: 'Waived',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: 'Gift',
    description: 'Installment waived'
  }
};

/**
 * Calculate installment status from data
 * Pure function - no penalties, no blocking
 */
export function calculateInstallmentStatus(
  expectedAmount: number,
  amountPaid: number,
  dueDate: string
): InstallmentStatus {
  // Fully paid
  if (amountPaid >= expectedAmount) {
    return 'paid';
  }
  
  // Partially paid
  if (amountPaid > 0) {
    return 'partial';
  }
  
  // Check if past due
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  // Past due with no payment = missed (informational only)
  if (today > due && amountPaid === 0) {
    return 'missed';
  }
  
  // Not yet due
  return 'pending';
}

/**
 * Calculate days until due (negative if overdue)
 */
export function calculateDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format due date for display
 */
export function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  return date.toLocaleDateString('en-ZM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Get due date message
 */
export function getDueDateMessage(dueDate: string, status: InstallmentStatus): string {
  if (status === 'paid' || status === 'waived') {
    return '';
  }
  
  const daysUntil = calculateDaysUntilDue(dueDate);
  
  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil);
    return `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
  }
  
  if (daysUntil === 0) {
    return 'Due today';
  }
  
  if (daysUntil <= 7) {
    return `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
  }
  
  return `Due ${formatDueDate(dueDate)}`;
}

/**
 * Build installment summary for display
 */
export function buildInstallmentSummary(installment: InstallmentDetails): InstallmentSummary {
  const config = INSTALLMENT_STATUS_CONFIG[installment.status];
  const daysUntilDue = calculateDaysUntilDue(installment.dueDate);
  
  return {
    number: installment.installmentNumber,
    expectedAmount: formatZMW(installment.expectedAmount),
    amountPaid: formatZMW(installment.amountPaid),
    remaining: formatZMW(installment.remainingAmount),
    dueDate: installment.dueDate,
    dueDateFormatted: formatDueDate(installment.dueDate),
    status: installment.status,
    statusLabel: config.label,
    statusColor: config.color,
    statusBgColor: config.bgColor,
    paymentCount: installment.paymentHistory.length,
    isOverdue: daysUntilDue < 0 && installment.status !== 'paid' && installment.status !== 'waived',
    daysUntilDue,
    percentPaid: installment.expectedAmount > 0 
      ? Math.round((installment.amountPaid / installment.expectedAmount) * 100)
      : 0
  };
}

/**
 * Record a payment against an installment
 */
export async function recordInstallmentPayment(
  input: RecordPaymentInput
): Promise<{ success: boolean; newStatus?: InstallmentStatus; remaining?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('record_installment_payment', {
      p_installment_id: input.installmentId,
      p_amount: input.amount,
      p_payment_date: input.paymentDate,
      p_payment_reference: input.paymentReference || null,
      p_ledger_entry_id: input.ledgerEntryId || null,
      p_notes: input.notes || null
    });

    if (error) throw error;

    const result = data as { success: boolean; new_status?: string; remaining?: number; error?: string };
    
    return {
      success: result.success,
      newStatus: result.new_status as InstallmentStatus,
      remaining: result.remaining,
      error: result.error
    };
  } catch (err) {
    console.error('Failed to record payment:', err);
    return { success: false, error: 'Failed to record payment' };
  }
}

/**
 * Get installment details with payment history
 */
export async function getInstallmentDetails(installmentId: string): Promise<InstallmentDetails | null> {
  try {
    const { data, error } = await supabase
      .from('payment_plan_installments')
      .select('*')
      .eq('id', installmentId)
      .single();

    if (error || !data) return null;

    return mapInstallmentFromDb(data);
  } catch (err) {
    console.error('Failed to fetch installment:', err);
    return null;
  }
}

/**
 * Get all installments for a plan
 */
export async function getPlanInstallments(planId: string): Promise<InstallmentDetails[]> {
  try {
    const { data, error } = await supabase
      .from('payment_plan_installments')
      .select('*')
      .eq('plan_id', planId)
      .order('installment_number', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapInstallmentFromDb);
  } catch (err) {
    console.error('Failed to fetch installments:', err);
    return [];
  }
}

/**
 * Refresh statuses for all installments in a plan
 */
export async function refreshPlanInstallmentStatuses(planId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('refresh_plan_installment_statuses', {
      p_plan_id: planId
    });

    if (error) throw error;
    return data as number;
  } catch (err) {
    console.error('Failed to refresh statuses:', err);
    return 0;
  }
}

/**
 * Waive an installment
 */
export async function waiveInstallment(
  installmentId: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_plan_installments')
      .update({
        status: 'waived',
        notes: notes || 'Installment waived'
      })
      .eq('id', installmentId);

    return !error;
  } catch (err) {
    console.error('Failed to waive installment:', err);
    return false;
  }
}

/**
 * Get upcoming installments across all plans for a school
 */
export async function getUpcomingInstallments(
  schoolId: string,
  daysAhead: number = 7
): Promise<Array<InstallmentDetails & { studentId: string; studentName?: string }>> {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('payment_plan_installments')
      .select(`
        *,
        payment_plans!inner (
          student_id,
          school_id,
          status
        )
      `)
      .eq('payment_plans.school_id', schoolId)
      .in('payment_plans.status', ['approved', 'active'])
      .in('status', ['pending', 'partial'])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => {
      const installment = mapInstallmentFromDb(row);
      const plan = row.payment_plans as { student_id: string };
      return {
        ...installment,
        studentId: plan.student_id
      };
    });
  } catch (err) {
    console.error('Failed to fetch upcoming installments:', err);
    return [];
  }
}

/**
 * Get installment statistics for a plan
 */
export function getInstallmentStats(installments: InstallmentDetails[]): {
  total: number;
  pending: number;
  partial: number;
  paid: number;
  missed: number;
  waived: number;
  totalExpected: number;
  totalPaid: number;
  totalRemaining: number;
  completionPercent: number;
} {
  const stats = {
    total: installments.length,
    pending: 0,
    partial: 0,
    paid: 0,
    missed: 0,
    waived: 0,
    totalExpected: 0,
    totalPaid: 0,
    totalRemaining: 0,
    completionPercent: 0
  };

  installments.forEach(inst => {
    stats[inst.status]++;
    stats.totalExpected += inst.expectedAmount;
    stats.totalPaid += inst.amountPaid;
    stats.totalRemaining += inst.remainingAmount;
  });

  stats.completionPercent = stats.totalExpected > 0
    ? Math.round((stats.totalPaid / stats.totalExpected) * 100)
    : 0;

  return stats;
}

/**
 * Check if plan has any missed installments (informational)
 */
export function hasMissedInstallments(installments: InstallmentDetails[]): boolean {
  return installments.some(i => i.status === 'missed');
}

/**
 * Get next due installment
 */
export function getNextDueInstallment(
  installments: InstallmentDetails[]
): InstallmentDetails | null {
  const pending = installments
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return pending[0] || null;
}

// Helper to map DB row to interface
function mapInstallmentFromDb(row: Record<string, unknown>): InstallmentDetails {
  const paymentHistory = (row.payment_history as Array<Record<string, unknown>> || [])
    .map((p): InstallmentPayment => ({
      amount: p.amount as number,
      date: p.date as string,
      reference: p.reference as string | undefined,
      ledgerEntryId: p.ledger_entry_id as string | undefined,
      notes: p.notes as string | undefined,
      recordedAt: p.recorded_at as string
    }));

  const expectedAmount = row.amount as number;
  const amountPaid = row.amount_paid as number;

  return {
    id: row.id as string,
    planId: row.plan_id as string,
    installmentNumber: row.installment_number as number,
    expectedAmount,
    dueDate: row.due_date as string,
    amountPaid,
    remainingAmount: Math.max(0, expectedAmount - amountPaid),
    status: row.status as InstallmentStatus,
    paidDate: row.paid_date as string | undefined,
    paymentReference: row.payment_reference as string | undefined,
    paymentHistory,
    ledgerEntryIds: (row.ledger_entry_ids as string[]) || [],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

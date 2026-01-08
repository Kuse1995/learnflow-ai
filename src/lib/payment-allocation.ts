/**
 * Payment Allocation System
 * Links payments to installments without modifying original payment records
 */

import { supabase } from '@/integrations/supabase/client';
import { formatZMW } from './school-fees-system';

// ==================== TYPES ====================

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  installmentId: string;
  planId: string;
  allocatedAmount: number;
  allocationOrder: number;
  allocatedBy: string;
  allocatedByRole: string;
  allocatedAt: string;
  notes?: string;
  supersedesAllocationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationInput {
  paymentId: string;
  installmentId: string;
  planId: string;
  amount: number;
  notes?: string;
}

export interface AllocationResult {
  success: boolean;
  allocations: PaymentAllocation[];
  error?: string;
  unallocatedAmount?: number;
}

export interface InstallmentAllocationSummary {
  installmentId: string;
  installmentNumber: number;
  expectedAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overpaid';
  allocations: PaymentAllocation[];
}

export interface PaymentAllocationSummary {
  paymentId: string;
  paymentAmount: number;
  allocatedTotal: number;
  unallocatedAmount: number;
  allocationCount: number;
  allocations: PaymentAllocation[];
}

export type AllocationRole = 'admin' | 'bursar' | 'finance_officer';

// ==================== ALLOCATION FUNCTIONS ====================

/**
 * Get unallocated amount from a payment
 */
export async function getPaymentUnallocatedAmount(
  paymentId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_payment_unallocated_amount', {
    p_payment_id: paymentId
  });

  if (error) {
    console.error('Failed to get unallocated amount:', error);
    return 0;
  }

  return data ?? 0;
}

/**
 * Get total allocated to an installment
 */
export async function getInstallmentAllocatedTotal(
  installmentId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_installment_allocated_total', {
    p_installment_id: installmentId
  });

  if (error) {
    console.error('Failed to get allocated total:', error);
    return 0;
  }

  return data ?? 0;
}

/**
 * Allocate a payment to a single installment
 */
export async function allocatePaymentToInstallment(
  input: AllocationInput,
  allocatedBy: string,
  allocatedByRole: AllocationRole
): Promise<{ success: boolean; allocation?: PaymentAllocation; error?: string }> {
  try {
    // Validate role
    if (!['admin', 'bursar', 'finance_officer'].includes(allocatedByRole)) {
      return { success: false, error: 'Unauthorized role for allocation' };
    }

    // Check available amount
    const unallocated = await getPaymentUnallocatedAmount(input.paymentId);
    if (input.amount > unallocated) {
      return { 
        success: false, 
        error: `Cannot allocate ${formatZMW(input.amount)}. Only ${formatZMW(unallocated)} available.` 
      };
    }

    // Get current allocation count for order
    const { count } = await supabase
      .from('payment_installment_allocations')
      .select('id', { count: 'exact', head: true })
      .eq('payment_id', input.paymentId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('payment_installment_allocations')
      .insert({
        payment_id: input.paymentId,
        installment_id: input.installmentId,
        plan_id: input.planId,
        allocated_amount: input.amount,
        allocation_order: (count ?? 0) + 1,
        allocated_by: allocatedBy,
        allocated_by_role: allocatedByRole,
        notes: input.notes
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'This payment is already allocated to this installment' };
      }
      throw error;
    }

    return { success: true, allocation: mapAllocationFromDb(data) };
  } catch (err) {
    console.error('Allocation failed:', err);
    return { success: false, error: 'Failed to create allocation' };
  }
}

/**
 * Auto-allocate a payment across installments (FIFO - oldest first)
 * Supports overpayment rollover
 */
export async function autoAllocatePayment(
  paymentId: string,
  planId: string,
  allocatedBy: string,
  allocatedByRole: AllocationRole
): Promise<AllocationResult> {
  try {
    // Get payment amount
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .select('amount')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, allocations: [], error: 'Payment not found' };
    }

    // Get already allocated amount
    const alreadyAllocated = await getPaymentUnallocatedAmount(paymentId);
    let remainingToAllocate = payment.amount - (payment.amount - alreadyAllocated);
    
    // If recalculating, use full unallocated amount
    remainingToAllocate = alreadyAllocated;

    if (remainingToAllocate <= 0) {
      return { 
        success: true, 
        allocations: [], 
        unallocatedAmount: 0 
      };
    }

    // Get pending/partial installments ordered by due date
    const { data: installments, error: instError } = await supabase
      .from('payment_plan_installments')
      .select('id, installment_number, amount, amount_paid, status')
      .eq('plan_id', planId)
      .in('status', ['pending', 'partial', 'missed'])
      .order('due_date', { ascending: true });

    if (instError) throw instError;

    const allocations: PaymentAllocation[] = [];
    let allocationOrder = 1;

    for (const inst of installments || []) {
      if (remainingToAllocate <= 0) break;

      const amountNeeded = inst.amount - inst.amount_paid;
      if (amountNeeded <= 0) continue;

      const amountToAllocate = Math.min(remainingToAllocate, amountNeeded);

      const result = await allocatePaymentToInstallment(
        {
          paymentId,
          installmentId: inst.id,
          planId,
          amount: amountToAllocate,
          notes: 'Auto-allocated'
        },
        allocatedBy,
        allocatedByRole
      );

      if (result.success && result.allocation) {
        allocations.push(result.allocation);
        remainingToAllocate -= amountToAllocate;
        allocationOrder++;
      }
    }

    return {
      success: true,
      allocations,
      unallocatedAmount: remainingToAllocate
    };
  } catch (err) {
    console.error('Auto-allocation failed:', err);
    return { success: false, allocations: [], error: 'Auto-allocation failed' };
  }
}

/**
 * Edit an allocation (admin only)
 * Creates a new allocation and deactivates the old one
 */
export async function editAllocation(
  allocationId: string,
  newAmount: number,
  editedBy: string,
  notes?: string
): Promise<{ success: boolean; newAllocation?: PaymentAllocation; error?: string }> {
  try {
    // Get existing allocation
    const { data: existing, error: fetchError } = await supabase
      .from('payment_installment_allocations')
      .select('*')
      .eq('id', allocationId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Allocation not found or already inactive' };
    }

    // Validate new amount against payment
    const unallocated = await getPaymentUnallocatedAmount(existing.payment_id);
    const maxAllowable = unallocated + existing.allocated_amount;
    
    if (newAmount > maxAllowable) {
      return { 
        success: false, 
        error: `Cannot allocate ${formatZMW(newAmount)}. Maximum available: ${formatZMW(maxAllowable)}` 
      };
    }

    // Deactivate old allocation
    const { error: deactivateError } = await supabase
      .from('payment_installment_allocations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', allocationId);

    if (deactivateError) throw deactivateError;

    // Create new allocation
    const { data: newAlloc, error: createError } = await supabase
      .from('payment_installment_allocations')
      .insert({
        payment_id: existing.payment_id,
        installment_id: existing.installment_id,
        plan_id: existing.plan_id,
        allocated_amount: newAmount,
        allocation_order: existing.allocation_order,
        allocated_by: editedBy,
        allocated_by_role: 'admin',
        notes: notes ?? `Edited from ${formatZMW(existing.allocated_amount)}`,
        supersedes_allocation_id: allocationId
      })
      .select()
      .single();

    if (createError) throw createError;

    return { success: true, newAllocation: mapAllocationFromDb(newAlloc) };
  } catch (err) {
    console.error('Edit allocation failed:', err);
    return { success: false, error: 'Failed to edit allocation' };
  }
}

/**
 * Remove an allocation (admin only)
 */
export async function removeAllocation(
  allocationId: string,
  removedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('payment_installment_allocations')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString(),
        notes: `Removed by ${removedBy}: ${reason}`
      })
      .eq('id', allocationId)
      .eq('is_active', true);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Remove allocation failed:', err);
    return { success: false, error: 'Failed to remove allocation' };
  }
}

// ==================== RECONCILIATION ====================

/**
 * Get allocation summary for an installment
 */
export async function getInstallmentAllocationSummary(
  installmentId: string
): Promise<InstallmentAllocationSummary | null> {
  try {
    // Get installment
    const { data: inst, error: instError } = await supabase
      .from('payment_plan_installments')
      .select('id, installment_number, amount, amount_paid, status')
      .eq('id', installmentId)
      .single();

    if (instError || !inst) return null;

    // Get allocations
    const { data: allocations, error: allocError } = await supabase
      .from('payment_installment_allocations')
      .select('*')
      .eq('installment_id', installmentId)
      .eq('is_active', true)
      .order('allocation_order', { ascending: true });

    if (allocError) throw allocError;

    const allocatedAmount = (allocations || []).reduce(
      (sum, a) => sum + Number(a.allocated_amount), 
      0
    );

    let status: InstallmentAllocationSummary['status'] = 'pending';
    if (allocatedAmount > inst.amount) {
      status = 'overpaid';
    } else if (allocatedAmount >= inst.amount) {
      status = 'paid';
    } else if (allocatedAmount > 0) {
      status = 'partial';
    }

    return {
      installmentId: inst.id,
      installmentNumber: inst.installment_number,
      expectedAmount: inst.amount,
      allocatedAmount,
      remainingAmount: Math.max(0, inst.amount - allocatedAmount),
      status,
      allocations: (allocations || []).map(mapAllocationFromDb)
    };
  } catch (err) {
    console.error('Failed to get installment summary:', err);
    return null;
  }
}

/**
 * Get allocation summary for a payment
 */
export async function getPaymentAllocationSummary(
  paymentId: string
): Promise<PaymentAllocationSummary | null> {
  try {
    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .select('id, amount')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) return null;

    // Get allocations
    const { data: allocations, error: allocError } = await supabase
      .from('payment_installment_allocations')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('is_active', true)
      .order('allocation_order', { ascending: true });

    if (allocError) throw allocError;

    const allocatedTotal = (allocations || []).reduce(
      (sum, a) => sum + Number(a.allocated_amount), 
      0
    );

    return {
      paymentId: payment.id,
      paymentAmount: payment.amount,
      allocatedTotal,
      unallocatedAmount: Math.max(0, payment.amount - allocatedTotal),
      allocationCount: (allocations || []).length,
      allocations: (allocations || []).map(mapAllocationFromDb)
    };
  } catch (err) {
    console.error('Failed to get payment summary:', err);
    return null;
  }
}

/**
 * Reconcile all allocations for a plan
 * Returns discrepancies and suggestions
 */
export async function reconcilePlanAllocations(
  planId: string
): Promise<{
  isBalanced: boolean;
  totalExpected: number;
  totalAllocated: number;
  discrepancy: number;
  installmentSummaries: InstallmentAllocationSummary[];
  unallocatedPayments: { paymentId: string; unallocatedAmount: number }[];
}> {
  try {
    // Get all installments
    const { data: installments, error: instError } = await supabase
      .from('payment_plan_installments')
      .select('id, installment_number, amount')
      .eq('plan_id', planId)
      .order('installment_number', { ascending: true });

    if (instError) throw instError;

    const installmentSummaries: InstallmentAllocationSummary[] = [];
    let totalExpected = 0;
    let totalAllocated = 0;

    for (const inst of installments || []) {
      const summary = await getInstallmentAllocationSummary(inst.id);
      if (summary) {
        installmentSummaries.push(summary);
        totalExpected += summary.expectedAmount;
        totalAllocated += summary.allocatedAmount;
      }
    }

    // Find payments with unallocated amounts
    const { data: allocations } = await supabase
      .from('payment_installment_allocations')
      .select('payment_id')
      .eq('plan_id', planId)
      .eq('is_active', true);

    const paymentIds = [...new Set((allocations || []).map(a => a.payment_id))];
    const unallocatedPayments: { paymentId: string; unallocatedAmount: number }[] = [];

    for (const paymentId of paymentIds) {
      const unallocated = await getPaymentUnallocatedAmount(paymentId);
      if (unallocated > 0.01) {
        unallocatedPayments.push({ paymentId, unallocatedAmount: unallocated });
      }
    }

    return {
      isBalanced: Math.abs(totalExpected - totalAllocated) < 0.01 && unallocatedPayments.length === 0,
      totalExpected,
      totalAllocated,
      discrepancy: totalExpected - totalAllocated,
      installmentSummaries,
      unallocatedPayments
    };
  } catch (err) {
    console.error('Reconciliation failed:', err);
    return {
      isBalanced: false,
      totalExpected: 0,
      totalAllocated: 0,
      discrepancy: 0,
      installmentSummaries: [],
      unallocatedPayments: []
    };
  }
}

/**
 * Get allocation history for an installment (including superseded)
 */
export async function getAllocationHistory(
  installmentId: string
): Promise<PaymentAllocation[]> {
  const { data, error } = await supabase
    .from('payment_installment_allocations')
    .select('*')
    .eq('installment_id', installmentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get allocation history:', error);
    return [];
  }

  return (data || []).map(mapAllocationFromDb);
}

// ==================== HELPERS ====================

function mapAllocationFromDb(row: Record<string, unknown>): PaymentAllocation {
  return {
    id: row.id as string,
    paymentId: row.payment_id as string,
    installmentId: row.installment_id as string,
    planId: row.plan_id as string,
    allocatedAmount: Number(row.allocated_amount),
    allocationOrder: row.allocation_order as number,
    allocatedBy: row.allocated_by as string,
    allocatedByRole: row.allocated_by_role as string,
    allocatedAt: row.allocated_at as string,
    notes: row.notes as string | undefined,
    supersedesAllocationId: row.supersedes_allocation_id as string | undefined,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// ==================== DISPLAY HELPERS ====================

export function formatAllocationStatus(
  status: InstallmentAllocationSummary['status']
): { label: string; color: string; bgColor: string } {
  const config = {
    pending: { label: 'Pending', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    partial: { label: 'Partial', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    paid: { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-100' },
    overpaid: { label: 'Overpaid', color: 'text-blue-600', bgColor: 'bg-blue-100' }
  };
  return config[status];
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PaymentPlan, Installment, PaymentPlanInput, PaymentPlanStatus } from '@/lib/payment-plan-system';

/**
 * Extended plan with student name for display
 */
export interface PaymentPlanWithStudent extends Omit<PaymentPlan, 'installments'> {
  studentName: string | null;
}

/**
 * Hook to fetch all payment plans for a school
 */
export function useSchoolPaymentPlans(
  schoolId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['school-payment-plans', schoolId, academicYear, term],
    queryFn: async (): Promise<PaymentPlanWithStudent[]> => {
      if (!schoolId) return [];

      let query = supabase
        .from('payment_plans')
        .select(`
          *,
          students (name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      if (term !== undefined) {
        query = query.eq('term', term);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        schoolId: row.school_id,
        studentId: row.student_id,
        studentName: Array.isArray(row.students) 
          ? row.students[0]?.name 
          : row.students?.name || null,
        academicYear: row.academic_year,
        term: row.term,
        planName: row.plan_name,
        totalAmount: Number(row.total_amount),
        balanceAtCreation: Number(row.balance_at_creation),
        currency: row.currency,
        installmentCount: row.installment_count,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status as PaymentPlanStatus,
        totalPaid: Number(row.total_paid),
        remainingAmount: Number(row.remaining_amount),
        lastPaymentDate: row.last_payment_date,
        missedInstallments: row.missed_installments,
        createdBy: row.created_by,
        createdByRole: row.created_by_role,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        approvalNotes: row.approval_notes,
        cancelledBy: row.cancelled_by,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        offlineId: row.offline_id,
        createdOffline: row.created_offline,
        syncedAt: row.synced_at,
        notes: row.notes,
        parentAgreementDate: row.parent_agreement_date,
        parentAgreementMethod: row.parent_agreement_method,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook to fetch a single payment plan with installments
 */
export function usePaymentPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['payment-plan', planId],
    queryFn: async (): Promise<PaymentPlan | null> => {
      if (!planId) return null;

      const { data: plan, error: planError } = await supabase
        .from('payment_plans')
        .select(`
          *,
          students (name),
          payment_plan_installments (*)
        `)
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const studentName = Array.isArray(plan.students) 
        ? plan.students[0]?.name 
        : plan.students?.name || null;

      const installments: Installment[] = (plan.payment_plan_installments || [])
        .sort((a: { installment_number: number }, b: { installment_number: number }) => 
          a.installment_number - b.installment_number
        )
        .map((inst: Record<string, unknown>) => ({
          id: inst.id as string,
          planId: inst.plan_id as string,
          installmentNumber: inst.installment_number as number,
          amount: Number(inst.amount),
          dueDate: inst.due_date as string,
          status: inst.status as Installment['status'],
          amountPaid: Number(inst.amount_paid),
          paidDate: inst.paid_date as string | undefined,
          paymentReference: inst.payment_reference as string | undefined,
          ledgerEntryIds: inst.ledger_entry_ids as string[] | undefined,
          notes: inst.notes as string | undefined,
          createdAt: inst.created_at as string,
          updatedAt: inst.updated_at as string,
        }));

      return {
        id: plan.id,
        schoolId: plan.school_id,
        studentId: plan.student_id,
        academicYear: plan.academic_year,
        term: plan.term,
        planName: plan.plan_name || studentName,
        totalAmount: Number(plan.total_amount),
        balanceAtCreation: Number(plan.balance_at_creation),
        currency: plan.currency,
        installmentCount: plan.installment_count,
        startDate: plan.start_date,
        endDate: plan.end_date,
        status: plan.status as PaymentPlanStatus,
        totalPaid: Number(plan.total_paid),
        remainingAmount: Number(plan.remaining_amount),
        lastPaymentDate: plan.last_payment_date,
        missedInstallments: plan.missed_installments,
        createdBy: plan.created_by,
        createdByRole: plan.created_by_role,
        approvedBy: plan.approved_by,
        approvedAt: plan.approved_at,
        approvalNotes: plan.approval_notes,
        cancelledBy: plan.cancelled_by,
        cancelledAt: plan.cancelled_at,
        cancellationReason: plan.cancellation_reason,
        offlineId: plan.offline_id,
        createdOffline: plan.created_offline,
        syncedAt: plan.synced_at,
        notes: plan.notes,
        parentAgreementDate: plan.parent_agreement_date,
        parentAgreementMethod: plan.parent_agreement_method,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        installments,
      };
    },
    enabled: !!planId,
  });
}

/**
 * Hook to fetch a student's active payment plan
 */
export function useStudentPaymentPlan(
  studentId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['student-payment-plan', studentId, academicYear, term],
    queryFn: async (): Promise<PaymentPlan | null> => {
      if (!studentId) return null;

      let query = supabase
        .from('payment_plans')
        .select(`
          *,
          payment_plan_installments (*)
        `)
        .eq('student_id', studentId)
        .in('status', ['approved', 'active']);

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      if (term !== undefined) {
        query = query.eq('term', term);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const installments: Installment[] = (data.payment_plan_installments || [])
        .sort((a: { installment_number: number }, b: { installment_number: number }) => 
          a.installment_number - b.installment_number
        )
        .map((inst: Record<string, unknown>) => ({
          id: inst.id as string,
          planId: inst.plan_id as string,
          installmentNumber: inst.installment_number as number,
          amount: Number(inst.amount),
          dueDate: inst.due_date as string,
          status: inst.status as Installment['status'],
          amountPaid: Number(inst.amount_paid),
          paidDate: inst.paid_date as string | undefined,
          paymentReference: inst.payment_reference as string | undefined,
          ledgerEntryIds: inst.ledger_entry_ids as string[] | undefined,
          notes: inst.notes as string | undefined,
          createdAt: inst.created_at as string,
          updatedAt: inst.updated_at as string,
        }));

      return {
        id: data.id,
        schoolId: data.school_id,
        studentId: data.student_id,
        academicYear: data.academic_year,
        term: data.term,
        planName: data.plan_name,
        totalAmount: Number(data.total_amount),
        balanceAtCreation: Number(data.balance_at_creation),
        currency: data.currency,
        installmentCount: data.installment_count,
        startDate: data.start_date,
        endDate: data.end_date,
        status: data.status as PaymentPlanStatus,
        totalPaid: Number(data.total_paid),
        remainingAmount: Number(data.remaining_amount),
        lastPaymentDate: data.last_payment_date,
        missedInstallments: data.missed_installments,
        createdBy: data.created_by,
        createdByRole: data.created_by_role,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at,
        approvalNotes: data.approval_notes,
        cancelledBy: data.cancelled_by,
        cancelledAt: data.cancelled_at,
        cancellationReason: data.cancellation_reason,
        offlineId: data.offline_id,
        createdOffline: data.created_offline,
        syncedAt: data.synced_at,
        notes: data.notes,
        parentAgreementDate: data.parent_agreement_date,
        parentAgreementMethod: data.parent_agreement_method,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        installments,
      };
    },
    enabled: !!studentId,
  });
}

/**
 * Hook to update payment plan status
 */
export function useUpdatePaymentPlanStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      status,
      approvedBy,
      notes,
    }: {
      planId: string;
      status: PaymentPlanStatus;
      approvedBy?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };

      if (status === 'approved' && approvedBy) {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = notes;
      }

      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = notes;
      }

      const { error } = await supabase
        .from('payment_plans')
        .update(updateData)
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Plan Updated',
        description: 'Payment plan status has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-plan'] });
      queryClient.invalidateQueries({ queryKey: ['school-payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-plan'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

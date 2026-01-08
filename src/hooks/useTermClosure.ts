import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// =============================================================================
// TYPES
// =============================================================================

export interface TermClosureStatus {
  id: string;
  schoolId: string;
  academicYear: number;
  term: number;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  totalFeesCharged: number;
  totalPaymentsReceived: number;
  totalAdjustments: number;
  outstandingBalance: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TermSummary {
  totalFees: number;
  totalPayments: number;
  totalAdjustments: number;
  outstandingBalance: number;
  studentCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Check if a specific term is closed
 */
export function useIsTermClosed(
  schoolId: string | undefined,
  academicYear: number,
  term: number | undefined
) {
  return useQuery({
    queryKey: ['term-closure-status', schoolId, academicYear, term],
    queryFn: async () => {
      if (!schoolId || term === undefined) return false;

      const { data, error } = await supabase
        .from('fee_term_closures')
        .select('is_closed')
        .eq('school_id', schoolId)
        .eq('academic_year', academicYear)
        .eq('term', term)
        .maybeSingle();

      if (error) throw error;
      return data?.is_closed ?? false;
    },
    enabled: !!schoolId && term !== undefined,
  });
}

/**
 * Get term closure details
 */
export function useTermClosure(
  schoolId: string | undefined,
  academicYear: number,
  term: number | undefined
) {
  return useQuery({
    queryKey: ['term-closure', schoolId, academicYear, term],
    queryFn: async () => {
      if (!schoolId || term === undefined) return null;

      const { data, error } = await supabase
        .from('fee_term_closures')
        .select('*')
        .eq('school_id', schoolId)
        .eq('academic_year', academicYear)
        .eq('term', term)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        schoolId: data.school_id,
        academicYear: data.academic_year,
        term: data.term,
        isClosed: data.is_closed,
        closedAt: data.closed_at,
        closedBy: data.closed_by,
        totalFeesCharged: Number(data.total_fees_charged) || 0,
        totalPaymentsReceived: Number(data.total_payments_received) || 0,
        totalAdjustments: Number(data.total_adjustments) || 0,
        outstandingBalance: Number(data.outstanding_balance) || 0,
        studentCount: data.student_count || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as TermClosureStatus;
    },
    enabled: !!schoolId && term !== undefined,
  });
}

/**
 * Get all term closures for a school year
 */
export function useSchoolTermClosures(
  schoolId: string | undefined,
  academicYear: number
) {
  return useQuery({
    queryKey: ['school-term-closures', schoolId, academicYear],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('fee_term_closures')
        .select('*')
        .eq('school_id', schoolId)
        .eq('academic_year', academicYear)
        .order('term');

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        schoolId: row.school_id,
        academicYear: row.academic_year,
        term: row.term,
        isClosed: row.is_closed,
        closedAt: row.closed_at,
        closedBy: row.closed_by,
        totalFeesCharged: Number(row.total_fees_charged) || 0,
        totalPaymentsReceived: Number(row.total_payments_received) || 0,
        totalAdjustments: Number(row.total_adjustments) || 0,
        outstandingBalance: Number(row.outstanding_balance) || 0,
        studentCount: row.student_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as TermClosureStatus[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Calculate live term summary (before closure)
 */
export function useTermSummary(
  schoolId: string | undefined,
  academicYear: number,
  term: number | undefined
) {
  return useQuery({
    queryKey: ['term-summary', schoolId, academicYear, term],
    queryFn: async () => {
      if (!schoolId || term === undefined) return null;

      // Get all ledger entries for this term
      const { data: entries, error } = await supabase
        .from('student_fee_ledger')
        .select('student_id, entry_type, debit_amount, credit_amount')
        .eq('school_id', schoolId)
        .eq('academic_year', academicYear)
        .eq('term', term);

      if (error) throw error;

      const entriesData = entries || [];

      // Calculate totals
      let totalFees = 0;
      let totalPayments = 0;
      let totalAdjustments = 0;
      const studentBalances = new Map<string, { charges: number; payments: number }>();

      entriesData.forEach(entry => {
        const debit = Number(entry.debit_amount) || 0;
        const credit = Number(entry.credit_amount) || 0;
        const entryType = entry.entry_type as string;

        if (entryType === 'charge' || entryType === 'late_fee' || entryType === 'adjustment_debit') {
          totalFees += debit;
        } else if (entryType === 'payment') {
          totalPayments += credit;
        } else if (['waiver', 'adjustment_credit', 'credit', 'reversal'].includes(entryType)) {
          totalAdjustments += credit;
        }

        // Track per-student balances
        if (!studentBalances.has(entry.student_id)) {
          studentBalances.set(entry.student_id, { charges: 0, payments: 0 });
        }
        const balance = studentBalances.get(entry.student_id)!;
        balance.charges += debit;
        balance.payments += credit;
      });

      // Count by status
      let paidCount = 0;
      let partialCount = 0;
      let unpaidCount = 0;

      studentBalances.forEach(({ charges, payments }) => {
        const remaining = charges - payments;
        if (remaining <= 0 && charges > 0) {
          paidCount++;
        } else if (payments > 0 && remaining > 0) {
          partialCount++;
        } else if (charges > 0) {
          unpaidCount++;
        }
      });

      return {
        totalFees,
        totalPayments,
        totalAdjustments,
        outstandingBalance: totalFees - totalPayments - totalAdjustments,
        studentCount: studentBalances.size,
        paidCount,
        partialCount,
        unpaidCount,
      } as TermSummary;
    },
    enabled: !!schoolId && term !== undefined,
  });
}

/**
 * Close a term
 */
export function useCloseTerm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      schoolId: string;
      academicYear: number;
      term: number;
      closedBy: string;
    }) => {
      const { data, error } = await supabase.rpc('close_fee_term', {
        p_school_id: input.schoolId,
        p_academic_year: input.academicYear,
        p_term: input.term,
        p_closed_by: input.closedBy,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to close term');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Term Closed',
        description: `Term ${variables.term} has been financially closed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['term-closure'] });
      queryClient.invalidateQueries({ queryKey: ['term-closure-status'] });
      queryClient.invalidateQueries({ queryKey: ['school-term-closures'] });
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

// =============================================================================
// UTILITIES
// =============================================================================

export function getTermLabel(term: number): string {
  return `Term ${term}`;
}

export function formatClosureDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-ZM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

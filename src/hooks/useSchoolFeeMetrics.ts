import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolFeeMetrics {
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  totalStudents: number;
  studentsWithBalance: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

/**
 * Hook to fetch aggregate fee metrics for a school
 */
export function useSchoolFeeMetrics(
  schoolId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['school-fee-metrics', schoolId, academicYear, term],
    queryFn: async (): Promise<SchoolFeeMetrics | null> => {
      if (!schoolId) return null;

      // Get all students in the school
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .is('deleted_at', null);

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map(s => s.id);

      if (studentIds.length === 0) {
        return {
          expectedTotal: 0,
          collectedTotal: 0,
          outstandingTotal: 0,
          totalStudents: 0,
          studentsWithBalance: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
        };
      }

      // Get ledger entries for all students
      let query = supabase
        .from('student_fee_ledger')
        .select('student_id, debit_amount, credit_amount')
        .eq('school_id', schoolId);

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      if (term !== undefined) {
        query = query.eq('term', term);
      }

      const { data: entries, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      // Calculate per-student balances
      const studentBalances = new Map<string, { charges: number; payments: number }>();

      studentIds.forEach(id => {
        studentBalances.set(id, { charges: 0, payments: 0 });
      });

      (entries || []).forEach(entry => {
        const balance = studentBalances.get(entry.student_id);
        if (balance) {
          balance.charges += Number(entry.debit_amount);
          balance.payments += Number(entry.credit_amount);
        }
      });

      let expectedTotal = 0;
      let collectedTotal = 0;
      let paidCount = 0;
      let partialCount = 0;
      let unpaidCount = 0;
      let studentsWithBalance = 0;
      let studentsWithFees = 0;

      studentBalances.forEach(({ charges, payments }) => {
        if (charges > 0) {
          studentsWithFees++;
          expectedTotal += charges;
          collectedTotal += payments;

          const balance = charges - payments;
          if (balance > 0) {
            studentsWithBalance++;
          }

          if (balance <= 0) {
            paidCount++;
          } else if (payments > 0) {
            partialCount++;
          } else {
            unpaidCount++;
          }
        }
      });

      return {
        expectedTotal,
        collectedTotal,
        outstandingTotal: Math.max(0, expectedTotal - collectedTotal),
        totalStudents: studentsWithFees,
        studentsWithBalance,
        paidCount,
        partialCount,
        unpaidCount,
      };
    },
    enabled: !!schoolId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolStudentBalance {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  grade: string | null;
  totalCharges: number;
  totalPayments: number;
  currentBalance: number;
  status: 'paid' | 'partial' | 'unpaid';
  lastPaymentDate: string | null;
}

/**
 * Hook to fetch all student balances for a school
 */
export function useSchoolStudentBalances(
  schoolId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['school-student-balances', schoolId, academicYear, term],
    queryFn: async (): Promise<SchoolStudentBalance[]> => {
      if (!schoolId) return [];

      // Get all students with their class info
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          class_id,
          classes (
            id,
            name,
            grade
          )
        `)
        .eq('school_id', schoolId)
        .is('deleted_at', null)
        .order('name');

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map(s => s.id);

      if (studentIds.length === 0) return [];

      // Get ledger entries for all students
      let query = supabase
        .from('student_fee_ledger')
        .select('student_id, debit_amount, credit_amount, entry_type, entry_date')
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
      const studentData = new Map<string, {
        charges: number;
        payments: number;
        lastPaymentDate: string | null;
      }>();

      studentIds.forEach(id => {
        studentData.set(id, { charges: 0, payments: 0, lastPaymentDate: null });
      });

      (entries || []).forEach(entry => {
        const data = studentData.get(entry.student_id);
        if (data) {
          data.charges += Number(entry.debit_amount);
          data.payments += Number(entry.credit_amount);
          if (entry.entry_type === 'payment') {
            if (!data.lastPaymentDate || entry.entry_date > data.lastPaymentDate) {
              data.lastPaymentDate = entry.entry_date;
            }
          }
        }
      });

      return (students || []).map(student => {
        const data = studentData.get(student.id)!;
        const balance = data.charges - data.payments;

        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (balance <= 0 && data.charges > 0) {
          status = 'paid';
        } else if (data.payments > 0 && balance > 0) {
          status = 'partial';
        } else if (data.charges === 0) {
          status = 'paid'; // No fees assigned
        }

        // Handle classes as array or single object
        const classInfo = Array.isArray(student.classes) 
          ? student.classes[0] 
          : student.classes;

        return {
          studentId: student.id,
          studentName: student.name,
          classId: student.class_id,
          className: classInfo?.name || null,
          grade: classInfo?.grade || null,
          totalCharges: data.charges,
          totalPayments: data.payments,
          currentBalance: Math.max(0, balance),
          status,
          lastPaymentDate: data.lastPaymentDate,
        };
      });
    },
    enabled: !!schoolId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatZMW } from '@/lib/school-fees-system';

// =============================================================================
// TYPES
// =============================================================================

export interface StudentLedgerEntry {
  id: string;
  schoolId: string;
  studentId: string;
  entryType: string;
  entryDate: string;
  effectiveDate: string;
  academicYear: number;
  term: number | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  feeCategoryId: string | null;
  feeStructureId: string | null;
  description: string;
  referenceNumber: string | null;
  notes: string | null;
  recordedBy: string | null;
  recordedByRole: string | null;
  recordedAt: string;
  sequenceNumber: number;
}

export interface StudentBalance {
  studentId: string;
  studentName: string;
  totalCharges: number;
  totalPayments: number;
  currentBalance: number;
  status: 'paid' | 'partial' | 'unpaid';
  lastPaymentDate: string | null;
}

export interface ClassFeeSummary {
  classId: string;
  className: string;
  studentCount: number;
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

// =============================================================================
// STUDENT LEDGER HOOK
// =============================================================================

export function useStudentLedger(
  studentId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['student-ledger', studentId, academicYear, term],
    queryFn: async () => {
      if (!studentId) return [];

      let query = supabase
        .from('student_fee_ledger')
        .select('*')
        .eq('student_id', studentId)
        .order('sequence_number', { ascending: true });

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
        entryType: row.entry_type,
        entryDate: row.entry_date,
        effectiveDate: row.effective_date,
        academicYear: row.academic_year,
        term: row.term,
        debitAmount: Number(row.debit_amount),
        creditAmount: Number(row.credit_amount),
        runningBalance: Number(row.running_balance),
        feeCategoryId: row.fee_category_id,
        feeStructureId: row.fee_structure_id,
        description: row.description,
        referenceNumber: row.reference_number,
        notes: row.notes,
        recordedBy: row.recorded_by,
        recordedByRole: row.recorded_by_role,
        recordedAt: row.recorded_at,
        sequenceNumber: row.sequence_number,
      })) as StudentLedgerEntry[];
    },
    enabled: !!studentId,
  });
}

// =============================================================================
// STUDENT BALANCE HOOK
// =============================================================================

export function useStudentBalance(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-balance', studentId],
    queryFn: async () => {
      if (!studentId) return null;

      // Get all ledger entries to calculate balance
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('student_fee_ledger')
        .select('debit_amount, credit_amount, entry_date, entry_type')
        .eq('student_id', studentId);

      if (ledgerError) throw ledgerError;

      // Get student name
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('name')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      const entries = ledgerEntries || [];
      const totalCharges = entries.reduce((sum, e) => sum + Number(e.debit_amount), 0);
      const totalPayments = entries.reduce((sum, e) => sum + Number(e.credit_amount), 0);
      const currentBalance = totalCharges - totalPayments;

      // Find last payment date
      const payments = entries.filter(e => e.entry_type === 'payment');
      const lastPaymentDate = payments.length > 0
        ? payments.sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0].entry_date
        : null;

      // Determine status
      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (currentBalance <= 0 && totalCharges > 0) {
        status = 'paid';
      } else if (totalPayments > 0 && currentBalance > 0) {
        status = 'partial';
      }

      return {
        studentId,
        studentName: student?.name || 'Unknown',
        totalCharges,
        totalPayments,
        currentBalance: Math.max(0, currentBalance),
        status,
        lastPaymentDate,
      } as StudentBalance;
    },
    enabled: !!studentId,
  });
}

// =============================================================================
// CLASS FEES SUMMARY HOOK
// =============================================================================

export function useClassFeesSummary(
  classId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['class-fees-summary', classId, academicYear, term],
    queryFn: async () => {
      if (!classId) return null;

      // Get class info
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('id', classId)
        .single();

      if (classError) throw classError;

      // Get students in class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .eq('class_id', classId)
        .is('deleted_at', null);

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map(s => s.id);

      if (studentIds.length === 0) {
        return {
          classId,
          className: classData?.name || 'Unknown',
          studentCount: 0,
          expectedTotal: 0,
          collectedTotal: 0,
          outstandingTotal: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
        } as ClassFeeSummary;
      }

      // Get ledger entries for all students
      let query = supabase
        .from('student_fee_ledger')
        .select('student_id, debit_amount, credit_amount, entry_type')
        .in('student_id', studentIds);

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

      studentBalances.forEach(({ charges, payments }) => {
        expectedTotal += charges;
        collectedTotal += payments;
        
        const balance = charges - payments;
        if (balance <= 0 && charges > 0) {
          paidCount++;
        } else if (payments > 0 && balance > 0) {
          partialCount++;
        } else if (charges > 0) {
          unpaidCount++;
        }
      });

      return {
        classId,
        className: classData?.name || 'Unknown',
        studentCount: studentIds.length,
        expectedTotal,
        collectedTotal,
        outstandingTotal: Math.max(0, expectedTotal - collectedTotal),
        paidCount,
        partialCount,
        unpaidCount,
      } as ClassFeeSummary;
    },
    enabled: !!classId,
  });
}

// =============================================================================
// CLASS STUDENT BALANCES HOOK
// =============================================================================

export function useClassStudentBalances(
  classId: string | undefined,
  academicYear?: number,
  term?: number
) {
  return useQuery({
    queryKey: ['class-student-balances', classId, academicYear, term],
    queryFn: async () => {
      if (!classId) return [];

      // Get students in class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('name');

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map(s => s.id);

      if (studentIds.length === 0) return [];

      // Get ledger entries for all students
      let query = supabase
        .from('student_fee_ledger')
        .select('student_id, debit_amount, credit_amount, entry_type, entry_date')
        .in('student_id', studentIds);

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
        }

        return {
          studentId: student.id,
          studentName: student.name,
          totalCharges: data.charges,
          totalPayments: data.payments,
          currentBalance: Math.max(0, balance),
          status,
          lastPaymentDate: data.lastPaymentDate,
        } as StudentBalance;
      });
    },
    enabled: !!classId,
  });
}

// =============================================================================
// FEE STRUCTURES HOOK
// =============================================================================

export function useFeeStructures(schoolId: string | undefined, academicYear?: number, term?: number) {
  return useQuery({
    queryKey: ['fee-structures', schoolId, academicYear, term],
    queryFn: async () => {
      if (!schoolId) return [];

      let query = supabase
        .from('fee_structures')
        .select(`
          *,
          fee_categories (id, name, code)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      if (term !== undefined) {
        query = query.eq('term', term);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },
    enabled: !!schoolId,
  });
}

// =============================================================================
// FEE CATEGORIES HOOK
// =============================================================================

export function useFeeCategories(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['fee-categories', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return data || [];
    },
    enabled: !!schoolId,
  });
}

// =============================================================================
// CREATE FEE STRUCTURE MUTATION
// =============================================================================

export function useCreateFeeStructure() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      schoolId: string;
      categoryId: string;
      academicYear: number;
      term: number | null;
      grade: string | null;
      amount: number;
      dueDate?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('fee_structures')
        .insert({
          school_id: input.schoolId,
          category_id: input.categoryId,
          academic_year: input.academicYear,
          term: input.term,
          grade: input.grade,
          amount: input.amount,
          due_date: input.dueDate,
          notes: input.notes,
          is_active: true,
          frequency: 'term',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Fee Structure Created',
        description: 'The fee structure has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
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
// RECORD PAYMENT MUTATION (SIMPLE VERSION)
// =============================================================================

export function useRecordStudentPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      schoolId: string;
      studentId: string;
      academicYear: number;
      term: number | null;
      amount: number;
      paymentMethod: string;
      paymentDate: string;
      receiptNumber?: string;
      referenceNumber?: string;
      payerName?: string;
      notes?: string;
      recordedBy: string;
      recordedByRole: string;
    }) => {
      const description = `Payment received: ${input.paymentMethod}${input.receiptNumber ? ` (Receipt: ${input.receiptNumber})` : ''}`;

      const { data, error } = await supabase.rpc('insert_ledger_entry', {
        p_school_id: input.schoolId,
        p_student_id: input.studentId,
        p_entry_type: 'payment',
        p_entry_date: input.paymentDate,
        p_effective_date: input.paymentDate,
        p_academic_year: input.academicYear,
        p_term: input.term,
        p_debit_amount: 0,
        p_credit_amount: input.amount,
        p_fee_category_id: null,
        p_fee_structure_id: null,
        p_payment_id: null,
        p_related_entry_id: null,
        p_description: description,
        p_reference_number: input.referenceNumber || input.receiptNumber,
        p_notes: input.notes ? `Payer: ${input.payerName || 'N/A'}. ${input.notes}` : `Payer: ${input.payerName || 'N/A'}`,
        p_recorded_by: input.recordedBy,
        p_recorded_by_role: input.recordedByRole,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Payment Recorded',
        description: 'The payment has been added to the ledger.',
      });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['class-fees-summary'] });
      queryClient.invalidateQueries({ queryKey: ['class-student-balances'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Recording Payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// RECORD CHARGE MUTATION
// =============================================================================

export function useRecordStudentCharge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      schoolId: string;
      studentId: string;
      academicYear: number;
      term: number | null;
      amount: number;
      categoryId?: string;
      structureId?: string;
      description: string;
      recordedBy: string;
      recordedByRole: string;
    }) => {
      const { data, error } = await supabase.rpc('insert_ledger_entry', {
        p_school_id: input.schoolId,
        p_student_id: input.studentId,
        p_entry_type: 'charge',
        p_entry_date: new Date().toISOString().split('T')[0],
        p_effective_date: new Date().toISOString().split('T')[0],
        p_academic_year: input.academicYear,
        p_term: input.term,
        p_debit_amount: input.amount,
        p_credit_amount: 0,
        p_fee_category_id: input.categoryId || null,
        p_fee_structure_id: input.structureId || null,
        p_payment_id: null,
        p_related_entry_id: null,
        p_description: input.description,
        p_reference_number: null,
        p_notes: null,
        p_recorded_by: input.recordedBy,
        p_recorded_by_role: input.recordedByRole,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Charge Recorded',
        description: 'The fee has been added to the ledger.',
      });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['class-fees-summary'] });
      queryClient.invalidateQueries({ queryKey: ['class-student-balances'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Recording Charge',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// HELPER: FORMAT BALANCE FOR DISPLAY
// =============================================================================

export function useFormatBalance() {
  return {
    formatAmount: formatZMW,
    getStatusLabel: (status: 'paid' | 'partial' | 'unpaid') => {
      switch (status) {
        case 'paid': return 'Paid';
        case 'partial': return 'Partial';
        case 'unpaid': return 'Outstanding';
      }
    },
    getStatusColor: (status: 'paid' | 'partial' | 'unpaid') => {
      switch (status) {
        case 'paid': return 'bg-emerald-100 text-emerald-800';
        case 'partial': return 'bg-amber-100 text-amber-800';
        case 'unpaid': return 'bg-red-100 text-red-800';
      }
    },
  };
}

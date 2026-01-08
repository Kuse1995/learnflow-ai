import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatZMW } from '@/lib/school-fees-system';

// =============================================================================
// TYPES
// =============================================================================

export interface FeeReceipt {
  id: string;
  ledgerEntryId: string;
  receiptNumber: string;
  issuedAt: string;
  issuedBy: string | null;
  schoolId: string;
  schoolNameSnapshot: string;
  studentId: string;
  studentNameSnapshot: string;
  classNameSnapshot: string | null;
  gradeSnapshot: string | null;
  academicYear: number;
  term: number | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string | null;
  voided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

export interface StudentStatement {
  studentId: string;
  studentName: string;
  className: string | null;
  grade: string | null;
  academicYear: number;
  term: number | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalCharges: number;
  totalPayments: number;
  entries: StatementEntry[];
}

export interface StatementEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string | null;
}

// =============================================================================
// RECEIPTS HOOKS
// =============================================================================

export function useStudentReceipts(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-receipts', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('fee_receipts')
        .select('*')
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(mapReceiptFromDb);
    },
    enabled: !!studentId,
  });
}

export function useReceipt(receiptId: string | undefined) {
  return useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: async () => {
      if (!receiptId) return null;

      const { data, error } = await supabase
        .from('fee_receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) throw error;

      return mapReceiptFromDb(data);
    },
    enabled: !!receiptId,
  });
}

export function useReceiptByLedgerEntry(ledgerEntryId: string | undefined) {
  return useQuery({
    queryKey: ['receipt-by-ledger', ledgerEntryId],
    queryFn: async () => {
      if (!ledgerEntryId) return null;

      const { data, error } = await supabase
        .from('fee_receipts')
        .select('*')
        .eq('ledger_entry_id', ledgerEntryId)
        .eq('voided', false)
        .maybeSingle();

      if (error) throw error;

      return data ? mapReceiptFromDb(data) : null;
    },
    enabled: !!ledgerEntryId,
  });
}

export function useCreateReceipt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { ledgerEntryId: string; issuedBy?: string }) => {
      const { data, error } = await supabase.rpc('create_fee_receipt', {
        p_ledger_entry_id: input.ledgerEntryId,
        p_issued_by: input.issuedBy || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast({
        title: 'Receipt Issued',
        description: 'The receipt has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['student-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-by-ledger'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Issuing Receipt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useVoidReceipt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { receiptId: string; voidedBy: string; voidReason: string }) => {
      const { data, error } = await supabase.rpc('void_fee_receipt', {
        p_receipt_id: input.receiptId,
        p_voided_by: input.voidedBy,
        p_void_reason: input.voidReason,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      toast({
        title: 'Receipt Voided',
        description: 'The receipt has been voided. A reversal entry must be recorded separately.',
      });
      queryClient.invalidateQueries({ queryKey: ['student-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Voiding Receipt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// STATEMENTS HOOKS
// =============================================================================

export function useStudentStatement(
  studentId: string | undefined,
  academicYear: number,
  term?: number,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['student-statement', studentId, academicYear, term, startDate, endDate],
    queryFn: async (): Promise<StudentStatement | null> => {
      if (!studentId) return null;

      // Get student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, class_id')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Get class info if available
      let className: string | null = null;
      let grade: string | null = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name, grade')
          .eq('id', student.class_id)
          .single();
        if (classData) {
          className = classData.name;
          grade = classData.grade;
        }
      }

      // Build ledger query
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

      if (startDate) {
        query = query.gte('entry_date', startDate);
      }

      if (endDate) {
        query = query.lte('entry_date', endDate);
      }

      const { data: entries, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      const ledgerEntries = entries || [];

      // Calculate opening balance (balance before first entry)
      let openingBalance = 0;
      if (ledgerEntries.length > 0) {
        const firstEntry = ledgerEntries[0];
        openingBalance = Number(firstEntry.running_balance) - 
          Number(firstEntry.debit_amount) + Number(firstEntry.credit_amount);
      }

      // Calculate totals
      let totalCharges = 0;
      let totalPayments = 0;

      const statementEntries: StatementEntry[] = ledgerEntries.map((entry) => {
        const debit = Number(entry.debit_amount);
        const credit = Number(entry.credit_amount);
        
        totalCharges += debit;
        totalPayments += credit;

        return {
          date: entry.entry_date,
          description: entry.description,
          debit,
          credit,
          balance: Number(entry.running_balance),
          reference: entry.reference_number,
        };
      });

      const closingBalance = ledgerEntries.length > 0
        ? Number(ledgerEntries[ledgerEntries.length - 1].running_balance)
        : 0;

      return {
        studentId,
        studentName: student.name,
        className,
        grade,
        academicYear,
        term: term ?? null,
        periodStart: startDate || `${academicYear}-01-01`,
        periodEnd: endDate || `${academicYear}-12-31`,
        openingBalance,
        closingBalance,
        totalCharges,
        totalPayments,
        entries: statementEntries,
      };
    },
    enabled: !!studentId,
  });
}

// =============================================================================
// EXPORT HOOKS
// =============================================================================

export function usePaymentsExport(
  schoolId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['payments-export', schoolId, startDate, endDate],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('student_fee_ledger')
        .select(`
          *,
          students (name, class_id),
          fee_categories (name)
        `)
        .eq('school_id', schoolId)
        .eq('entry_type', 'payment')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!schoolId && !!startDate && !!endDate,
  });
}

export function useOutstandingBalancesExport(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['outstanding-balances-export', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Get all students with their ledger summaries - cast to avoid deep type instantiation
      const studentsQuery = supabase
        .from('students')
        .select('id, name, class_id') as unknown as {
          eq: (col: string, val: string) => { is: (col: string, val: null) => Promise<{ data: Array<{ id: string; name: string; class_id: string | null }> | null; error: Error | null }> }
        };
      const { data: students, error: studentsError } = await studentsQuery
        .eq('school_id', schoolId)
        .is('deleted_at', null);

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map(s => s.id);
      if (studentIds.length === 0) return [];

      // Get all ledger entries for these students
      const { data: entries, error: entriesError } = await supabase
        .from('student_fee_ledger')
        .select('student_id, debit_amount, credit_amount')
        .in('student_id', studentIds);

      if (entriesError) throw entriesError;

      // Calculate balances per student
      const balanceMap = new Map<string, { charges: number; payments: number }>();
      studentIds.forEach(id => balanceMap.set(id, { charges: 0, payments: 0 }));

      (entries || []).forEach(entry => {
        const balance = balanceMap.get(entry.student_id);
        if (balance) {
          balance.charges += Number(entry.debit_amount);
          balance.payments += Number(entry.credit_amount);
        }
      });

      // Get class names
      const classIds = [...new Set((students || []).map(s => s.class_id).filter(Boolean))];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, grade')
        .in('id', classIds);

      const classMap = new Map((classes || []).map(c => [c.id, c]));

      return (students || []).map(student => {
        const balance = balanceMap.get(student.id)!;
        const classInfo = student.class_id ? classMap.get(student.class_id) : null;
        const outstanding = balance.charges - balance.payments;

        return {
          studentId: student.id,
          studentName: student.name,
          className: classInfo?.name || 'N/A',
          grade: classInfo?.grade || 'N/A',
          totalCharges: balance.charges,
          totalPayments: balance.payments,
          outstandingBalance: Math.max(0, outstanding),
        };
      }).filter(s => s.outstandingBalance > 0);
    },
    enabled: !!schoolId,
  });
}

// =============================================================================
// HELPERS
// =============================================================================

function mapReceiptFromDb(row: Record<string, unknown>): FeeReceipt {
  return {
    id: row.id as string,
    ledgerEntryId: row.ledger_entry_id as string,
    receiptNumber: row.receipt_number as string,
    issuedAt: row.issued_at as string,
    issuedBy: row.issued_by as string | null,
    schoolId: row.school_id as string,
    schoolNameSnapshot: row.school_name_snapshot as string,
    studentId: row.student_id as string,
    studentNameSnapshot: row.student_name_snapshot as string,
    classNameSnapshot: row.class_name_snapshot as string | null,
    gradeSnapshot: row.grade_snapshot as string | null,
    academicYear: row.academic_year as number,
    term: row.term as number | null,
    amount: Number(row.amount),
    currency: row.currency as string,
    paymentMethod: row.payment_method as string,
    paymentDate: row.payment_date as string,
    referenceNumber: row.reference_number as string | null,
    voided: row.voided as boolean,
    voidedAt: row.voided_at as string | null,
    voidedBy: row.voided_by as string | null,
    voidReason: row.void_reason as string | null,
  };
}

export function formatReceiptForPrint(receipt: FeeReceipt): string {
  return `
OFFICIAL RECEIPT
================
${receipt.schoolNameSnapshot}

Receipt No: ${receipt.receiptNumber}
Date: ${new Date(receipt.issuedAt).toLocaleDateString()}

Student: ${receipt.studentNameSnapshot}
Class: ${receipt.classNameSnapshot || 'N/A'}
Grade: ${receipt.gradeSnapshot || 'N/A'}

Academic Year: ${receipt.academicYear}
Term: ${receipt.term ? `Term ${receipt.term}` : 'Annual'}

Amount: ${formatZMW(receipt.amount)}
Payment Method: ${receipt.paymentMethod}
${receipt.referenceNumber ? `Reference: ${receipt.referenceNumber}` : ''}

${receipt.voided ? `*** VOIDED ***\nReason: ${receipt.voidReason}` : ''}

Thank you for your payment.
================
  `.trim();
}

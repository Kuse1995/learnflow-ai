import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AdjustmentType = Database['public']['Enums']['fee_adjustment_type'];

export interface FeeAdjustment {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string | null;
  adjustment_type: AdjustmentType;
  amount: number | null;
  reason: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string;
  academic_year: number;
  applies_to_term: number | null;
  parent_visible_reason: string | null;
  created_at: string;
  ledger_entry_id: string | null;
}

export interface CreateAdjustmentInput {
  school_id: string;
  student_id: string;
  class_id?: string;
  adjustment_type: AdjustmentType;
  amount?: number;
  reason: string;
  approved_by_name: string;
  academic_year: number;
  applies_to_term?: number;
  parent_visible_reason?: string;
}

// Adjustment type configuration
export const ADJUSTMENT_TYPE_CONFIG: Record<AdjustmentType, {
  label: string;
  description: string;
  requiresAmount: boolean;
  color: string;
  icon: string;
}> = {
  waiver: {
    label: 'Waiver',
    description: 'Full or partial fee waiver (reduces balance)',
    requiresAmount: true,
    color: 'bg-blue-100 text-blue-800',
    icon: 'Gift',
  },
  discount: {
    label: 'Discount',
    description: 'Approved discount on fees (reduces balance)',
    requiresAmount: true,
    color: 'bg-green-100 text-green-800',
    icon: 'Percent',
  },
  arrangement_note: {
    label: 'Arrangement Note',
    description: 'Record payment arrangement (no balance change)',
    requiresAmount: false,
    color: 'bg-gray-100 text-gray-800',
    icon: 'FileText',
  },
};

// Get display label for adjustment
export function getAdjustmentLabel(type: AdjustmentType): string {
  switch (type) {
    case 'waiver': return 'Approved waiver';
    case 'discount': return 'Approved discount';
    case 'arrangement_note': return 'Payment arrangement noted';
  }
}

// Format amount for display
export function formatAdjustmentAmount(amount: number | null, currency: string = 'ZMW'): string {
  if (amount === null) return '-';
  return `${currency} ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
}

// ============ HOOKS ============

// Fetch adjustments for a student
export function useStudentAdjustments(studentId: string | undefined) {
  return useQuery({
    queryKey: ['fee-adjustments', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('fee_adjustments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FeeAdjustment[];
    },
    enabled: !!studentId,
  });
}

// Fetch adjustments for a class
export function useClassAdjustments(classId: string | undefined, academicYear?: number, term?: number) {
  return useQuery({
    queryKey: ['fee-adjustments-class', classId, academicYear, term],
    queryFn: async () => {
      if (!classId) return [];
      
      let query = supabase
        .from('fee_adjustments')
        .select('*')
        .eq('class_id', classId);
      
      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }
      if (term) {
        query = query.eq('applies_to_term', term);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FeeAdjustment[];
    },
    enabled: !!classId,
  });
}

// Create a new adjustment
export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateAdjustmentInput) => {
      const { data, error } = await supabase.rpc('record_fee_adjustment', {
        p_school_id: input.school_id,
        p_student_id: input.student_id,
        p_class_id: input.class_id || null,
        p_adjustment_type: input.adjustment_type,
        p_amount: input.amount || null,
        p_reason: input.reason,
        p_approved_by_name: input.approved_by_name,
        p_academic_year: input.academic_year,
        p_applies_to_term: input.applies_to_term || null,
        p_parent_visible_reason: input.parent_visible_reason || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fee-adjustments', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['fee-adjustments-class', variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['student-balance', variables.student_id] });
    },
  });
}

// Get adjustment summary for a student
export function useAdjustmentSummary(studentId: string | undefined, academicYear?: number) {
  const { data: adjustments } = useStudentAdjustments(studentId);
  
  if (!adjustments) {
    return {
      totalWaivers: 0,
      totalDiscounts: 0,
      arrangementNotes: 0,
      totalAdjusted: 0,
    };
  }
  
  const filtered = academicYear 
    ? adjustments.filter(a => a.academic_year === academicYear)
    : adjustments;
  
  return {
    totalWaivers: filtered
      .filter(a => a.adjustment_type === 'waiver')
      .reduce((sum, a) => sum + (a.amount || 0), 0),
    totalDiscounts: filtered
      .filter(a => a.adjustment_type === 'discount')
      .reduce((sum, a) => sum + (a.amount || 0), 0),
    arrangementNotes: filtered.filter(a => a.adjustment_type === 'arrangement_note').length,
    totalAdjusted: filtered
      .filter(a => a.adjustment_type !== 'arrangement_note')
      .reduce((sum, a) => sum + (a.amount || 0), 0),
  };
}

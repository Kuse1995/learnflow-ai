import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentPlanTemplate {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  installment_count: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
  frequency_days: number | null;
  split_percentages: number[] | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  school_id: string;
  name: string;
  description?: string;
  installment_count: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
  frequency_days?: number;
  split_percentages?: number[];
  is_default?: boolean;
}

export function usePaymentPlanTemplates(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['payment-plan-templates', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('payment_plan_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as PaymentPlanTemplate[];
    },
    enabled: !!schoolId,
  });
}

export function useCreatePaymentPlanTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      // If setting as default, first unset any existing default
      if (input.is_default) {
        await supabase
          .from('payment_plan_templates')
          .update({ is_default: false })
          .eq('school_id', input.school_id)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('payment_plan_templates')
        .insert({
          school_id: input.school_id,
          name: input.name,
          description: input.description || null,
          installment_count: input.installment_count,
          frequency: input.frequency,
          frequency_days: input.frequency_days || null,
          split_percentages: input.split_percentages || null,
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plan-templates', variables.school_id] });
      toast.success('Payment plan template created');
    },
    onError: (error) => {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    },
  });
}

export function useUpdatePaymentPlanTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      schoolId, 
      ...updates 
    }: Partial<PaymentPlanTemplate> & { id: string; schoolId: string }) => {
      // If setting as default, first unset any existing default
      if (updates.is_default) {
        await supabase
          .from('payment_plan_templates')
          .update({ is_default: false })
          .eq('school_id', schoolId)
          .eq('is_default', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('payment_plan_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plan-templates', variables.schoolId] });
      toast.success('Template updated');
    },
    onError: (error) => {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    },
  });
}

export function useDeletePaymentPlanTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('payment_plan_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return { id, schoolId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plan-templates', variables.schoolId] });
      toast.success('Template archived');
    },
    onError: (error) => {
      console.error('Failed to archive template:', error);
      toast.error('Failed to archive template');
    },
  });
}

// Helper to generate installments from a template
export function generateInstallmentsFromTemplate(
  template: PaymentPlanTemplate,
  totalAmount: number,
  startDate: Date
): Array<{ amount: number; dueDate: Date }> {
  const installments: Array<{ amount: number; dueDate: Date }> = [];
  
  // Calculate amounts based on split percentages or equal distribution
  let amounts: number[];
  if (template.split_percentages && template.split_percentages.length === template.installment_count) {
    amounts = template.split_percentages.map(pct => Math.round((totalAmount * pct) / 100 * 100) / 100);
    // Adjust last installment to ensure total matches exactly
    const sum = amounts.slice(0, -1).reduce((a, b) => a + b, 0);
    amounts[amounts.length - 1] = Math.round((totalAmount - sum) * 100) / 100;
  } else {
    // Equal distribution
    const baseAmount = Math.floor((totalAmount / template.installment_count) * 100) / 100;
    const remainder = Math.round((totalAmount - baseAmount * template.installment_count) * 100) / 100;
    amounts = Array(template.installment_count).fill(baseAmount);
    amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + remainder) * 100) / 100;
  }

  // Calculate interval in days
  let intervalDays: number;
  switch (template.frequency) {
    case 'weekly':
      intervalDays = 7;
      break;
    case 'bi-weekly':
      intervalDays = 14;
      break;
    case 'monthly':
      intervalDays = 30;
      break;
    case 'custom':
      intervalDays = template.frequency_days || 30;
      break;
    default:
      intervalDays = 30;
  }

  // Generate installments
  for (let i = 0; i < template.installment_count; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * intervalDays));
    
    installments.push({
      amount: amounts[i],
      dueDate,
    });
  }

  return installments;
}

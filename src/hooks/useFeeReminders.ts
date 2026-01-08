import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ReminderTone = Database['public']['Enums']['reminder_tone'];
type DeliveryMethod = Database['public']['Enums']['reminder_delivery_method'];

export interface ReminderTemplate {
  id: string;
  school_id: string;
  title: string;
  message_body: string;
  tone: ReminderTone;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderLog {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string | null;
  ledger_balance_snapshot: number;
  template_id: string | null;
  custom_message: string | null;
  final_message: string;
  sent_via: DeliveryMethod;
  sent_by: string | null;
  sent_at: string;
  academic_year: number;
  term: number | null;
  student_name_snapshot: string;
  created_at: string;
}

export interface CreateReminderInput {
  school_id: string;
  student_id: string;
  class_id?: string;
  ledger_balance_snapshot: number;
  template_id?: string;
  custom_message?: string;
  final_message: string;
  sent_via: DeliveryMethod;
  academic_year: number;
  term?: number;
  student_name_snapshot: string;
}

// Delivery method configuration
export const DELIVERY_METHODS: { value: DeliveryMethod; label: string; icon: string }[] = [
  { value: 'in_person', label: 'In Person', icon: 'Users' },
  { value: 'phone_call', label: 'Phone Call', icon: 'Phone' },
  { value: 'printed_notice', label: 'Printed Notice', icon: 'Printer' },
  { value: 'whatsapp_manual', label: 'WhatsApp (Manual)', icon: 'MessageCircle' },
];

export const TONE_CONFIG: Record<ReminderTone, { label: string; color: string }> = {
  gentle: { label: 'Gentle', color: 'bg-green-100 text-green-800' },
  neutral: { label: 'Neutral', color: 'bg-blue-100 text-blue-800' },
  informative: { label: 'Informative', color: 'bg-gray-100 text-gray-800' },
};

// Parse template variables
export function parseTemplateMessage(
  template: string,
  variables: { studentName: string; term: string; balance: string }
): string {
  return template
    .replace(/{student_name}/g, variables.studentName)
    .replace(/{term}/g, variables.term)
    .replace(/{balance}/g, variables.balance);
}

// Format balance for display
export function formatBalance(amount: number, currency: string = 'ZMW'): string {
  return `${currency} ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
}

// Get term label
export function getTermLabel(term: number | undefined, academicYear: number): string {
  if (!term) return `${academicYear}`;
  return `Term ${term}, ${academicYear}`;
}

// ============ HOOKS ============

// Fetch active reminder templates for a school
export function useReminderTemplates(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-templates', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('fee_reminder_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      return data as ReminderTemplate[];
    },
    enabled: !!schoolId,
  });
}

// Fetch all templates including inactive (for admin)
export function useAllReminderTemplates(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-templates-all', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('fee_reminder_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('title');
      
      if (error) throw error;
      return data as ReminderTemplate[];
    },
    enabled: !!schoolId,
  });
}

// Fetch reminder history for a student
export function useStudentReminderHistory(studentId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-history', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('fee_reminder_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data as ReminderLog[];
    },
    enabled: !!studentId,
  });
}

// Fetch reminder history for a class
export function useClassReminderHistory(classId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-history-class', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('fee_reminder_logs')
        .select('*')
        .eq('class_id', classId)
        .order('sent_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ReminderLog[];
    },
    enabled: !!classId,
  });
}

// Create a reminder log entry
export function useCreateReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const { data, error } = await supabase
        .from('fee_reminder_logs')
        .insert({
          school_id: input.school_id,
          student_id: input.student_id,
          class_id: input.class_id || null,
          ledger_balance_snapshot: input.ledger_balance_snapshot,
          template_id: input.template_id || null,
          custom_message: input.custom_message || null,
          final_message: input.final_message,
          sent_via: input.sent_via,
          academic_year: input.academic_year,
          term: input.term || null,
          student_name_snapshot: input.student_name_snapshot,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-history', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['reminder-history-class', variables.class_id] });
    },
  });
}

// Create/update a template (admin only)
export function useManageTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      school_id: string;
      title: string;
      message_body: string;
      tone: ReminderTone;
      is_active?: boolean;
    }) => {
      if (input.id) {
        // Update existing
        const { data, error } = await supabase
          .from('fee_reminder_templates')
          .update({
            title: input.title,
            message_body: input.message_body,
            tone: input.tone,
            is_active: input.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('fee_reminder_templates')
          .insert({
            school_id: input.school_id,
            title: input.title,
            message_body: input.message_body,
            tone: input.tone,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates', variables.school_id] });
      queryClient.invalidateQueries({ queryKey: ['reminder-templates-all', variables.school_id] });
    },
  });
}

// Toggle template active status
export function useToggleTemplateActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active, school_id }: { id: string; is_active: boolean; school_id: string }) => {
      const { error } = await supabase
        .from('fee_reminder_templates')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return { id, is_active, school_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-templates', variables.school_id] });
      queryClient.invalidateQueries({ queryKey: ['reminder-templates-all', variables.school_id] });
    },
  });
}

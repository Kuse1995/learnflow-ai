import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ComplianceMode = 'standard' | 'strict';

export interface ComplianceSettings {
  id: string;
  school_id: string;
  compliance_mode: ComplianceMode;
  require_teacher_approval: boolean;
  disable_auto_generation: boolean;
  require_confirmation_steps: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditIntegrityAlert {
  id: string;
  environment: string;
  detected_at: string;
  alert_type: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
}

// Fetch compliance settings for a school
export function useComplianceSettings(schoolId?: string) {
  return useQuery({
    queryKey: ["compliance-settings", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await supabase
        .from("compliance_settings")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();
      if (error) throw error;
      return data as ComplianceSettings | null;
    },
    enabled: !!schoolId,
  });
}

// Update compliance settings
export function useUpdateComplianceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      school_id: string;
      compliance_mode?: ComplianceMode;
      require_teacher_approval?: boolean;
      disable_auto_generation?: boolean;
      require_confirmation_steps?: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("compliance_settings")
        .select("id")
        .eq("school_id", input.school_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("compliance_settings")
          .update({
            compliance_mode: input.compliance_mode,
            require_teacher_approval: input.require_teacher_approval,
            disable_auto_generation: input.disable_auto_generation,
            require_confirmation_steps: input.require_confirmation_steps,
            updated_at: new Date().toISOString(),
          })
          .eq("school_id", input.school_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("compliance_settings")
          .insert({
            school_id: input.school_id,
            compliance_mode: input.compliance_mode || 'standard',
            require_teacher_approval: input.require_teacher_approval || false,
            disable_auto_generation: input.disable_auto_generation || false,
            require_confirmation_steps: input.require_confirmation_steps || false,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["compliance-settings", variables.school_id] });
    },
  });
}

// Fetch integrity alerts
export function useIntegrityAlerts() {
  return useQuery({
    queryKey: ["audit-integrity-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_integrity_alerts")
        .select("*")
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data as AuditIntegrityAlert[];
    },
  });
}

// Resolve integrity alert
export function useResolveIntegrityAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from("audit_integrity_alerts")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-integrity-alerts"] });
    },
  });
}

// Check if strict mode is enabled
export function useIsStrictMode(schoolId?: string) {
  const { data: settings } = useComplianceSettings(schoolId);
  return settings?.compliance_mode === 'strict';
}

// Check if teacher approval is required
export function useRequiresTeacherApproval(schoolId?: string) {
  const { data: settings } = useComplianceSettings(schoolId);
  return settings?.require_teacher_approval ?? false;
}

// Check if auto-generation is disabled
export function useIsAutoGenerationDisabled(schoolId?: string) {
  const { data: settings } = useComplianceSettings(schoolId);
  return settings?.disable_auto_generation ?? false;
}

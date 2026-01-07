import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Environment, EnvironmentConfig } from "@/lib/environment-config";

// System status types
export interface SystemStatus {
  id: string;
  component: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  message: string | null;
  last_checked_at: string;
  incident_started_at: string | null;
  incident_resolved_at: string | null;
}

// Error code types
export interface ErrorCode {
  id: string;
  code: string;
  category: string;
  title: string;
  description: string;
  resolution_steps: string[];
  severity: 'info' | 'warning' | 'error';
}

// Legal document types
export interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  version: string;
  effective_date: string;
  is_active: boolean;
}

// School AI controls
export interface SchoolAIControls {
  id: string;
  school_id: string;
  ai_enabled: boolean;
  allowed_features: string[];
  paused_until: string | null;
  pause_reason: string | null;
  enabled_classes: string[];
  enabled_grades: string[];
}

/**
 * Get current environment configuration
 */
export function useEnvironmentConfig() {
  return useQuery({
    queryKey: ['environment-config'],
    queryFn: async (): Promise<EnvironmentConfig> => {
      const { data, error } = await supabase
        .from('system_environment')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      return {
        environment: (data.environment as Environment) || 'development',
        isProduction: data.is_production || false,
        debugLogsEnabled: data.debug_mode_enabled || false,
        rateLimitMultiplier: data.rate_limit_multiplier || 1.0,
        schemaLocked: data.schema_locked || false,
        hideExperimentalFeatures: data.hide_experimental_features || false,
      };
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Get all system status components
 */
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('component');

      if (error) throw error;
      return data as SystemStatus[];
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Update system status
 */
export function useUpdateSystemStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      message 
    }: { 
      id: string; 
      status: string; 
      message?: string;
    }) => {
      const { error } = await supabase
        .from('system_status')
        .update({ 
          status, 
          message, 
          last_checked_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
  });
}

/**
 * Get all error codes for support reference
 */
export function useErrorCodes() {
  return useQuery({
    queryKey: ['error-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_codes')
        .select('*')
        .order('code');

      if (error) throw error;
      return data as ErrorCode[];
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

/**
 * Get error code by code string
 */
export function useErrorCode(code: string) {
  const { data: codes } = useErrorCodes();
  return codes?.find(c => c.code === code);
}

/**
 * Get legal documents
 */
export function useLegalDocuments() {
  return useQuery({
    queryKey: ['legal-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('document_type');

      if (error) throw error;
      return data as LegalDocument[];
    },
    staleTime: 300000, // Cache for 5 minutes
  });
}

/**
 * Get school AI controls
 */
export function useSchoolAIControls(schoolId?: string) {
  return useQuery({
    queryKey: ['school-ai-controls', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      
      const { data, error } = await supabase
        .from('school_ai_controls')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;
      return data as SchoolAIControls | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Update school AI controls
 */
export function useUpdateSchoolAIControls() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (controls: Partial<SchoolAIControls> & { school_id: string }) => {
      const { data: existing } = await supabase
        .from('school_ai_controls')
        .select('id')
        .eq('school_id', controls.school_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('school_ai_controls')
          .update(controls)
          .eq('school_id', controls.school_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_ai_controls')
          .insert(controls);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-ai-controls', variables.school_id] 
      });
    },
  });
}

/**
 * Check if AI is enabled for a school
 */
export function useIsAIEnabled(schoolId?: string) {
  const { data: controls, isLoading } = useSchoolAIControls(schoolId);
  
  if (isLoading) return { isEnabled: false, isLoading: true };
  if (!controls) return { isEnabled: true, isLoading: false }; // Default enabled
  
  if (!controls.ai_enabled) return { isEnabled: false, isLoading: false };
  
  if (controls.paused_until && new Date(controls.paused_until) > new Date()) {
    return { isEnabled: false, isLoading: false, pauseReason: controls.pause_reason };
  }
  
  return { isEnabled: true, isLoading: false };
}

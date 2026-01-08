/**
 * Owner Controls Hooks
 * 
 * Hooks for system-level controls only available to the Platform Owner.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================================================
// SYSTEM MODE
// =============================================================================

export type SystemMode = 'demo' | 'production';

export function useSystemMode() {
  return useQuery({
    queryKey: ['system-mode'],
    queryFn: async (): Promise<SystemMode> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('key', 'demo_mode')
        .single();

      if (error) return 'demo'; // Default to demo if not found
      return data?.enabled ? 'demo' : 'production';
    },
  });
}

export function useToggleSystemMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: SystemMode) => {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          key: 'demo_mode',
          enabled: mode === 'demo',
          description: 'Global demo mode toggle',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      return mode;
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ['system-mode'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`System mode changed to ${mode}`);
    },
    onError: (error) => {
      toast.error('Failed to change system mode: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export function useFeatureFlagsControl() {
  return useQuery({
    queryKey: ['feature-flags-control'],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, key, enabled, description')
        .order('key');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          key,
          enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      return { key, enabled };
    },
    onSuccess: ({ key, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags-control'] });
      toast.success(`${key} ${enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error('Failed to toggle feature: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// CLEAR ANALYTICS
// =============================================================================

export function useClearAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear demo-related analytics
      const { error: usageError } = await supabase
        .from('school_usage_metrics')
        .delete()
        .not('id', 'is', null); // Delete all

      if (usageError) throw usageError;

      const { error: adoptionError } = await supabase
        .from('feature_adoption_events')
        .delete()
        .not('id', 'is', null);

      if (adoptionError) throw adoptionError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['usage-metrics'] });
      toast.success('Analytics cleared successfully');
    },
    onError: (error) => {
      toast.error('Failed to clear analytics: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// PENDING COUNTS
// =============================================================================

interface PendingCounts {
  adaptivePlans: number;
  parentInsights: number;
}

export function usePendingCounts() {
  return useQuery({
    queryKey: ['owner-pending-counts'],
    queryFn: async (): Promise<PendingCounts> => {
      const [plansRes, insightsRes] = await Promise.all([
        supabase
          .from('adaptive_support_plans')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_acknowledged', false),
        supabase
          .from('parent_insight_summaries')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_approved', false),
      ]);

      return {
        adaptivePlans: plansRes.count || 0,
        parentInsights: insightsRes.count || 0,
      };
    },
  });
}

// =============================================================================
// SYSTEM HEALTH
// =============================================================================

interface SystemHealthData {
  lastErrors: Array<{
    message: string;
    timestamp: string;
    type: string;
  }>;
  featureFlags: Array<{
    key: string;
    enabled: boolean;
  }>;
  databaseStatus: 'healthy' | 'degraded' | 'error';
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemHealthData> => {
      // Get feature flags
      const { data: flags } = await supabase
        .from('feature_flags')
        .select('key, enabled')
        .order('key');

      // Check database connectivity
      const { error: dbError } = await supabase
        .from('schools')
        .select('id', { count: 'exact', head: true });

      return {
        lastErrors: [], // Would be populated from analytics logs
        featureFlags: flags || [],
        databaseStatus: dbError ? 'error' : 'healthy',
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// =============================================================================
// DELETE MUTATIONS FOR PENDING ITEMS
// =============================================================================

export function useDeleteAdaptivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('adaptive_support_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-adaptive-support-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Adaptive support plan deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete plan: ' + (error as Error).message);
    },
  });
}

export function useDeleteParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('parent_insight_summaries')
        .delete()
        .eq('id', insightId);

      if (error) throw error;
      return insightId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-parent-insights-all'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Parent insight deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete insight: ' + (error as Error).message);
    },
  });
}

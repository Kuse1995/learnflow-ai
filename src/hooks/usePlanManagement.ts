import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number | null;
  price_annual: number | null;
  currency: string;
  max_students: number | null;
  max_teachers: number | null;
  features: Record<string, boolean>;
  ai_limits: Record<string, number>;
  is_active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  name: string;
  display_name: string;
  description?: string;
  price_monthly?: number;
  price_annual?: number;
  currency?: string;
  max_students?: number;
  max_teachers?: number;
  features?: Record<string, boolean>;
  ai_limits?: Record<string, number>;
  sort_order?: number;
}

export interface UpdatePlanInput {
  id: string;
  display_name?: string;
  description?: string;
  price_monthly?: number | null;
  price_annual?: number | null;
  currency?: string;
  max_students?: number | null;
  max_teachers?: number | null;
  features?: Record<string, boolean>;
  ai_limits?: Record<string, number>;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Fetch all plans ordered by sort_order
 */
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });
}

/**
 * Fetch active plans only
 */
export function useActivePlans() {
  return useQuery({
    queryKey: ['plans', 'active'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });
}

/**
 * Create a new plan
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlanInput): Promise<Plan> => {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          name: input.name,
          display_name: input.display_name,
          description: input.description ?? null,
          price_monthly: input.price_monthly ?? null,
          price_annual: input.price_annual ?? null,
          currency: input.currency ?? 'ZMW',
          max_students: input.max_students ?? null,
          max_teachers: input.max_teachers ?? null,
          features: input.features ?? {},
          ai_limits: input.ai_limits ?? {},
          sort_order: input.sort_order ?? 99,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });
}

/**
 * Update an existing plan
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePlanInput): Promise<Plan> => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });
}

/**
 * Archive (soft-delete) a plan
 */
export function useArchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan archived successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive plan: ${error.message}`);
    },
  });
}

/**
 * Restore an archived plan
 */
export function useRestorePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan restored successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore plan: ${error.message}`);
    },
  });
}

/**
 * Reorder plans by updating sort_order
 */
export function useReorderPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedPlanIds: string[]): Promise<void> => {
      // Update each plan's sort_order based on its position in the array
      const updates = orderedPlanIds.map((id, index) => ({
        id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('plans')
          .update({ sort_order: update.sort_order, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan order updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder plans: ${error.message}`);
    },
  });
}

// Feature keys available for plans
export const PLAN_FEATURE_KEYS = [
  'upload_analysis',
  'ai_insights',
  'parent_insights',
  'learning_paths',
  'adaptive_support',
  'priority_support',
  'custom_integrations',
] as const;

// AI limit keys available for plans
export const PLAN_AI_LIMIT_KEYS = [
  'uploads_analyzed',
  'ai_generations',
  'parent_insights',
  'adaptive_support_plans',
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
export type PlanAILimitKey = (typeof PLAN_AI_LIMIT_KEYS)[number];

/**
 * Demo Safety Hooks
 * 
 * React hooks for managing demo data safety across the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  isDemoSchool,
  isDemoClass,
  isDemoStudent,
  resetDemoData,
  validateDeleteConfirmation,
  DELETE_DEMO_CONFIRMATION_PHRASE,
  getDemoBadgeConfig,
  type DemoBadgeConfig,
  type DemoResetResult,
} from "@/lib/demo-safety";

// =============================================================================
// DEMO STATUS HOOKS
// =============================================================================

/**
 * Hook to check if current school is a demo school
 */
export function useIsDemoSchool(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["demo-status", "school", schoolId],
    queryFn: async (): Promise<boolean> => {
      if (!schoolId) return false;

      const { data, error } = await supabase
        .from("schools")
        .select("is_demo")
        .eq("id", schoolId)
        .single();

      if (error) return false;
      return data?.is_demo === true;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to check if a class is demo
 */
export function useIsDemoClass(classId: string | undefined) {
  return useQuery({
    queryKey: ["demo-status", "class", classId],
    queryFn: async (): Promise<boolean> => {
      if (!classId) return false;

      const { data, error } = await supabase
        .from("classes")
        .select("is_demo")
        .eq("id", classId)
        .single();

      if (error) return false;
      return data?.is_demo === true;
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get demo badge configuration
 */
export function useDemoBadgeConfig(
  schoolId: string | undefined,
  context: 'admin' | 'teacher' | 'parent'
): DemoBadgeConfig & { isLoading: boolean } {
  const { data: isDemo, isLoading } = useIsDemoSchool(schoolId);

  return {
    ...getDemoBadgeConfig(isDemo ?? false, context),
    isLoading,
  };
}

// =============================================================================
// DEMO DATA SUMMARY
// =============================================================================

interface DemoDataSummary {
  tableName: string;
  recordCount: number;
}

/**
 * Hook to fetch demo data summary for admin view
 */
export function useDemoDataSummary() {
  return useQuery({
    queryKey: ["demo-data-summary"],
    queryFn: async (): Promise<DemoDataSummary[]> => {
      const { data, error } = await supabase
        .from("demo_data_summary")
        .select("*");

      if (error) throw error;
      return (data || []).map((row: { table_name: string; record_count: number }) => ({
        tableName: row.table_name,
        recordCount: row.record_count,
      }));
    },
  });
}

// =============================================================================
// ADMIN DEMO CONTROLS
// =============================================================================

/**
 * Hook for resetting demo data
 */
export function useResetDemoData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DemoResetResult> => {
      return resetDemoData();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Demo Data Reset",
          description: result.message,
        });
        // Invalidate all demo-related queries
        queryClient.invalidateQueries({ queryKey: ["demo-data-summary"] });
        queryClient.invalidateQueries({ queryKey: ["demo-status"] });
        queryClient.invalidateQueries({ queryKey: ["classes"] });
        queryClient.invalidateQueries({ queryKey: ["students"] });
      } else {
        toast({
          title: "Reset Failed",
          description: result.error || result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for deleting demo school (requires confirmation phrase)
 */
export function useDeleteDemoSchool() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schoolId,
      confirmationPhrase,
    }: {
      schoolId: string;
      confirmationPhrase: string;
    }) => {
      // Validate confirmation phrase
      if (!validateDeleteConfirmation(confirmationPhrase)) {
        throw new Error(
          `Invalid confirmation. Type "${DELETE_DEMO_CONFIRMATION_PHRASE}" to confirm.`
        );
      }

      // Delete the demo school via direct delete (RLS will enforce permissions)
      // Note: This requires service_role access which is only available server-side
      // For now, we'll throw an informative error - this should be called via edge function
      throw new Error(
        "Demo school deletion requires admin privileges. Please contact support."
      );

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Demo School Deleted",
        description: "The demo school and all its data have been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["demo-data-summary"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

// =============================================================================
// NOTIFICATION SAFETY HOOK
// =============================================================================

/**
 * Hook to check if notifications should be suppressed for a school
 */
export function useShouldSuppressNotifications(schoolId: string | undefined) {
  const { data: isDemo } = useIsDemoSchool(schoolId);
  return isDemo ?? false;
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export {
  isDemoSchool,
  isDemoClass,
  isDemoStudent,
  DELETE_DEMO_CONFIRMATION_PHRASE,
};

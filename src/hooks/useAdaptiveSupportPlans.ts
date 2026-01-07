import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdaptiveSupportPlan {
  id: string;
  student_id: string;
  class_id: string;
  focus_areas: string[];
  recommended_practice_types: string[];
  support_strategies: string[];
  confidence_support_notes: string | null;
  generated_at: string;
  source_window_days: number;
  teacher_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegenerationCheck {
  canGenerate: boolean;
  existingPlan: AdaptiveSupportPlan | null;
  reason?: string;
}

const REGENERATION_GUARD_DAYS = 14;

/**
 * Hook to fetch adaptive support plans for a class
 */
export function useClassAdaptiveSupportPlans(classId: string | undefined) {
  return useQuery({
    queryKey: ["adaptive-support-plans", "class", classId],
    queryFn: async (): Promise<AdaptiveSupportPlan[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("student_intervention_plans")
        .select("*")
        .eq("class_id", classId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AdaptiveSupportPlan[];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch the latest adaptive support plan for a student
 */
export function useStudentAdaptiveSupportPlan(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["adaptive-support-plan", studentId, classId],
    queryFn: async (): Promise<AdaptiveSupportPlan | null> => {
      if (!studentId || !classId) return null;

      const { data, error } = await supabase
        .from("student_intervention_plans")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AdaptiveSupportPlan | null;
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to check if a new plan can be generated (regeneration guard)
 */
export function useCanGenerateAdaptiveSupportPlan(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["adaptive-support-plan-check", studentId, classId],
    queryFn: async (): Promise<RegenerationCheck> => {
      if (!studentId || !classId) {
        return { canGenerate: true, existingPlan: null };
      }

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - REGENERATION_GUARD_DAYS);

      const { data, error } = await supabase
        .from("student_intervention_plans")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("teacher_acknowledged", false)
        .gte("generated_at", fourteenDaysAgo.toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          canGenerate: false,
          existingPlan: data as AdaptiveSupportPlan,
          reason: `An unacknowledged support plan was generated ${Math.ceil((Date.now() - new Date(data.generated_at).getTime()) / (1000 * 60 * 60 * 24))} days ago. Please review the existing plan first.`,
        };
      }

      return { canGenerate: true, existingPlan: null };
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to generate a new adaptive support plan
 */
export function useGenerateAdaptiveSupportPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      classId,
      sourceWindowDays = 30,
      forceGenerate = false,
    }: {
      studentId: string;
      classId: string;
      sourceWindowDays?: number;
      forceGenerate?: boolean;
    }) => {
      // Regeneration guard check (unless forced)
      if (!forceGenerate) {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - REGENERATION_GUARD_DAYS);

        const { data: existingPlan } = await supabase
          .from("student_intervention_plans")
          .select("*")
          .eq("student_id", studentId)
          .eq("class_id", classId)
          .eq("teacher_acknowledged", false)
          .gte("generated_at", fourteenDaysAgo.toISOString())
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPlan) {
          throw new Error("An unacknowledged support plan already exists for this student. Please review it first or acknowledge it before generating a new one.");
        }
      }

      const response = await supabase.functions.invoke("generate-intervention-plan", {
        body: { studentId, classId, sourceWindowDays },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate support plan");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate support plan");
      }

      return response.data.plan as AdaptiveSupportPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plans", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plan", data.student_id, data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plan-check", data.student_id, data.class_id] });
    },
  });
}

/**
 * Hook to acknowledge an adaptive support plan
 */
export function useAcknowledgeAdaptiveSupportPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("student_intervention_plans")
        .update({ teacher_acknowledged: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AdaptiveSupportPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plans", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plan", data.student_id, data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-support-plan-check", data.student_id, data.class_id] });
    },
  });
}

// Re-export with old names for backward compatibility (deprecated)
/** @deprecated Use useClassAdaptiveSupportPlans instead */
export const useClassInterventionPlans = useClassAdaptiveSupportPlans;
/** @deprecated Use useStudentAdaptiveSupportPlan instead */
export const useStudentInterventionPlan = useStudentAdaptiveSupportPlan;
/** @deprecated Use useGenerateAdaptiveSupportPlan instead */
export const useGenerateInterventionPlan = useGenerateAdaptiveSupportPlan;
/** @deprecated Use useAcknowledgeAdaptiveSupportPlan instead */
export const useAcknowledgeInterventionPlan = useAcknowledgeAdaptiveSupportPlan;

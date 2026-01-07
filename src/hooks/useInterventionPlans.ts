import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentInterventionPlan {
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

/**
 * Hook to fetch intervention plans for a class
 */
export function useClassInterventionPlans(classId: string | undefined) {
  return useQuery({
    queryKey: ["intervention-plans", "class", classId],
    queryFn: async (): Promise<StudentInterventionPlan[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("student_intervention_plans")
        .select("*")
        .eq("class_id", classId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StudentInterventionPlan[];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch the latest intervention plan for a student
 */
export function useStudentInterventionPlan(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["intervention-plan", studentId, classId],
    queryFn: async (): Promise<StudentInterventionPlan | null> => {
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
      return data as StudentInterventionPlan | null;
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to generate a new intervention plan
 */
export function useGenerateInterventionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      classId,
      sourceWindowDays = 30,
    }: {
      studentId: string;
      classId: string;
      sourceWindowDays?: number;
    }) => {
      const response = await supabase.functions.invoke("generate-intervention-plan", {
        body: { studentId, classId, sourceWindowDays },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate plan");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate plan");
      }

      return response.data.plan as StudentInterventionPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intervention-plans", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["intervention-plan", data.student_id, data.class_id] });
    },
  });
}

/**
 * Hook to acknowledge an intervention plan
 */
export function useAcknowledgeInterventionPlan() {
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
      return data as StudentInterventionPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intervention-plans", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["intervention-plan", data.student_id, data.class_id] });
    },
  });
}

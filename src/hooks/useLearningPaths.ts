import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearningPath {
  id: string;
  student_id: string;
  class_id: string;
  focus_topics: string[];
  suggested_activities: string[];
  pacing_notes: string | null;
  generated_at: string;
  teacher_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningPathCheck {
  canGenerate: boolean;
  existingPath: LearningPath | null;
  reason?: string;
}

const REGENERATION_GUARD_DAYS = 14;

/**
 * Learning Paths Hooks
 * 
 * CONSTRAINTS (enforced):
 * - VISIBILITY: Teacher-only. Never expose to parents or students.
 * - No notifications triggered by any operation.
 * - No analytics, tracking, or scoring.
 * - No automatic generation—always requires manual teacher action.
 * - 14-day regeneration guard with acknowledgment requirement.
 */

/**
 * Hook to fetch learning paths for a class
 */
export function useClassLearningPaths(classId: string | undefined) {
  return useQuery({
    queryKey: ["learning-paths", "class", classId],
    queryFn: async (): Promise<LearningPath[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("student_learning_paths")
        .select("*")
        .eq("class_id", classId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LearningPath[];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch the latest learning path for a student
 */
export function useStudentLearningPath(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["learning-path", studentId, classId],
    queryFn: async (): Promise<LearningPath | null> => {
      if (!studentId || !classId) return null;

      const { data, error } = await supabase
        .from("student_learning_paths")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LearningPath | null;
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to check if a new learning path can be generated
 */
export function useCanGenerateLearningPath(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["learning-path-check", studentId, classId],
    queryFn: async (): Promise<LearningPathCheck> => {
      if (!studentId || !classId) {
        return { canGenerate: true, existingPath: null };
      }

      // Check for unacknowledged path within the guard period
      const guardDate = new Date();
      guardDate.setDate(guardDate.getDate() - REGENERATION_GUARD_DAYS);

      const { data, error } = await supabase
        .from("student_learning_paths")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("teacher_acknowledged", false)
        .gte("generated_at", guardDate.toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const daysAgo = Math.ceil(
          (Date.now() - new Date(data.generated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          canGenerate: false,
          existingPath: data as LearningPath,
          reason: `An unacknowledged learning path was generated ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago. Please review the existing path first.`,
        };
      }

      return { canGenerate: true, existingPath: null };
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to generate a new learning path
 */
export function useGenerateLearningPath() {
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
      // 14-day regeneration guard check
      const guardDate = new Date();
      guardDate.setDate(guardDate.getDate() - REGENERATION_GUARD_DAYS);

      const { data: existingPath } = await supabase
        .from("student_learning_paths")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("teacher_acknowledged", false)
        .gte("generated_at", guardDate.toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPath) {
        throw new Error("An unacknowledged learning path already exists within the last 14 days. Please review or acknowledge it first.");
      }

      const response = await supabase.functions.invoke("generate-learning-path", {
        body: { studentId, classId, sourceWindowDays },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate learning path");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate learning path");
      }

      return response.data.path as LearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["learning-path", data.student_id, data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["learning-path-check", data.student_id, data.class_id] });
    },
  });
}

/**
 * Hook to acknowledge a learning path
 */
export function useAcknowledgeLearningPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("student_learning_paths")
        .update({ teacher_acknowledged: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths", "class", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["learning-path", data.student_id, data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["learning-path-check", data.student_id, data.class_id] });
    },
  });
}

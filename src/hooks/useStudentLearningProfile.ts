import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentLearningProfile {
  id: string;
  student_id: string;
  strengths: string | null;
  weak_topics: string[];
  error_patterns: {
    conceptual: number;
    procedural: number;
    language: number;
    careless: number;
  };
  confidence_trend: "increasing" | "stable" | "declining";
  last_updated: string;
  created_at: string;
}

/**
 * Hook to fetch a student's learning profile
 */
export function useStudentLearningProfile(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-learning-profile", studentId],
    queryFn: async (): Promise<StudentLearningProfile | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        weak_topics: (data.weak_topics as string[]) || [],
        error_patterns: data.error_patterns as unknown as StudentLearningProfile["error_patterns"],
        confidence_trend: data.confidence_trend as StudentLearningProfile["confidence_trend"],
      };
    },
    enabled: !!studentId,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearningPatternsResult {
  success: boolean;
  insights: string[];
  data_coverage: {
    analyses_count: number;
    profiles_count: number;
    actions_count: number;
    earliest_date: string | null;
  };
}

/**
 * Hook to fetch longitudinal learning patterns for a class
 */
export function useLearningPatterns(classId: string | undefined) {
  return useQuery({
    queryKey: ["learning-patterns", classId],
    queryFn: async (): Promise<LearningPatternsResult> => {
      if (!classId) {
        return {
          success: true,
          insights: [],
          data_coverage: {
            analyses_count: 0,
            profiles_count: 0,
            actions_count: 0,
            earliest_date: null,
          },
        };
      }

      const response = await supabase.functions.invoke("learning-patterns", {
        body: { classId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch learning patterns");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to fetch learning patterns");
      }

      return response.data as LearningPatternsResult;
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

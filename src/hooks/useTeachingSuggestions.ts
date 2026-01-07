import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeachingSuggestion {
  category: "concept_clarification" | "practice_reinforcement" | "language_support" | "engagement_strategies";
  title: string;
  description: string;
  strategies: string[];
}

export interface TeachingSuggestionsResult {
  success: boolean;
  class_name: string;
  subject: string;
  topics: string[];
  suggestions: TeachingSuggestion[];
  pacing_notes: string | null;
  informed_by_prior_actions?: boolean;
}

interface TeachingSuggestionsInput {
  classId: string;
  uploadId?: string;
}

/**
 * Hook to fetch teaching suggestions from the AI agent
 */
export function useTeachingSuggestions() {
  return useMutation({
    mutationFn: async ({ classId, uploadId }: TeachingSuggestionsInput): Promise<TeachingSuggestionsResult> => {
      const response = await supabase.functions.invoke("teaching-suggestions", {
        body: { classId, uploadId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get teaching suggestions");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to get teaching suggestions");
      }

      return response.data as TeachingSuggestionsResult;
    },
  });
}

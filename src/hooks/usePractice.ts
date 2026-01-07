import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PracticeActivity {
  type: "guided_example" | "try_it" | "explain" | "visual_match" | "reflection";
  content: string;
  prompt: string;
  hint?: string;
}

export interface PracticeSessionData {
  welcomeMessage: string;
  activities: PracticeActivity[];
  closingMessage: string;
}

/**
 * Generate practice activities for a student
 */
export function useGeneratePractice() {
  return useMutation({
    mutationFn: async ({
      studentId,
      classId,
    }: {
      studentId: string;
      classId: string;
    }): Promise<PracticeSessionData> => {
      const response = await supabase.functions.invoke("generate-practice", {
        body: { studentId, classId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate practice");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate practice");
      }

      return {
        welcomeMessage: response.data.welcomeMessage,
        activities: response.data.activities,
        closingMessage: response.data.closingMessage,
      };
    },
  });
}

/**
 * Start a practice session (creates record in DB)
 */
export function useStartPracticeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      classId,
    }: {
      studentId: string;
      classId: string;
    }) => {
      const { data, error } = await supabase
        .from("practice_sessions")
        .insert({
          student_id: studentId,
          class_id: classId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-sessions"] });
    },
  });
}

/**
 * Complete a practice session
 */
export function useCompletePracticeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      sessionLengthMinutes,
    }: {
      sessionId: string;
      sessionLengthMinutes: number;
    }) => {
      const { error } = await supabase
        .from("practice_sessions")
        .update({
          completed_at: new Date().toISOString(),
          session_length_minutes: sessionLengthMinutes,
        })
        .eq("id", sessionId);

      if (error) throw error;
      return { sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-sessions"] });
    },
  });
}

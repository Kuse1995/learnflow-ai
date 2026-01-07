import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Student Learning Timeline Data Access Layer
 * 
 * CONSTRAINTS:
 * - READ-ONLY: No mutations, no side effects
 * - Queries the student_learning_timeline VIEW (not a table)
 * - Teacher-only visibility (enforced at UI layer)
 * - No joins in frontend - view handles all data unification
 */

export type StudentTimelineEventType =
  | "analysis"
  | "teaching_action"
  | "adaptive_support_plan"
  | "parent_update";

export interface StudentLearningTimelineEvent {
  timeline_id: string;
  student_id: string;
  class_id: string;
  event_type: StudentTimelineEventType;
  event_date: string;
  summary_text: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Fetches unified learning timeline for a student from the VIEW.
 * 
 * @param studentId - The student's UUID
 * @param classId - The class UUID
 * @returns Query result with timeline events ordered by event_date DESC
 * 
 * Behavior:
 * - Returns empty array if studentId or classId is missing
 * - Throws on Supabase error (let UI handle error display)
 * - Results are cached with react-query
 */
export function useStudentLearningTimeline(
  studentId: string | undefined,
  classId: string | undefined
) {
  return useQuery({
    queryKey: ["student-learning-timeline", studentId, classId],
    queryFn: async (): Promise<StudentLearningTimelineEvent[]> => {
      if (!studentId || !classId) {
        return [];
      }

      const { data, error } = await supabase
        .from("student_learning_timeline")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("event_date", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as unknown as StudentLearningTimelineEvent[];
    },
    enabled: !!studentId && !!classId,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Learning Evidence Timeline Hooks
 * 
 * CONSTRAINTS (enforced):
 * - VISIBILITY: Teacher-only. Never expose to parents or students.
 * - Read-only: No edits or deletions.
 * - This queries a VIEW (not a table) that unifies multiple evidence sources.
 */

export type TimelineEventType =
  | "analysis"
  | "teaching_action"
  | "adaptive_support_plan"
  | "parent_update";

/**
 * Timeline event metadata varies by event type:
 * - analysis: { upload_id: string }
 * - teaching_action: { topic: string | null, action_taken: string }
 * - adaptive_support_plan: { acknowledged: boolean, source_window_days: number }
 * - parent_update: { shared: boolean }
 */
export interface TimelineEventMetadata {
  upload_id?: string;
  topic?: string | null;
  action_taken?: string;
  acknowledged?: boolean;
  source_window_days?: number;
  shared?: boolean;
}

export interface LearningTimelineEvent {
  timeline_id: string;
  student_id: string;
  class_id: string;
  event_type: TimelineEventType;
  event_date: string;
  summary_text: string;
  metadata: TimelineEventMetadata | null;
}

interface UseStudentLearningTimelineOptions {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook to fetch learning timeline events for a student
 * Returns events ordered by occurred_at DESC with pagination
 */
export function useStudentLearningTimeline(
  studentId: string | undefined,
  classId: string | undefined,
  options: UseStudentLearningTimelineOptions = {}
) {
  const { page = 0, pageSize = DEFAULT_PAGE_SIZE } = options;
  const offset = page * pageSize;

  return useQuery({
    queryKey: ["learning-timeline", studentId, classId, page, pageSize],
    queryFn: async (): Promise<{
      events: LearningTimelineEvent[];
      totalCount: number;
      hasMore: boolean;
    }> => {
      if (!studentId || !classId) {
        return { events: [], totalCount: 0, hasMore: false };
      }

      // Fetch events with count from the VIEW
      const { data, error, count } = await supabase
        .from("student_learning_timeline")
        .select("*", { count: "exact" })
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("event_date", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const events = (data || []) as unknown as LearningTimelineEvent[];
      const totalCount = count || 0;
      const hasMore = offset + events.length < totalCount;

      return { events, totalCount, hasMore };
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to fetch all timeline events for a student (no pagination, limited to recent)
 * Useful for summary views
 */
export function useRecentStudentTimeline(
  studentId: string | undefined,
  classId: string | undefined,
  limit: number = 10
) {
  return useQuery({
    queryKey: ["learning-timeline-recent", studentId, classId, limit],
    queryFn: async (): Promise<LearningTimelineEvent[]> => {
      if (!studentId || !classId) return [];

      // Fetch from the VIEW
      const { data, error } = await supabase
        .from("student_learning_timeline")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("event_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as LearningTimelineEvent[];
    },
    enabled: !!studentId && !!classId,
  });
}

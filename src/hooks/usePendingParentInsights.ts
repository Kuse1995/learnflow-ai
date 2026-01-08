import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get count of pending (unapproved) parent insights for a class
 */
export function usePendingParentInsightsCount(classId: string | undefined) {
  return useQuery({
    queryKey: ["pending-parent-insights-count", classId],
    queryFn: async () => {
      if (!classId) return 0;
      
      const { count, error } = await (supabase
        .from("parent_insight_summaries") as any)
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId)
        .eq("approved", false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!classId,
  });
}

/**
 * Hook to get all pending parent insights grouped by class
 */
export function usePendingParentInsightsByClass() {
  return useQuery({
    queryKey: ["pending-parent-insights-by-class"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("parent_insight_summaries") as any)
        .select(`
          id,
          class_id,
          classes:class_id (
            id,
            name,
            grade,
            section
          )
        `)
        .eq("approved", false);

      if (error) throw error;

      // Group by class
      const byClass = new Map<string, { classInfo: any; count: number }>();
      
      for (const insight of data || []) {
        const classId = insight.class_id;
        if (!byClass.has(classId)) {
          byClass.set(classId, {
            classInfo: insight.classes,
            count: 0,
          });
        }
        byClass.get(classId)!.count++;
      }

      return Array.from(byClass.entries()).map(([classId, info]) => ({
        classId,
        className: info.classInfo?.name ?? "Unknown Class",
        grade: info.classInfo?.grade,
        section: info.classInfo?.section,
        pendingCount: info.count,
      }));
    },
  });
}

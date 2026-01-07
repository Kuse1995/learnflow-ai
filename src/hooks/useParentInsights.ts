import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParentInsightSummary {
  id: string;
  student_id: string;
  class_id: string;
  source_analysis_ids: string[];
  summary_text: string;
  home_support_tips: string[];
  teacher_approved: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch draft (unapproved) summaries for a class - Teacher view
 */
export function useDraftParentInsights(classId: string | undefined) {
  return useQuery({
    queryKey: ["parent-insights-drafts", classId],
    queryFn: async (): Promise<ParentInsightSummary[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("parent_insight_summaries")
        .select("*")
        .eq("class_id", classId)
        .eq("teacher_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ParentInsightSummary[];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch a specific student's draft summary
 */
export function useStudentDraftInsight(studentId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: ["parent-insight-draft", studentId, classId],
    queryFn: async (): Promise<ParentInsightSummary | null> => {
      if (!studentId || !classId) return null;

      const { data, error } = await supabase
        .from("parent_insight_summaries")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("teacher_approved", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ParentInsightSummary | null;
    },
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to fetch approved summaries for a student - Parent view
 */
export function useApprovedParentInsight(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent-insight-approved", studentId],
    queryFn: async (): Promise<ParentInsightSummary | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from("parent_insight_summaries")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_approved", true)
        .order("approved_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ParentInsightSummary | null;
    },
    enabled: !!studentId,
  });
}

/**
 * Hook to generate a new parent insight
 */
export function useGenerateParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: string; classId: string }) => {
      const response = await supabase.functions.invoke("generate-parent-insight", {
        body: { studentId, classId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate insight");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate insight");
      }

      return response.data.summary as ParentInsightSummary;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parent-insights-drafts", variables.classId] });
      queryClient.invalidateQueries({ queryKey: ["parent-insight-draft", variables.studentId, variables.classId] });
    },
  });
}

/**
 * Hook to update a draft summary
 */
export function useUpdateParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      summary_text,
      home_support_tips,
    }: {
      id: string;
      summary_text: string;
      home_support_tips: string[];
    }) => {
      const { data, error } = await supabase
        .from("parent_insight_summaries")
        .update({ summary_text, home_support_tips })
        .eq("id", id)
        .eq("teacher_approved", false)
        .select()
        .single();

      if (error) throw error;
      return data as ParentInsightSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-insights-drafts", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["parent-insight-draft", data.student_id, data.class_id] });
    },
  });
}

/**
 * Hook to approve a parent insight
 */
export function useApproveParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("parent_insight_summaries")
        .update({
          teacher_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("teacher_approved", false)
        .select()
        .single();

      if (error) throw error;
      return data as ParentInsightSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-insights-drafts", data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["parent-insight-draft", data.student_id, data.class_id] });
      queryClient.invalidateQueries({ queryKey: ["parent-insight-approved", data.student_id] });
    },
  });
}

/**
 * Hook to delete a draft summary
 */
export function useDeleteParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      const { error } = await supabase
        .from("parent_insight_summaries")
        .delete()
        .eq("id", id)
        .eq("teacher_approved", false);

      if (error) throw error;
      return { id, classId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parent-insights-drafts", variables.classId] });
    },
  });
}

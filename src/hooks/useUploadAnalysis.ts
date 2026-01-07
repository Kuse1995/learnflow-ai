import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClassSummary {
  common_errors: string[];
  topic_gaps: string[];
  overall_observations: string;
}

export interface StudentDiagnostic {
  student_id: string;
  student_name: string;
  error_patterns: {
    conceptual: number;
    procedural: number;
    language: number;
    careless: number;
  };
  weak_topics: string[];
  notes: string;
}

export interface UploadAnalysis {
  id: string;
  upload_id: string;
  class_id: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  error_message: string | null;
  class_summary: ClassSummary | null;
  student_diagnostics: StudentDiagnostic[];
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to trigger analysis for an upload
 */
export function useAnalyzeUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await supabase.functions.invoke("analyze-upload", {
        body: { uploadId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Analysis failed");
      }

      return response.data;
    },
    onSuccess: (_, uploadId) => {
      // Invalidate analyses query
      queryClient.invalidateQueries({ queryKey: ["upload-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["upload-analysis", uploadId] });
    },
  });
}

/**
 * Hook to fetch analysis for a specific upload
 */
export function useUploadAnalysis(uploadId: string | undefined) {
  return useQuery({
    queryKey: ["upload-analysis", uploadId],
    queryFn: async (): Promise<UploadAnalysis | null> => {
      if (!uploadId) return null;

      const { data, error } = await supabase
        .from("upload_analyses")
        .select("*")
        .eq("upload_id", uploadId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        class_summary: data.class_summary as unknown as ClassSummary | null,
        student_diagnostics: (data.student_diagnostics as unknown as StudentDiagnostic[]) || [],
      } as UploadAnalysis;
    },
    enabled: !!uploadId,
  });
}

/**
 * Hook to fetch all analyses for a class
 */
export function useClassAnalyses(classId: string | undefined) {
  return useQuery({
    queryKey: ["upload-analyses", "class", classId],
    queryFn: async (): Promise<UploadAnalysis[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("upload_analyses")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        class_summary: item.class_summary as unknown as ClassSummary | null,
        student_diagnostics: (item.student_diagnostics as unknown as StudentDiagnostic[]) || [],
      })) as UploadAnalysis[];
    },
    enabled: !!classId,
  });
}

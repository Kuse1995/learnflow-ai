/**
 * Term Reports Hooks
 * School-level, term-based, non-punitive reporting
 * Uses neutral language throughout
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface TermReport {
  id: string;
  school_id: string;
  term_name: string;
  academic_year: string;
  term_number: number;
  start_date: string;
  end_date: string;
  status: "draft" | "finalized";
  
  // Section A: System Adoption
  active_teachers_count: number;
  uploads_analyzed_count: number;
  active_classes_count: number;
  ai_suggestions_used_count: number;
  parent_insights_count: number;
  support_plans_count: number;
  
  // Section B: Learning Support Activity
  adaptive_plans_generated: number;
  parent_insights_approved: number;
  common_subjects_engaged: string[];
  
  // Section C: Engagement Patterns
  most_used_features: FeatureUsage[];
  least_used_features: FeatureUsage[];
  emerging_adoption_areas: string[];
  
  // Section D: Admin Notes
  admin_notes: string | null;
  
  // Metadata
  generated_at: string | null;
  generated_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureUsage {
  feature: string;
  count: number;
  label: string; // User-friendly label
}

export interface TermReportExport {
  id: string;
  term_report_id: string;
  export_format: "pdf" | "csv";
  exported_by: string;
  exported_at: string;
  file_url: string | null;
  notes: string | null;
}

// Neutral language labels for features
export const FEATURE_LABELS: Record<string, string> = {
  upload_analysis: "Upload Analysis",
  teaching_suggestions: "Teaching Suggestions",
  parent_insights: "Family Updates",
  adaptive_support: "Support Planning",
  learning_paths: "Learning Pathways",
  practice_generation: "Practice Activities",
  lesson_differentiation: "Lesson Adaptation",
};

// Fetch all term reports for a school
export function useTermReports(schoolId?: string) {
  return useQuery({
    queryKey: ["term-reports", schoolId],
    queryFn: async (): Promise<TermReport[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("term_reports")
        .select("*")
        .eq("school_id", schoolId)
        .order("academic_year", { ascending: false })
        .order("term_number", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(report => ({
        ...report,
        common_subjects_engaged: (report.common_subjects_engaged as unknown as string[]) || [],
        most_used_features: (report.most_used_features as unknown as FeatureUsage[]) || [],
        least_used_features: (report.least_used_features as unknown as FeatureUsage[]) || [],
        emerging_adoption_areas: (report.emerging_adoption_areas as unknown as string[]) || [],
      })) as TermReport[];
    },
    enabled: !!schoolId,
  });
}

// Fetch single term report
export function useTermReport(reportId?: string) {
  return useQuery({
    queryKey: ["term-report", reportId],
    queryFn: async (): Promise<TermReport | null> => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("term_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        common_subjects_engaged: (data.common_subjects_engaged as unknown as string[]) || [],
        most_used_features: (data.most_used_features as unknown as FeatureUsage[]) || [],
        least_used_features: (data.least_used_features as unknown as FeatureUsage[]) || [],
        emerging_adoption_areas: (data.emerging_adoption_areas as unknown as string[]) || [],
      } as TermReport;
    },
    enabled: !!reportId,
  });
}

// Create a new term report
export function useCreateTermReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      school_id: string;
      term_name: string;
      academic_year: string;
      term_number: number;
      start_date: string;
      end_date: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate report data
      const { data: reportData } = await supabase.rpc("generate_term_report_data", {
        p_school_id: params.school_id,
        p_start_date: params.start_date,
        p_end_date: params.end_date,
      });

      const parsedData = reportData as Record<string, number> || {};

      // Create the report
      const { data, error } = await supabase
        .from("term_reports")
        .insert({
          ...params,
          active_teachers_count: parsedData.active_teachers_count || 0,
          uploads_analyzed_count: parsedData.uploads_analyzed_count || 0,
          active_classes_count: parsedData.active_classes_count || 0,
          ai_suggestions_used_count: parsedData.ai_suggestions_used_count || 0,
          parent_insights_count: parsedData.parent_insights_count || 0,
          support_plans_count: parsedData.support_plans_count || 0,
          adaptive_plans_generated: parsedData.support_plans_count || 0,
          parent_insights_approved: parsedData.parent_insights_count || 0,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-reports"] });
      toast.success("Term report generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    },
  });
}

// Update term report (admin notes, etc.)
export function useUpdateTermReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, updates }: {
      reportId: string;
      updates: Partial<Pick<TermReport, "admin_notes" | "status">>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === "finalized") {
        updateData.finalized_at = new Date().toISOString();
        updateData.finalized_by = user.id;
      }

      const { error } = await supabase
        .from("term_reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-reports"] });
      queryClient.invalidateQueries({ queryKey: ["term-report"] });
      toast.success("Report updated");
    },
  });
}

// Finalize term report
export function useFinalizeTermReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("term_reports")
        .update({
          status: "finalized",
          finalized_at: new Date().toISOString(),
          finalized_by: user.id,
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-reports"] });
      queryClient.invalidateQueries({ queryKey: ["term-report"] });
      toast.success("Report finalized");
    },
  });
}

// Record export
export function useRecordExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, format, notes }: {
      reportId: string;
      format: "pdf" | "csv";
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("term_report_exports")
        .insert({
          term_report_id: reportId,
          export_format: format,
          exported_by: user.id,
          notes,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-report-exports"] });
    },
  });
}

// Get export history
export function useTermReportExports(reportId?: string) {
  return useQuery({
    queryKey: ["term-report-exports", reportId],
    queryFn: async (): Promise<TermReportExport[]> => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("term_report_exports")
        .select("*")
        .eq("term_report_id", reportId)
        .order("exported_at", { ascending: false });

      if (error) throw error;
      return data as TermReportExport[];
    },
    enabled: !!reportId,
  });
}

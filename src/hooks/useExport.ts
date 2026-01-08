/**
 * Export Hooks
 * Data fetching and formatting for exports
 * Teacher, Class, and Admin level exports
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { ExportSection, MetricData, TableData } from "@/lib/export-utils";

export interface ExportDateRange {
  from: Date;
  to: Date;
}

// Teacher-level: Teaching Actions Export
export function useTeachingActionsExport(
  classId: string | undefined,
  dateRange?: ExportDateRange
) {
  return useQuery({
    queryKey: ["export", "teaching-actions", classId, dateRange],
    queryFn: async (): Promise<ExportSection[]> => {
      if (!classId) return [];

      let query = supabase
        .from("audit_logs")
        .select("action, summary, created_at, entity_type")
        .eq("entity_id", classId)
        .eq("entity_type", "class")
        .order("created_at", { ascending: false });

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      const { data: actions } = await query.limit(100);

      if (!actions?.length) {
        return [
          {
            title: "Teaching Actions",
            type: "text",
            content: "No teaching actions recorded for this period.",
          },
        ];
      }

      const tableData: TableData = {
        headers: ["Date", "Action", "Summary"],
        rows: actions.map((a) => [
          format(new Date(a.created_at), "dd MMM yyyy"),
          a.action,
          a.summary,
        ]),
      };

      return [
        {
          title: "Teaching Actions Summary",
          type: "metrics",
          content: [
            { label: "Total Actions", value: actions.length },
            {
              label: "Period",
              value: dateRange
                ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM yyyy")}`
                : "All time",
            },
          ] as MetricData[],
        },
        {
          title: "Action Log",
          type: "table",
          content: tableData,
        },
      ];
    },
    enabled: !!classId,
  });
}

// Teacher-level: Adaptive Support Plans Export
export function useAdaptivePlansExport(
  classId?: string,
  studentId?: string
) {
  return useQuery({
    queryKey: ["export", "adaptive-plans", classId, studentId],
    queryFn: async (): Promise<ExportSection[]> => {
      // Get from term_reports aggregate data - class filtering done in code
      const { data: reports } = await supabase
        .from("term_reports")
        .select("support_plans_count, adaptive_plans_generated, created_at, school_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const totalPlans = reports?.reduce((sum, r) => sum + (r.support_plans_count || 0), 0) || 0;
      const acknowledgedPlans = reports?.reduce((sum, r) => sum + (r.adaptive_plans_generated || 0), 0) || 0;

      const metrics: MetricData[] = [
        { label: "Total Support Plans", value: totalPlans },
        { label: "Acknowledged by Teacher", value: acknowledgedPlans },
        { label: "Pending Acknowledgment", value: Math.max(0, totalPlans - acknowledgedPlans) },
        {
          label: "Acknowledgment Rate",
          value: totalPlans > 0 ? `${Math.round((acknowledgedPlans / totalPlans) * 100)}%` : "N/A",
        },
      ];

      return [
        {
          title: "Adaptive Support Plans Overview",
          type: "metrics",
          content: metrics,
        },
        {
          title: "Support Plan Coverage",
          type: "text",
          content:
            totalPlans > 0
              ? `This report includes ${totalPlans} support plan(s). ${acknowledgedPlans} have been acknowledged by teachers.`
              : "No support plans have been generated for this selection.",
        },
      ];
    },
    enabled: !!classId || !!studentId,
  });
}

// Teacher-level: Parent Insights Export
export function useParentInsightsExport(
  classId?: string,
  includeApprovedOnly = true
) {
  return useQuery({
    queryKey: ["export", "parent-insights", classId, includeApprovedOnly],
    queryFn: async (): Promise<ExportSection[]> => {
      // Get from term_reports - school-wide only (no class_id filter)
      const { data: insightReports } = await supabase
        .from("term_reports")
        .select("parent_insights_count, parent_insights_approved, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const totalInsights = insightReports?.reduce((sum, r) => sum + (r.parent_insights_count || 0), 0) || 0;
      const approvedInsights = insightReports?.reduce((sum, r) => sum + (r.parent_insights_approved || 0), 0) || 0;
      const draftInsights = totalInsights - approvedInsights;

      const metrics: MetricData[] = [
        { label: "Total Insights Created", value: totalInsights },
        { label: "Approved for Sharing", value: approvedInsights },
        { label: "Drafts Pending Review", value: draftInsights },
      ];

      const sections: ExportSection[] = [
        {
          title: "Parent Communication Summary",
          type: "metrics",
          content: metrics,
        },
      ];

      if (!includeApprovedOnly && draftInsights > 0) {
        sections.push({
          title: "Notes",
          type: "text",
          content: `${draftInsights} insight(s) are still in draft status and awaiting teacher approval before sharing with parents.`,
        });
      }

      return sections;
    },
    enabled: true,
  });
}

// Class-level: Learning Overview Export
export function useClassOverviewExport(classId: string | undefined) {
  return useQuery({
    queryKey: ["export", "class-overview", classId],
    queryFn: async (): Promise<ExportSection[]> => {
      if (!classId) return [];

      // Get class details
      const { data: classData } = await supabase
        .from("classes")
        .select("name, grade, section")
        .eq("id", classId)
        .single();

      // Get student count
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId)
        .is("deleted_at", null);

      // Get upload count
      const { data: uploads } = await supabase
        .from("uploads")
        .select("id")
        .eq("class_id", classId)
        .is("deleted_at", null);

      const analyzedUploads = uploads?.length || 0;

      const metrics: MetricData[] = [
        { label: "Class Name", value: classData?.name || "Unknown" },
        { label: "Grade", value: classData?.grade || "-" },
        { label: "Section", value: classData?.section || "-" },
        { label: "Total Students", value: students?.length || 0 },
        { label: "Uploads Analyzed", value: analyzedUploads },
        { label: "Total Uploads", value: uploads?.length || 0 },
      ];

      return [
        {
          title: "Class Overview",
          type: "metrics",
          content: metrics,
        },
      ];
    },
    enabled: !!classId,
  });
}

// Admin-level: School Report Export
export function useSchoolReportExport(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["export", "school-report", schoolId],
    queryFn: async (): Promise<ExportSection[]> => {
      if (!schoolId) return [];

      // Get school details
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .single();

      // Get class count
      const { count: classCount } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .is("deleted_at", null);

      // Get active teachers
      const { data: teacherData } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .not("teacher_id", "is", null);

      const uniqueTeachers = new Set(teacherData?.map((c) => c.teacher_id) || []);

      // Get upload activity
      const { count: uploadCount } = await supabase
        .from("uploads")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // Get term report data
      const { data: termReports } = await supabase
        .from("term_reports")
        .select("support_plans_count, parent_insights_count, parent_insights_approved")
        .eq("school_id", schoolId);

      const totalSupport = termReports?.reduce((sum, r) => sum + (r.support_plans_count || 0), 0) || 0;
      const totalInsights = termReports?.reduce((sum, r) => sum + (r.parent_insights_count || 0), 0) || 0;
      const approvedInsights = termReports?.reduce((sum, r) => sum + (r.parent_insights_approved || 0), 0) || 0;

      const overviewMetrics: MetricData[] = [
        { label: "School Name", value: school?.name || "Unknown" },
        { label: "Total Classes", value: classCount || 0 },
        { label: "Active Teachers", value: uniqueTeachers.size },
        { label: "Uploads Analyzed", value: uploadCount || 0 },
      ];

      const supportMetrics: MetricData[] = [
        { label: "Support Plans Created", value: totalSupport },
        { label: "Parent Insights Generated", value: totalInsights },
        { label: "Insights Approved", value: approvedInsights },
        { label: "Insights Pending", value: Math.max(0, totalInsights - approvedInsights) },
      ];

      return [
        {
          title: "School Overview",
          type: "metrics",
          content: overviewMetrics,
        },
        {
          title: "Support & Communication",
          type: "metrics",
          content: supportMetrics,
        },
        {
          title: "Report Notes",
          type: "text",
          content:
            "This report provides aggregated system usage data. It does not include individual student information or teacher performance metrics.",
        },
      ];
    },
    enabled: !!schoolId,
  });
}

// Combined export data hook
export function useExportData(
  type: "teaching-actions" | "adaptive-plans" | "parent-insights" | "class-overview" | "school-report",
  options: {
    classId?: string;
    studentId?: string;
    schoolId?: string;
    dateRange?: ExportDateRange;
    includeApprovedOnly?: boolean;
  }
) {
  const teachingActions = useTeachingActionsExport(
    type === "teaching-actions" ? options.classId : undefined,
    options.dateRange
  );
  const adaptivePlans = useAdaptivePlansExport(
    type === "adaptive-plans" ? options.classId : undefined,
    options.studentId
  );
  const parentInsights = useParentInsightsExport(
    type === "parent-insights" ? options.classId : undefined,
    options.includeApprovedOnly
  );
  const classOverview = useClassOverviewExport(
    type === "class-overview" ? options.classId : undefined
  );
  const schoolReport = useSchoolReportExport(
    type === "school-report" ? options.schoolId : undefined
  );

  return useMemo(() => {
    switch (type) {
      case "teaching-actions":
        return teachingActions;
      case "adaptive-plans":
        return adaptivePlans;
      case "parent-insights":
        return parentInsights;
      case "class-overview":
        return classOverview;
      case "school-report":
        return schoolReport;
      default:
        return { data: [], isLoading: false, isError: false };
    }
  }, [type, teachingActions, adaptivePlans, parentInsights, classOverview, schoolReport]);
}

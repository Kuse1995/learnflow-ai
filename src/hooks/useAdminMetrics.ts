import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { SaaSPlan } from "@/lib/plan-features";
import { PLAN_LIMITS, getLimit, getUsagePercentage } from "@/lib/usage-limits";

export interface SchoolUsageSummary {
  schoolId: string;
  schoolName: string;
  plan: SaaSPlan;
  billingStatus: string;
  metrics: {
    uploads_analyzed: { current: number; limit: number; percentage: number };
    ai_generations: { current: number; limit: number; percentage: number };
    parent_insights_generated: { current: number; limit: number; percentage: number };
    adaptive_support_plans_generated: { current: number; limit: number; percentage: number };
  };
  totalStudents: number;
  totalTeachers: number;
  storageUsedMb: number;
}

export interface PlatformUsageSummary {
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalAiCalls: number;
  schoolsNearLimit: number;
  schoolsAtLimit: number;
  planDistribution: Record<SaaSPlan, number>;
}

/**
 * Hook to fetch usage metrics for all schools (admin view)
 */
export function useAllSchoolsUsageMetrics() {
  const monthYear = new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: ["admin-schools-usage", monthYear],
    queryFn: async (): Promise<SchoolUsageSummary[]> => {
      // Fetch schools with their plans
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, name, plan, billing_status")
        .eq("is_archived", false);

      if (schoolsError) throw schoolsError;

      // Fetch usage metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("school_usage_metrics")
        .select("*")
        .eq("month_year", monthYear);

      if (metricsError) throw metricsError;

      // Map metrics to schools
      const metricsMap = new Map(metrics?.map((m) => [m.school_id, m]));

      return (schools || []).map((school) => {
        const usage = metricsMap.get(school.id) || {
          uploads_analyzed: 0,
          ai_generations: 0,
          parent_insights_generated: 0,
          adaptive_support_plans_generated: 0,
          total_students: 0,
          total_teachers: 0,
        };

        const plan = school.plan as SaaSPlan;

        return {
          schoolId: school.id,
          schoolName: school.name,
          plan,
          billingStatus: school.billing_status,
          metrics: {
            uploads_analyzed: {
              current: usage.uploads_analyzed,
              limit: getLimit(plan, "uploads_analyzed"),
              percentage: getUsagePercentage(usage.uploads_analyzed, getLimit(plan, "uploads_analyzed")),
            },
            ai_generations: {
              current: usage.ai_generations,
              limit: getLimit(plan, "ai_generations"),
              percentage: getUsagePercentage(usage.ai_generations, getLimit(plan, "ai_generations")),
            },
            parent_insights_generated: {
              current: usage.parent_insights_generated,
              limit: getLimit(plan, "parent_insights_generated"),
              percentage: getUsagePercentage(usage.parent_insights_generated, getLimit(plan, "parent_insights_generated")),
            },
            adaptive_support_plans_generated: {
              current: usage.adaptive_support_plans_generated,
              limit: getLimit(plan, "adaptive_support_plans_generated"),
              percentage: getUsagePercentage(usage.adaptive_support_plans_generated, getLimit(plan, "adaptive_support_plans_generated")),
            },
          },
          totalStudents: usage.total_students,
          totalTeachers: usage.total_teachers,
          storageUsedMb: 0, // Would need storage bucket query
        };
      });
    },
  });
}

/**
 * Hook to calculate platform-wide usage summary
 */
export function usePlatformUsageSummary() {
  const { data: schoolUsage, isLoading } = useAllSchoolsUsageMetrics();

  const summary = useMemo((): PlatformUsageSummary | null => {
    if (!schoolUsage) return null;

    const planDistribution: Record<SaaSPlan, number> = {
      basic: 0,
      standard: 0,
      premium: 0,
      enterprise: 0,
    };

    let totalStudents = 0;
    let totalTeachers = 0;
    let totalAiCalls = 0;
    let schoolsNearLimit = 0;
    let schoolsAtLimit = 0;

    schoolUsage.forEach((school) => {
      planDistribution[school.plan]++;
      totalStudents += school.totalStudents;
      totalTeachers += school.totalTeachers;
      totalAiCalls += school.metrics.ai_generations.current;

      // Check if near or at limit for any metric
      const metrics = Object.values(school.metrics);
      const isNearLimit = metrics.some((m) => m.percentage >= 70 && m.percentage < 100);
      const isAtLimit = metrics.some((m) => m.percentage >= 100);

      if (isAtLimit) schoolsAtLimit++;
      else if (isNearLimit) schoolsNearLimit++;
    });

    return {
      totalSchools: schoolUsage.length,
      totalStudents,
      totalTeachers,
      totalAiCalls,
      schoolsNearLimit,
      schoolsAtLimit,
      planDistribution,
    };
  }, [schoolUsage]);

  return { data: summary, isLoading };
}

/**
 * Hook to fetch AI cost breakdown by feature
 */
export function useAiCostBreakdown(schoolId?: string) {
  const monthYear = new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: ["ai-cost-breakdown", schoolId, monthYear],
    queryFn: async () => {
      let query = supabase
        .from("school_usage_metrics")
        .select("*")
        .eq("month_year", monthYear);

      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by feature
      const breakdown = {
        uploads_analyzed: 0,
        ai_generations: 0,
        parent_insights_generated: 0,
        adaptive_support_plans_generated: 0,
      };

      (data || []).forEach((record) => {
        breakdown.uploads_analyzed += record.uploads_analyzed;
        breakdown.ai_generations += record.ai_generations;
        breakdown.parent_insights_generated += record.parent_insights_generated;
        breakdown.adaptive_support_plans_generated += record.adaptive_support_plans_generated;
      });

      return breakdown;
    },
  });
}

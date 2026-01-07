import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SaaSPlan } from "@/lib/plan-features";
import type { BillingStatus, UsageMetric } from "@/lib/usage-limits";
import {
  PLAN_LIMITS,
  getLimit,
  isAtLimit,
  isNearLimit,
  formatRemaining,
  getUsagePercentage,
} from "@/lib/usage-limits";

export interface SchoolBilling {
  id: string;
  name: string;
  plan: SaaSPlan;
  billing_status: BillingStatus;
  billing_start_date: string;
  billing_end_date: string | null;
}

export interface UsageMetrics {
  uploads_analyzed: number;
  ai_generations: number;
  parent_insights_generated: number;
  adaptive_support_plans_generated: number;
  total_students: number;
  total_teachers: number;
}

export interface UsageLimitResult {
  metric: UsageMetric;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  formattedRemaining: string;
}

/**
 * Hook to fetch school billing info
 */
export function useSchoolBilling(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-billing", schoolId],
    queryFn: async (): Promise<SchoolBilling | null> => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from("schools")
        .select("id, name, plan, billing_status, billing_start_date, billing_end_date")
        .eq("id", schoolId)
        .maybeSingle();

      if (error) throw error;
      return data as SchoolBilling | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook to fetch current month's usage metrics
 */
export function useSchoolUsageMetrics(schoolId: string | undefined) {
  const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

  return useQuery({
    queryKey: ["school-usage-metrics", schoolId, monthYear],
    queryFn: async (): Promise<UsageMetrics | null> => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from("school_usage_metrics")
        .select("*")
        .eq("school_id", schoolId)
        .eq("month_year", monthYear)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no record exists
      if (!data) {
        return {
          uploads_analyzed: 0,
          ai_generations: 0,
          parent_insights_generated: 0,
          adaptive_support_plans_generated: 0,
          total_students: 0,
          total_teachers: 0,
        };
      }

      return data as UsageMetrics;
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook to check a specific usage limit
 */
export function useUsageLimit(
  schoolId: string | undefined,
  plan: SaaSPlan | undefined,
  metric: UsageMetric
): UsageLimitResult | null {
  const { data: usage } = useSchoolUsageMetrics(schoolId);

  if (!usage || !plan) return null;

  const current = usage[metric];
  const limit = getLimit(plan, metric);
  const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

  return {
    metric,
    current,
    limit,
    remaining,
    percentage: getUsagePercentage(current, limit),
    isAtLimit: isAtLimit(current, limit),
    isNearLimit: isNearLimit(current, limit),
    formattedRemaining: formatRemaining(current, limit),
  };
}

/**
 * Hook to get all usage limits for a school
 */
export function useAllUsageLimits(
  schoolId: string | undefined,
  plan: SaaSPlan | undefined
) {
  const { data: usage, isLoading } = useSchoolUsageMetrics(schoolId);

  if (!usage || !plan) {
    return { limits: null, isLoading };
  }

  const metrics: UsageMetric[] = [
    "uploads_analyzed",
    "ai_generations",
    "parent_insights_generated",
    "adaptive_support_plans_generated",
  ];

  const limits = metrics.reduce((acc, metric) => {
    const current = usage[metric];
    const limit = getLimit(plan, metric);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

    acc[metric] = {
      metric,
      current,
      limit,
      remaining,
      percentage: getUsagePercentage(current, limit),
      isAtLimit: isAtLimit(current, limit),
      isNearLimit: isNearLimit(current, limit),
      formattedRemaining: formatRemaining(current, limit),
    };

    return acc;
  }, {} as Record<UsageMetric, UsageLimitResult>);

  return { limits, isLoading };
}

/**
 * Hook to check if a school can perform an action based on billing status
 */
export function useCanPerformAction(schoolId: string | undefined) {
  const { data: billing, isLoading } = useSchoolBilling(schoolId);

  if (isLoading) {
    return { canPerform: false, isLoading: true, reason: null };
  }

  if (!billing) {
    return { canPerform: false, isLoading: false, reason: "no_school" };
  }

  if (billing.billing_status === "suspended") {
    return { canPerform: false, isLoading: false, reason: "suspended" };
  }

  // Check trial expiration
  if (billing.billing_status === "trial" && billing.billing_end_date) {
    const endDate = new Date(billing.billing_end_date);
    if (endDate < new Date()) {
      return { canPerform: false, isLoading: false, reason: "trial_expired" };
    }
  }

  return { canPerform: true, isLoading: false, reason: null };
}

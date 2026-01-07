/**
 * Billing & Usage Limits Configuration
 * HARD LIMITS - Cannot be bypassed
 */

import type { SaaSPlan } from "./plan-features";

// Billing status types
export type BillingStatus = "active" | "trial" | "suspended";

// Usage metric types
export type UsageMetric =
  | "uploads_analyzed"
  | "ai_generations"
  | "parent_insights_generated"
  | "adaptive_support_plans_generated";

// Limit configuration per metric per plan
export interface PlanLimits {
  uploads_analyzed: number; // -1 = unlimited
  ai_generations: number;
  parent_insights_generated: number;
  adaptive_support_plans_generated: number;
  max_students: number;
}

// Hard limits by plan - CANNOT BE BYPASSED
export const PLAN_LIMITS: Record<SaaSPlan, PlanLimits> = {
  basic: {
    uploads_analyzed: 0,
    ai_generations: 0,
    parent_insights_generated: 0,
    adaptive_support_plans_generated: 0,
    max_students: 100,
  },
  standard: {
    uploads_analyzed: 30,
    ai_generations: 100,
    parent_insights_generated: 20,
    adaptive_support_plans_generated: 10,
    max_students: 300,
  },
  premium: {
    uploads_analyzed: 200,
    ai_generations: 500,
    parent_insights_generated: 100,
    adaptive_support_plans_generated: 50,
    max_students: -1, // unlimited
  },
  enterprise: {
    uploads_analyzed: -1, // unlimited
    ai_generations: -1,
    parent_insights_generated: -1,
    adaptive_support_plans_generated: -1,
    max_students: -1,
  },
};

// Suspended account restrictions
export const SUSPENDED_RESTRICTIONS = {
  allowRead: true,
  allowAI: false,
  allowUploads: false,
  allowGenerations: false,
} as const;

// Upgrade copy for limit errors
export const USAGE_LIMIT_COPY = {
  limitExceeded: "This action exceeds your monthly plan limit.\nUpgrade to continue.",
  suspended: "Your account is currently suspended.\nPlease contact support.",
  trialExpired: "Your trial has expired.\nUpgrade to continue using this feature.",
  upgradePrompt: "Upgrade your plan to unlock more usage.",
} as const;

/**
 * Get the limit for a specific metric and plan
 */
export function getLimit(plan: SaaSPlan, metric: UsageMetric): number {
  return PLAN_LIMITS[plan]?.[metric] ?? 0;
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Format remaining usage for display
 */
export function formatRemaining(current: number, limit: number): string {
  if (limit === -1) return "Unlimited";
  if (limit === 0) return "Not available";
  const remaining = Math.max(0, limit - current);
  return `${remaining} remaining`;
}

/**
 * Calculate usage percentage
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Check if usage is near the limit (>80%)
 */
export function isNearLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  if (limit === 0) return true;
  return getUsagePercentage(current, limit) >= 80;
}

/**
 * Check if usage is at the limit
 */
export function isAtLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}

/**
 * RATE LIMIT GUARD
 * 
 * Prevents excessive AI generation per student per feature.
 * Enforces acknowledgement before new generation.
 */

import { supabase } from "@/integrations/supabase/client";
import { RATE_LIMITS, FALLBACK_COPY } from "./safety-constants";
import { subDays } from "date-fns";

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  existingItemId?: string;
  message: string;
}

/**
 * Check if a new AI generation is allowed for a student/feature
 */
export async function checkRateLimit(
  featureType: string,
  studentId: string,
  classId: string
): Promise<RateLimitCheckResult> {
  const cooldownDate = subDays(new Date(), RATE_LIMITS.GENERATION_COOLDOWN_DAYS).toISOString();

  try {
    switch (featureType) {
      case "adaptive_support_plan":
        return await checkAdaptiveSupportRateLimit(studentId, classId, cooldownDate);
      
      case "parent_insight":
        return await checkParentInsightRateLimit(studentId, classId, cooldownDate);
      
      case "learning_path":
        return await checkLearningPathRateLimit(studentId, classId, cooldownDate);
      
      default:
        // For features without specific rate limiting, allow by default
        return { allowed: true, message: "" };
    }
  } catch (error) {
    console.error("[RATE_LIMIT] Check failed:", error);
    // On error, allow generation but log the issue
    return { allowed: true, message: "" };
  }
}

async function checkAdaptiveSupportRateLimit(
  studentId: string,
  classId: string,
  cooldownDate: string
): Promise<RateLimitCheckResult> {
  const { data: existingPlan } = await supabase
    .from("student_intervention_plans")
    .select("id, teacher_acknowledged, created_at")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .gte("created_at", cooldownDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlan && !existingPlan.teacher_acknowledged) {
    return {
      allowed: false,
      reason: "unacknowledged_plan",
      existingItemId: existingPlan.id,
      message: FALLBACK_COPY.RATE_LIMITED,
    };
  }

  return { allowed: true, message: "" };
}

async function checkParentInsightRateLimit(
  studentId: string,
  classId: string,
  cooldownDate: string
): Promise<RateLimitCheckResult> {
  const { data: existingInsight } = await supabase
    .from("parent_insight_summaries")
    .select("id, teacher_approved, created_at")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .gte("created_at", cooldownDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInsight && !existingInsight.teacher_approved) {
    return {
      allowed: false,
      reason: "unapproved_insight",
      existingItemId: existingInsight.id,
      message: FALLBACK_COPY.RATE_LIMITED,
    };
  }

  return { allowed: true, message: "" };
}

async function checkLearningPathRateLimit(
  studentId: string,
  classId: string,
  cooldownDate: string
): Promise<RateLimitCheckResult> {
  const { data: existingPath } = await supabase
    .from("student_learning_paths")
    .select("id, teacher_acknowledged, created_at")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .gte("created_at", cooldownDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPath && !existingPath.teacher_acknowledged) {
    return {
      allowed: false,
      reason: "unacknowledged_path",
      existingItemId: existingPath.id,
      message: FALLBACK_COPY.RATE_LIMITED,
    };
  }

  return { allowed: true, message: "" };
}

/**
 * Get user-friendly message for rate limit block
 */
export function getRateLimitMessage(): string {
  return FALLBACK_COPY.RATE_LIMITED;
}

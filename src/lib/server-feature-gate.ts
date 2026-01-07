/**
 * Server-side feature gate enforcement
 * Use this in edge functions to validate feature access
 */

import type { SaaSPlan, FeatureKey } from "./plan-features";
import {
  planHasFeature,
  getRequiredPlan,
  PLAN_DISPLAY_NAMES,
} from "./plan-features";

export interface FeatureGateError {
  allowed: false;
  error: string;
  requiredPlan: SaaSPlan;
  requiredPlanName: string;
}

export interface FeatureGateSuccess {
  allowed: true;
}

export type FeatureGateServerResult = FeatureGateError | FeatureGateSuccess;

/**
 * Check if a plan has access to a feature (server-side)
 * Returns a structured result for consistent error handling
 */
export function checkFeatureAccess(
  plan: SaaSPlan | null | undefined,
  featureKey: FeatureKey
): FeatureGateServerResult {
  // Default to basic if no plan
  const currentPlan: SaaSPlan = plan || "basic";
  
  if (planHasFeature(currentPlan, featureKey)) {
    return { allowed: true };
  }

  const requiredPlan = getRequiredPlan(featureKey);
  
  return {
    allowed: false,
    error: `This feature is available on the ${PLAN_DISPLAY_NAMES[requiredPlan]} plan. Upgrade to unlock.`,
    requiredPlan,
    requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
  };
}

/**
 * Create a standardized error response for blocked features
 */
export function createBlockedFeatureResponse(
  featureKey: FeatureKey,
  requiredPlan: SaaSPlan
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: `This feature is available on the ${PLAN_DISPLAY_NAMES[requiredPlan]} plan. Upgrade to unlock.`,
      blocked: true,
      requiredPlan,
      requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

import { useMemo } from "react";
import { useSchoolPlanByClass } from "./useSchoolPlan";
import {
  type FeatureKey,
  type SaaSPlan,
  planHasFeature,
  getRequiredPlan,
  getUpgradeMessage,
  PLAN_DISPLAY_NAMES,
  FEATURE_MATRIX,
} from "@/lib/plan-features";

export interface FeatureGateResult {
  /** Whether the feature is allowed for the current plan */
  isAllowed: boolean;
  /** Whether the plan data is still loading */
  isLoading: boolean;
  /** The current plan (or 'basic' as default) */
  currentPlan: SaaSPlan;
  /** The minimum plan required for this feature */
  requiredPlan: SaaSPlan;
  /** Human-readable required plan name */
  requiredPlanName: string;
  /** User-friendly upgrade message */
  upgradeMessage: string;
  /** Whether this is an AI-powered feature */
  isAIFeature: boolean;
  /** Feature display name */
  featureName: string;
}

/**
 * Hook to check if a feature is available for the current school's plan
 * 
 * @param featureKey - The feature to check
 * @param classId - The class ID to determine the school's plan
 * 
 * @example
 * ```tsx
 * const { isAllowed, upgradeMessage } = useFeatureGate('teaching_suggestions', classId);
 * 
 * if (!isAllowed) {
 *   return <UpgradePrompt message={upgradeMessage} />;
 * }
 * ```
 */
export function useFeatureGate(
  featureKey: FeatureKey,
  classId: string | undefined
): FeatureGateResult {
  const { data: school, isLoading } = useSchoolPlanByClass(classId);

  return useMemo(() => {
    // Default to 'basic' if no school is linked
    const currentPlan: SaaSPlan = school?.plan || "basic";
    const isAllowed = planHasFeature(currentPlan, featureKey);
    const requiredPlan = getRequiredPlan(featureKey);
    const feature = FEATURE_MATRIX[featureKey];

    return {
      isAllowed,
      isLoading,
      currentPlan,
      requiredPlan,
      requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
      upgradeMessage: getUpgradeMessage(featureKey),
      isAIFeature: feature?.isAI || false,
      featureName: feature?.name || featureKey,
    };
  }, [school, isLoading, featureKey]);
}

/**
 * Hook to check multiple features at once
 */
export function useFeatureGates(
  featureKeys: FeatureKey[],
  classId: string | undefined
): Record<FeatureKey, FeatureGateResult> {
  const { data: school, isLoading } = useSchoolPlanByClass(classId);

  return useMemo(() => {
    const currentPlan: SaaSPlan = school?.plan || "basic";

    return featureKeys.reduce((acc, featureKey) => {
      const isAllowed = planHasFeature(currentPlan, featureKey);
      const requiredPlan = getRequiredPlan(featureKey);
      const feature = FEATURE_MATRIX[featureKey];

      acc[featureKey] = {
        isAllowed,
        isLoading,
        currentPlan,
        requiredPlan,
        requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
        upgradeMessage: getUpgradeMessage(featureKey),
        isAIFeature: feature?.isAI || false,
        featureName: feature?.name || featureKey,
      };

      return acc;
    }, {} as Record<FeatureKey, FeatureGateResult>);
  }, [school, isLoading, featureKeys]);
}

/**
 * Server-side feature gate enforcement for edge functions
 * This is a self-contained version for use in Supabase edge functions
 */

// Plan types
export type SaaSPlan = 'basic' | 'standard' | 'premium' | 'enterprise';

// Feature keys
export type FeatureKey =
  | 'core_students'
  | 'core_classes'
  | 'core_attendance'
  | 'core_grades'
  | 'core_teachers'
  | 'manual_lesson_planning'
  | 'teaching_suggestions'
  | 'upload_analysis_limited'
  | 'learning_profiles_readonly'
  | 'teacher_action_logs'
  | 'adaptive_support_plans'
  | 'parent_insights'
  | 'upload_analysis_full'
  | 'insight_history'
  | 'usage_analytics'
  | 'multi_campus'
  | 'custom_reporting'
  | 'api_access'
  | 'priority_processing'
  | 'advanced_audit_logs';

// Plan display names
const PLAN_DISPLAY_NAMES: Record<SaaSPlan, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<SaaSPlan, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};

// Feature to minimum plan mapping
const FEATURE_MIN_PLAN: Record<FeatureKey, SaaSPlan> = {
  // Basic
  core_students: 'basic',
  core_classes: 'basic',
  core_attendance: 'basic',
  core_grades: 'basic',
  core_teachers: 'basic',
  manual_lesson_planning: 'basic',
  // Standard
  teaching_suggestions: 'standard',
  upload_analysis_limited: 'standard',
  learning_profiles_readonly: 'standard',
  teacher_action_logs: 'standard',
  // Premium
  adaptive_support_plans: 'premium',
  parent_insights: 'premium',
  upload_analysis_full: 'premium',
  insight_history: 'premium',
  usage_analytics: 'premium',
  // Enterprise
  multi_campus: 'enterprise',
  custom_reporting: 'enterprise',
  api_access: 'enterprise',
  priority_processing: 'enterprise',
  advanced_audit_logs: 'enterprise',
};

/**
 * Check if a plan has access to a feature
 */
export function planHasFeature(plan: SaaSPlan, featureKey: FeatureKey): boolean {
  const minPlan = FEATURE_MIN_PLAN[featureKey];
  if (!minPlan) return false;
  
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[minPlan];
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(featureKey: FeatureKey): SaaSPlan {
  return FEATURE_MIN_PLAN[featureKey] || 'enterprise';
}

export interface FeatureGateResult {
  allowed: boolean;
  error?: string;
  requiredPlan?: SaaSPlan;
  requiredPlanName?: string;
}

/**
 * Check if a school's plan allows a feature
 */
export function checkFeatureAccess(
  plan: SaaSPlan | null | undefined,
  featureKey: FeatureKey
): FeatureGateResult {
  // Default to basic if no plan
  const currentPlan: SaaSPlan = plan || 'basic';
  
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
 * Create a standardized blocked feature response
 */
export function createBlockedResponse(
  featureKey: FeatureKey,
  corsHeaders: Record<string, string>
): Response {
  const requiredPlan = getRequiredPlan(featureKey);
  const requiredPlanName = PLAN_DISPLAY_NAMES[requiredPlan];
  
  return new Response(
    JSON.stringify({
      success: false,
      error: `This feature is available on the ${requiredPlanName} plan. Upgrade to unlock.`,
      blocked: true,
      requiredPlan,
      requiredPlanName,
    }),
    {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Fetch the school plan for a given class ID
 */
export async function getSchoolPlanByClassId(
  supabaseClient: any,
  classId: string
): Promise<SaaSPlan> {
  try {
    // Get the class's school_id
    const { data: classData, error: classError } = await supabaseClient
      .from('classes')
      .select('school_id')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classData?.school_id) {
      // No school linked, default to basic
      return 'basic';
    }

    // Get the school's plan
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from('schools')
      .select('plan')
      .eq('id', classData.school_id)
      .maybeSingle();

    if (schoolError || !schoolData) {
      return 'basic';
    }

    return schoolData.plan as SaaSPlan;
  } catch {
    return 'basic';
  }
}

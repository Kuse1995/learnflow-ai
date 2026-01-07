/**
 * SaaS Plan & Feature Flag System
 * Core architectural layer - ALL features MUST respect this
 */

// Plan types
export type SaaSPlan = 'basic' | 'standard' | 'premium' | 'enterprise';

// Feature keys - every gated feature must be listed here
export type FeatureKey =
  // Core features (basic)
  | 'core_students'
  | 'core_classes'
  | 'core_attendance'
  | 'core_grades'
  | 'core_teachers'
  | 'manual_lesson_planning'
  // Standard features
  | 'teaching_suggestions'
  | 'upload_analysis_limited'
  | 'learning_profiles_readonly'
  | 'teacher_action_logs'
  // Premium features
  | 'adaptive_support_plans'
  | 'parent_insights'
  | 'upload_analysis_full'
  | 'insight_history'
  | 'usage_analytics'
  // Enterprise features
  | 'multi_campus'
  | 'custom_reporting'
  | 'api_access'
  | 'priority_processing'
  | 'advanced_audit_logs';

// Feature metadata
export interface FeatureConfig {
  key: FeatureKey;
  name: string;
  description: string;
  minPlan: SaaSPlan;
  isAI: boolean;
}

// Plan display names
export const PLAN_DISPLAY_NAMES: Record<SaaSPlan, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

// Plan hierarchy for comparison
export const PLAN_HIERARCHY: Record<SaaSPlan, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};

// Complete feature matrix
export const FEATURE_MATRIX: Record<FeatureKey, FeatureConfig> = {
  // Core features (Basic)
  core_students: {
    key: 'core_students',
    name: 'Student Management',
    description: 'Manage student records',
    minPlan: 'basic',
    isAI: false,
  },
  core_classes: {
    key: 'core_classes',
    name: 'Class Management',
    description: 'Organize classes and sections',
    minPlan: 'basic',
    isAI: false,
  },
  core_attendance: {
    key: 'core_attendance',
    name: 'Attendance Tracking',
    description: 'Record daily attendance',
    minPlan: 'basic',
    isAI: false,
  },
  core_grades: {
    key: 'core_grades',
    name: 'Grade Management',
    description: 'Track student grades',
    minPlan: 'basic',
    isAI: false,
  },
  core_teachers: {
    key: 'core_teachers',
    name: 'Teacher Management',
    description: 'Manage teacher profiles',
    minPlan: 'basic',
    isAI: false,
  },
  manual_lesson_planning: {
    key: 'manual_lesson_planning',
    name: 'Lesson Planning',
    description: 'Create lesson plans manually',
    minPlan: 'basic',
    isAI: false,
  },

  // Standard features
  teaching_suggestions: {
    key: 'teaching_suggestions',
    name: 'Teaching Suggestions',
    description: 'AI-powered teaching recommendations',
    minPlan: 'standard',
    isAI: true,
  },
  upload_analysis_limited: {
    key: 'upload_analysis_limited',
    name: 'Upload Analysis (Limited)',
    description: 'Basic analysis of uploaded work',
    minPlan: 'standard',
    isAI: true,
  },
  learning_profiles_readonly: {
    key: 'learning_profiles_readonly',
    name: 'Learning Profiles',
    description: 'View student learning profiles',
    minPlan: 'standard',
    isAI: true,
  },
  teacher_action_logs: {
    key: 'teacher_action_logs',
    name: 'Action Logs',
    description: 'Record teaching actions and reflections',
    minPlan: 'standard',
    isAI: false,
  },

  // Premium features
  adaptive_support_plans: {
    key: 'adaptive_support_plans',
    name: 'Adaptive Support Plans',
    description: 'Personalized student support strategies',
    minPlan: 'premium',
    isAI: true,
  },
  parent_insights: {
    key: 'parent_insights',
    name: 'Parent Insights',
    description: 'Generate parent-friendly summaries',
    minPlan: 'premium',
    isAI: true,
  },
  upload_analysis_full: {
    key: 'upload_analysis_full',
    name: 'Full Upload Analysis',
    description: 'Complete analysis with detailed diagnostics',
    minPlan: 'premium',
    isAI: true,
  },
  insight_history: {
    key: 'insight_history',
    name: 'Insight History',
    description: 'Access historical insights and trends',
    minPlan: 'premium',
    isAI: false,
  },
  usage_analytics: {
    key: 'usage_analytics',
    name: 'Usage Analytics',
    description: 'School-level usage statistics',
    minPlan: 'premium',
    isAI: false,
  },

  // Enterprise features
  multi_campus: {
    key: 'multi_campus',
    name: 'Multi-Campus Support',
    description: 'Manage multiple school locations',
    minPlan: 'enterprise',
    isAI: false,
  },
  custom_reporting: {
    key: 'custom_reporting',
    name: 'Custom Reporting',
    description: 'Create custom reports and exports',
    minPlan: 'enterprise',
    isAI: false,
  },
  api_access: {
    key: 'api_access',
    name: 'API Access',
    description: 'Programmatic access to data',
    minPlan: 'enterprise',
    isAI: false,
  },
  priority_processing: {
    key: 'priority_processing',
    name: 'Priority Processing',
    description: 'SLA-backed processing times',
    minPlan: 'enterprise',
    isAI: false,
  },
  advanced_audit_logs: {
    key: 'advanced_audit_logs',
    name: 'Advanced Audit Logs',
    description: 'Detailed system activity logging',
    minPlan: 'enterprise',
    isAI: false,
  },
};

// Upgrade copy constants
export const UPGRADE_COPY = {
  featureBlocked: (planName: string) =>
    `This feature is available on the ${planName} plan.\nUpgrade to unlock.`,
  
  upgradePrompt: 'Upgrade your plan to access this feature.',
  
  contactSales: 'Contact our team to discuss Enterprise options.',
  
  featureUnavailable: 'This feature is not available on your current plan.',
} as const;

/**
 * Check if a plan has access to a feature
 */
export function planHasFeature(plan: SaaSPlan, featureKey: FeatureKey): boolean {
  const feature = FEATURE_MATRIX[featureKey];
  if (!feature) return false;
  
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[feature.minPlan];
}

/**
 * Get all features available for a plan
 */
export function getFeaturesForPlan(plan: SaaSPlan): FeatureConfig[] {
  return Object.values(FEATURE_MATRIX).filter(
    (feature) => PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[feature.minPlan]
  );
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(featureKey: FeatureKey): SaaSPlan {
  return FEATURE_MATRIX[featureKey]?.minPlan || 'enterprise';
}

/**
 * Get upgrade message for a blocked feature
 */
export function getUpgradeMessage(featureKey: FeatureKey): string {
  const feature = FEATURE_MATRIX[featureKey];
  if (!feature) return UPGRADE_COPY.featureUnavailable;
  
  const planName = PLAN_DISPLAY_NAMES[feature.minPlan];
  return UPGRADE_COPY.featureBlocked(planName);
}

/**
 * Check if a feature is AI-powered
 */
export function isAIFeature(featureKey: FeatureKey): boolean {
  return FEATURE_MATRIX[featureKey]?.isAI || false;
}

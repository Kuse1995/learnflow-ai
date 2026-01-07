/**
 * SYSTEM SAFETY CONSTANTS
 * 
 * Hard-coded safety copy and configuration values.
 * DO NOT modify without security review.
 */

// ============================================
// SAFETY COPY - DISCLAIMERS (Required on every AI surface)
// ============================================

export const SAFETY_DISCLAIMERS = {
  TEACHER_GUIDANCE: "This guidance is optional and intended to support professional judgment.",
  TEACHER_CONTROL: "Teachers remain fully in control of instructional decisions.",
  PARENT_APPROVED: "Parents see only content approved by the teacher.",
} as const;

// ============================================
// FALLBACK COPY - When AI fails or is blocked
// ============================================

export const FALLBACK_COPY = {
  LANGUAGE_VIOLATION: "Learning observations are currently being refined. Please check back later.",
  SERVICE_UNAVAILABLE: "This feature is temporarily unavailable. You can continue working without it.",
  RATE_LIMITED: "An existing insight is still active. Please review or acknowledge it before generating a new one.",
  GENERATION_FAILED: "We couldn't generate this content right now. Please try again later.",
} as const;

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

export const RATE_LIMITS = {
  /** Maximum days between AI generations per student per feature */
  GENERATION_COOLDOWN_DAYS: 14,
  /** Features subject to rate limiting */
  RATE_LIMITED_FEATURES: [
    "teaching_suggestions",
    "learning_profile",
    "parent_insight",
    "adaptive_support_plan",
    "learning_path",
    "lesson_differentiation",
  ] as const,
} as const;

// ============================================
// BANNED TERMS - Language that must never appear in AI output
// ============================================

export const BANNED_TERMS = [
  // Deficit language
  "weak",
  "struggling",
  "poor",
  "failing",
  "failed",
  "failure",
  "deficit",
  "deficient",
  "risk",
  "at-risk",
  "at risk",
  "concern",
  "concerning",
  "worried",
  "problematic",
  
  // Ability labels
  "low ability",
  "high ability",
  "low-ability",
  "high-ability",
  "below average",
  "above average",
  "below-average",
  "above-average",
  "underperforming",
  "underachiever",
  "overachiever",
  "gifted",
  "remedial",
  "slow learner",
  "fast learner",
  "slow-learner",
  "fast-learner",
  
  // Comparison language
  "behind",
  "ahead",
  "worst",
  "best",
  "lowest",
  "highest",
  "bottom",
  "top",
  "rank",
  "ranking",
  "percentile",
  
  // Behavioral judgment
  "lazy",
  "unmotivated",
  "disruptive",
  "problematic",
  "troublesome",
  "difficult",
  
  // Intelligence inference
  "intelligence",
  "iq",
  "smart",
  "dumb",
  "stupid",
  "brilliant",
  "genius",
] as const;

// ============================================
// VISIBILITY RULES
// ============================================

export const VISIBILITY_RULES = {
  TEACHER: {
    canViewOwnClassProfiles: true,
    canViewOwnClassPlans: true,
    canViewOwnClassInsights: true,
    canViewOwnClassPractice: true,
    canViewOtherClasses: false,
    canViewRawData: true,
    canViewAuditLogs: false,
  },
  STUDENT: {
    canViewOwnPractice: true,
    canViewOwnProfile: false,
    canViewOwnPlans: false,
    canViewOwnSummaries: false,
    canViewOtherStudents: false,
    canViewRawData: false,
    canViewAuditLogs: false,
  },
  PARENT: {
    canViewApprovedSummariesOnly: true,
    canViewRawData: false,
    canViewTrends: false,
    canViewComparisons: false,
    canViewAuditLogs: false,
  },
  ADMIN: {
    canViewUsageMetrics: true,
    canViewContent: false,
    canViewAuditLogs: true,
  },
} as const;

// ============================================
// FEATURE FLAGS - AI Feature Governance
// ============================================

export const AI_FEATURE_FLAGS = {
  TEACHING_SUGGESTIONS: true,
  LEARNING_PROFILES: true,
  PARENT_INSIGHTS: true,
  ADAPTIVE_SUPPORT_PLANS: true,
  PRACTICE_GENERATION: true,
  LESSON_DIFFERENTIATION: true,
} as const;

// ============================================
// NON-NEGOTIABLE RULES (Documentation)
// ============================================

export const SYSTEM_PRINCIPLES = {
  /** AI assists humans, never replaces judgment */
  HUMAN_IN_LOOP: true,
  /** No automated decisions about students */
  NO_AUTO_DECISIONS: true,
  /** All AI outputs are advisory, optional, reviewable, reversible */
  ADVISORY_ONLY: true,
  /** No hidden scoring or inference */
  NO_HIDDEN_METRICS: true,
  /** No behavioral enforcement */
  NO_ENFORCEMENT: true,
  /** No cross-feature escalation */
  NO_CHAINING: true,
} as const;

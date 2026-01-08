/**
 * Parent Permission System
 * 
 * Permission Tiers:
 * 1. view_only - Can view teacher-approved content only
 * 2. view_notifications - View + receive notifications
 * 3. full_access - Future: fees, reports, timetables, meetings
 * 
 * CRITICAL VISIBILITY RULES:
 * - Parents NEVER see internal analytics
 * - Parents NEVER see raw scores or rankings
 * - Parents ONLY see teacher-approved content
 * - Parents only see THEIR linked child(ren)
 */

export type ParentPermissionTier = 'view_only' | 'view_notifications' | 'full_access';

export type ParentFeature = 
  | 'attendance'
  | 'learning_updates'
  | 'approved_insights'
  | 'notifications'
  | 'fees'
  | 'reports'
  | 'timetables'
  | 'meetings';

// Features parents can NEVER access - enforced at all levels
export type ForbiddenFeature = 
  | 'analytics'
  | 'raw_scores'
  | 'rankings'
  | 'internal_notes'
  | 'unapproved_content'
  | 'other_students';

export interface ParentPermission {
  guardianId: string;
  studentId: string;
  tier: ParentPermissionTier;
  features: {
    canViewAttendance: boolean;
    canViewLearningUpdates: boolean;
    canViewApprovedInsights: boolean;
    canReceiveNotifications: boolean;
    canViewFees: boolean;
    canViewReports: boolean;
    canViewTimetables: boolean;
    canRequestMeetings: boolean;
  };
}

/**
 * Permission Matrix
 * Defines what each tier can and cannot access
 */
export const PERMISSION_MATRIX: Record<ParentPermissionTier, {
  description: string;
  allowed: ParentFeature[];
  futureFeatures: ParentFeature[];
}> = {
  view_only: {
    description: 'Can view teacher-approved content for linked children',
    allowed: ['attendance', 'learning_updates', 'approved_insights'],
    futureFeatures: [],
  },
  view_notifications: {
    description: 'Can view content and receive notifications',
    allowed: ['attendance', 'learning_updates', 'approved_insights', 'notifications'],
    futureFeatures: [],
  },
  full_access: {
    description: 'Full parent portal access (future)',
    allowed: ['attendance', 'learning_updates', 'approved_insights', 'notifications'],
    futureFeatures: ['fees', 'reports', 'timetables', 'meetings'],
  },
};

/**
 * Features parents can NEVER see - regardless of tier
 * These are enforced in code at multiple levels
 */
export const FORBIDDEN_FEATURES: Record<ForbiddenFeature, string> = {
  analytics: 'Internal learning analytics and diagnostics',
  raw_scores: 'Raw test scores, percentages, or numeric grades',
  rankings: 'Class rankings, comparisons, or percentiles',
  internal_notes: 'Teacher internal notes and observations',
  unapproved_content: 'Content not yet approved by teacher',
  other_students: 'Any data about students not linked to this parent',
};

/**
 * Default permissions for new parent-student links
 */
export const DEFAULT_PERMISSION: Omit<ParentPermission, 'guardianId' | 'studentId'> = {
  tier: 'view_only',
  features: {
    canViewAttendance: true,
    canViewLearningUpdates: true,
    canViewApprovedInsights: true,
    canReceiveNotifications: false,
    canViewFees: false,
    canViewReports: false,
    canViewTimetables: false,
    canRequestMeetings: false,
  },
};

/**
 * Check if a feature is allowed for a given tier
 */
export function isFeatureAllowed(tier: ParentPermissionTier, feature: ParentFeature): boolean {
  const matrix = PERMISSION_MATRIX[tier];
  return matrix.allowed.includes(feature) || matrix.futureFeatures.includes(feature);
}

/**
 * Check if a feature is forbidden for all parents
 */
export function isFeatureForbidden(feature: string): boolean {
  return feature in FORBIDDEN_FEATURES;
}

/**
 * Get permissions object for a tier
 */
export function getPermissionsForTier(tier: ParentPermissionTier): ParentPermission['features'] {
  switch (tier) {
    case 'view_only':
      return {
        canViewAttendance: true,
        canViewLearningUpdates: true,
        canViewApprovedInsights: true,
        canReceiveNotifications: false,
        canViewFees: false,
        canViewReports: false,
        canViewTimetables: false,
        canRequestMeetings: false,
      };
    case 'view_notifications':
      return {
        canViewAttendance: true,
        canViewLearningUpdates: true,
        canViewApprovedInsights: true,
        canReceiveNotifications: true,
        canViewFees: false,
        canViewReports: false,
        canViewTimetables: false,
        canRequestMeetings: false,
      };
    case 'full_access':
      return {
        canViewAttendance: true,
        canViewLearningUpdates: true,
        canViewApprovedInsights: true,
        canReceiveNotifications: true,
        canViewFees: true,
        canViewReports: true,
        canViewTimetables: true,
        canRequestMeetings: true,
      };
  }
}

/**
 * Enforcement rules for parent data access
 * Used by components and hooks to filter visible data
 */
export const ENFORCEMENT_RULES = {
  // Data that must be filtered before showing to parents
  filterRules: {
    insights: {
      mustBeApproved: true,
      excludeFields: ['raw_analysis', 'scores', 'rankings', 'internal_notes'],
      requireTeacherReview: true,
    },
    attendance: {
      showOwnChildOnly: true,
      excludeClassSummary: true,
    },
    learningUpdates: {
      mustBeApproved: true,
      excludeFields: ['diagnostic_details', 'comparison_data'],
      showPositiveFraming: true,
    },
  },
  
  // Content approval requirements
  approvalRequirements: {
    parentInsights: 'teacher_approved',
    learningPaths: 'teacher_approved',
    termReports: 'admin_approved',
  },
  
  // UI display rules
  displayRules: {
    neverShowScores: true,
    neverShowRankings: true,
    neverShowComparisons: true,
    useNeutralLanguage: true,
    focusOnGrowth: true,
  },
};

/**
 * Validate that content is safe to show to parents
 */
export function validateParentVisibleContent(content: Record<string, unknown>): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check for forbidden fields
  const forbiddenPatterns = [
    /score/i,
    /ranking/i,
    /percentile/i,
    /comparison/i,
    /internal/i,
    /raw_/i,
    /diagnostic/i,
  ];
  
  function checkObject(obj: Record<string, unknown>, path: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check key name
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(key)) {
          violations.push(`Forbidden field: ${currentPath}`);
        }
      }
      
      // Check nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        checkObject(value as Record<string, unknown>, currentPath);
      }
    }
  }
  
  checkObject(content);
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Filter content to remove forbidden fields before showing to parents
 */
export function filterForParentView<T extends Record<string, unknown>>(content: T): Partial<T> {
  const forbiddenKeys = [
    'score', 'scores', 'ranking', 'rankings', 'percentile',
    'comparison', 'internal_notes', 'raw_analysis', 'diagnostic_details',
    'raw_scores', 'comparison_data', 'class_average', 'class_rank',
  ];
  
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(content)) {
    const lowerKey = key.toLowerCase();
    if (!forbiddenKeys.some(forbidden => lowerKey.includes(forbidden))) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        filtered[key as keyof T] = filterForParentView(value as Record<string, unknown>) as T[keyof T];
      } else {
        filtered[key as keyof T] = value as T[keyof T];
      }
    }
  }
  
  return filtered;
}

/**
 * UI labels for permission tiers
 */
export const TIER_LABELS: Record<ParentPermissionTier, {
  label: string;
  description: string;
  badge: string;
}> = {
  view_only: {
    label: 'View Only',
    description: 'Can view approved updates about their child',
    badge: 'Basic',
  },
  view_notifications: {
    label: 'View + Notifications',
    description: 'Can view updates and receive notifications',
    badge: 'Standard',
  },
  full_access: {
    label: 'Full Access',
    description: 'Complete parent portal access',
    badge: 'Complete',
  },
};

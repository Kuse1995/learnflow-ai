/**
 * Parent Dashboard Visibility Rules
 * 
 * This file defines exactly what parents can and cannot see.
 * These rules are enforced across all parent-facing components.
 */

/**
 * VISIBILITY CHECKLIST
 * ✅ = Allowed (if approved)
 * ❌ = Explicitly excluded (never shown)
 */
export const PARENT_VISIBILITY = {
  // ✅ ALLOWED SECTIONS
  allowed: {
    learningUpdates: {
      enabled: true,
      requiresApproval: true,
      description: 'Teacher-approved learning updates',
      fields: ['summary_text', 'home_support_tips', 'approved_at'],
    },
    attendanceSummaries: {
      enabled: true,
      requiresApproval: false,
      description: 'Simple attendance status (present/absent today)',
      fields: ['date', 'present'],
    },
    schoolAnnouncements: {
      enabled: true,
      requiresApproval: false,
      description: 'School-wide announcements',
      fields: ['title', 'body', 'created_at'],
    },
    supportTips: {
      enabled: true,
      requiresApproval: true,
      description: 'Home support suggestions from teacher',
      fields: ['tip_text'],
    },
  },

  // ❌ EXPLICITLY EXCLUDED - NEVER SHOW TO PARENTS
  excluded: {
    grades: {
      reason: 'Raw scores and grades are internal only',
      alternatives: 'Use qualitative learning updates instead',
    },
    rankings: {
      reason: 'Class rankings and comparisons are harmful',
      alternatives: 'Focus on individual growth',
    },
    teacherNotes: {
      reason: 'Internal observations are for teachers only',
      alternatives: 'Share approved summaries instead',
    },
    adaptiveSupportPlans: {
      reason: 'Intervention plans are teacher tools',
      alternatives: 'Share relevant home support tips',
    },
    analytics: {
      reason: 'Learning analytics are diagnostic tools',
      alternatives: 'Teacher interprets and shares insights',
    },
    rawScores: {
      reason: 'Numeric scores lack context',
      alternatives: 'Qualitative progress descriptions',
    },
    comparisons: {
      reason: 'Comparing students is harmful',
      alternatives: 'Individual growth focus',
    },
    internalDiagnostics: {
      reason: 'AI analysis details are internal',
      alternatives: 'Teacher-curated summaries',
    },
  },
} as const;

/**
 * UI SECTIONS for Parent Dashboard
 * Ordered by priority (most important first)
 */
export const PARENT_DASHBOARD_SECTIONS = [
  {
    id: 'learning-updates',
    title: 'Learning Updates',
    description: 'Recent updates from your child\'s teacher',
    icon: 'BookOpen',
    priority: 1,
    emptyMessage: 'No updates yet. Your child\'s teacher will share updates here.',
    requiresPermission: 'approved_insights',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Recent attendance',
    icon: 'Calendar',
    priority: 2,
    emptyMessage: 'Attendance information will appear here.',
    requiresPermission: 'attendance',
    optional: true,
  },
  {
    id: 'announcements',
    title: 'School News',
    description: 'Announcements from the school',
    icon: 'Bell',
    priority: 3,
    emptyMessage: 'No announcements at this time.',
    requiresPermission: null,
  },
  {
    id: 'support-tips',
    title: 'How to Help at Home',
    description: 'Suggestions for supporting learning at home',
    icon: 'Home',
    priority: 4,
    emptyMessage: 'Tips for home support will appear here when available.',
    requiresPermission: 'approved_insights',
  },
] as const;

/**
 * UI Design Rules for Parent Views
 */
export const PARENT_UI_RULES = {
  // Minimal UI - no visual clutter
  design: {
    maxWidth: '2xl', // max-w-2xl (672px)
    textFirst: true,
    noCharts: true,
    noNumbers: true,
    noBadges: false, // Simple status badges OK
    noProgress: true, // No progress bars
    noPercentages: true,
  },

  // Mobile-friendly
  mobile: {
    touchFriendly: true,
    largeText: true,
    generousSpacing: true,
    bottomNavigation: true,
    pullToRefresh: true,
  },

  // Offline tolerant
  offline: {
    cacheLastUpdate: true,
    showLastUpdatedTime: true,
    gracefulDegradation: true,
    noSpinnersOnCached: true,
  },

  // Typography
  typography: {
    headingSize: 'text-xl',
    bodySize: 'text-base',
    mutedForMeta: true,
  },
} as const;

/**
 * Fields that must be stripped from any data before showing to parents
 */
export const FORBIDDEN_FIELDS = [
  'score',
  'scores',
  'grade',
  'grades',
  'rank',
  'ranking',
  'rankings',
  'percentile',
  'comparison',
  'average',
  'class_average',
  'internal_notes',
  'teacher_notes',
  'diagnostic',
  'raw_analysis',
  'intervention',
  'adaptive_support_plan',
  'learning_path',
  'error_patterns',
  'misconceptions',
] as const;

/**
 * Check if a field should be visible to parents
 */
export function isFieldAllowedForParent(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return !FORBIDDEN_FIELDS.some(forbidden => 
    lowerField.includes(forbidden.toLowerCase())
  );
}

/**
 * Filter an object to only include parent-safe fields
 */
export function filterForParent<T extends Record<string, unknown>>(data: T): Partial<T> {
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (isFieldAllowedForParent(key)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        filtered[key as keyof T] = filterForParent(value as Record<string, unknown>) as T[keyof T];
      } else {
        filtered[key as keyof T] = value as T[keyof T];
      }
    }
  }
  
  return filtered;
}

/**
 * Format a date for parent-friendly display
 */
export function formatParentDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return d.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
}

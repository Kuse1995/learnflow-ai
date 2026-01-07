/**
 * Performance Configuration & Budgets
 * Hard limits for performance monitoring
 */

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  PAGE_LOAD_SLOW_3G_MS: 3000, // 3s max on slow 3G
  INITIAL_BUNDLE_SIZE_KB: 2048, // 2MB max for initial dashboard
  LIST_ITEM_RENDER_MS: 16, // Target 60fps
  API_TIMEOUT_MS: 10000, // 10s max for API calls
  BACKGROUND_JOB_TIMEOUT_MS: 60000, // 1min for background jobs
} as const;

// Pagination defaults
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  STUDENTS_PER_PAGE: 25,
  LOGS_PER_PAGE: 50,
  UPLOADS_PER_PAGE: 20,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  STALE_TIME_MS: 30000, // 30s before data is considered stale
  CACHE_TIME_MS: 300000, // 5min cache retention
  REFETCH_INTERVAL_MS: 60000, // 1min auto-refetch for live data
} as const;

// Usage warning thresholds
export const USAGE_THRESHOLDS = {
  WARNING_70: 70,
  WARNING_90: 90,
  HARD_LIMIT: 100,
} as const;

// Background job types
export type BackgroundJobType = 
  | "upload_analysis"
  | "report_generation"
  | "insight_creation"
  | "support_plan_generation"
  | "learning_path_generation"
  | "backup_creation";

// Job status
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  status: JobStatus;
  progress: number;
  message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

// Friendly messages for different states
export const PERFORMANCE_MESSAGES = {
  slowConnection: "Working with limited connectivity...",
  processingLarge: "This may take a moment...",
  backgroundJob: "Processing in the background",
  retrying: "Retrying automatically...",
  quotaWarning70: "You've used 70% of this month's allowance",
  quotaWarning90: "You're approaching your monthly limit",
  quotaExceeded: "Monthly limit reached. Upgrade for more.",
  syncPending: "Changes waiting to sync",
  syncComplete: "All changes saved",
  syncFailed: "Some changes couldn't be saved",
} as const;

/**
 * Get warning level based on usage percentage
 */
export function getUsageWarningLevel(percentage: number): "none" | "warning" | "critical" | "exceeded" {
  if (percentage >= USAGE_THRESHOLDS.HARD_LIMIT) return "exceeded";
  if (percentage >= USAGE_THRESHOLDS.WARNING_90) return "critical";
  if (percentage >= USAGE_THRESHOLDS.WARNING_70) return "warning";
  return "none";
}

/**
 * Get user-friendly message for usage level
 */
export function getUsageMessage(percentage: number): string | null {
  const level = getUsageWarningLevel(percentage);
  switch (level) {
    case "warning":
      return PERFORMANCE_MESSAGES.quotaWarning70;
    case "critical":
      return PERFORMANCE_MESSAGES.quotaWarning90;
    case "exceeded":
      return PERFORMANCE_MESSAGES.quotaExceeded;
    default:
      return null;
  }
}

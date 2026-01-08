/**
 * PARENT MESSAGING SAFEGUARDS
 * 
 * Comprehensive safety rules for parent communication.
 * Includes rate limiting, abuse prevention, and compliance safeguards.
 */

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

export const RATE_LIMITS = {
  /** Maximum messages per teacher per day */
  TEACHER_DAILY_LIMIT: 20,
  /** Maximum messages per teacher per week */
  TEACHER_WEEKLY_LIMIT: 50,
  /** Maximum messages per student per day */
  STUDENT_DAILY_LIMIT: 3,
  /** Maximum messages per parent per day across all children */
  PARENT_DAILY_LIMIT: 5,
  /** Cooldown between messages to same parent (minutes) */
  SAME_PARENT_COOLDOWN_MINUTES: 60,
  /** Maximum bulk messages at once */
  MAX_BULK_RECIPIENTS: 30,
  /** Admin can override with multiplier */
  ADMIN_OVERRIDE_MULTIPLIER: 3,
} as const;

// ============================================================================
// ABUSE PREVENTION RULES
// ============================================================================

export const ABUSE_PREVENTION = {
  /** Minimum time between any two messages from same sender (seconds) */
  MIN_SEND_INTERVAL_SECONDS: 30,
  /** Maximum message body length */
  MAX_MESSAGE_LENGTH: 2000,
  /** Maximum subject length */
  MAX_SUBJECT_LENGTH: 100,
  /** Rapid fire threshold - messages in short window triggers review */
  RAPID_FIRE_COUNT: 5,
  RAPID_FIRE_WINDOW_MINUTES: 10,
  /** Repeated content threshold */
  DUPLICATE_CONTENT_WINDOW_HOURS: 24,
  /** Auto-flag for admin review after X rejections */
  REJECTION_THRESHOLD_FOR_REVIEW: 3,
} as const;

// ============================================================================
// COMPLIANCE REQUIREMENTS
// ============================================================================

export const COMPLIANCE_RULES = {
  /** All AI messages require teacher approval before send */
  AI_REQUIRES_APPROVAL: true,
  /** Fee-related messages always require admin approval */
  FEE_MESSAGES_REQUIRE_ADMIN: true,
  /** Messages must include sender identification */
  REQUIRE_SENDER_ID: true,
  /** Retain message history for audit (days) */
  AUDIT_RETENTION_DAYS: 2555, // ~7 years
  /** Log all message state changes */
  LOG_ALL_STATE_CHANGES: true,
  /** Maximum time message can be recalled (minutes) */
  RECALL_WINDOW_MINUTES: 5,
} as const;

// ============================================================================
// RECALLABLE STATUSES - Messages can ONLY be recalled in these states
// ============================================================================

export const RECALLABLE_STATUSES = [
  'draft',
  'pending',
  'queued',
] as const;

export type RecallableStatus = typeof RECALLABLE_STATUSES[number];

// ============================================================================
// RATE LIMIT CHECK RESULT
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  resetAt?: Date;
  requiresAdminOverride?: boolean;
}

export interface AbuseCheckResult {
  flagged: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  reasons: string[];
  requiresReview: boolean;
  autoBlocked: boolean;
}

export interface RecallResult {
  success: boolean;
  error?: string;
  recalledAt?: Date;
  previousStatus?: string;
}

// ============================================================================
// RATE LIMIT CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if teacher has exceeded daily message limit
 */
export function checkTeacherDailyLimit(
  sentToday: number,
  hasAdminOverride: boolean = false
): RateLimitResult {
  const limit = hasAdminOverride 
    ? RATE_LIMITS.TEACHER_DAILY_LIMIT * RATE_LIMITS.ADMIN_OVERRIDE_MULTIPLIER
    : RATE_LIMITS.TEACHER_DAILY_LIMIT;

  if (sentToday >= limit) {
    return {
      allowed: false,
      reason: `Daily message limit reached (${limit} messages)`,
      currentUsage: sentToday,
      limit,
      resetAt: getEndOfDay(),
      requiresAdminOverride: !hasAdminOverride,
    };
  }

  return { allowed: true, currentUsage: sentToday, limit };
}

/**
 * Check if teacher has exceeded weekly message limit
 */
export function checkTeacherWeeklyLimit(
  sentThisWeek: number,
  hasAdminOverride: boolean = false
): RateLimitResult {
  const limit = hasAdminOverride
    ? RATE_LIMITS.TEACHER_WEEKLY_LIMIT * RATE_LIMITS.ADMIN_OVERRIDE_MULTIPLIER
    : RATE_LIMITS.TEACHER_WEEKLY_LIMIT;

  if (sentThisWeek >= limit) {
    return {
      allowed: false,
      reason: `Weekly message limit reached (${limit} messages)`,
      currentUsage: sentThisWeek,
      limit,
      resetAt: getEndOfWeek(),
      requiresAdminOverride: !hasAdminOverride,
    };
  }

  return { allowed: true, currentUsage: sentThisWeek, limit };
}

/**
 * Check if student has received too many messages today
 */
export function checkStudentDailyLimit(
  receivedToday: number
): RateLimitResult {
  if (receivedToday >= RATE_LIMITS.STUDENT_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `Student has received maximum messages for today`,
      currentUsage: receivedToday,
      limit: RATE_LIMITS.STUDENT_DAILY_LIMIT,
      resetAt: getEndOfDay(),
    };
  }

  return { allowed: true, currentUsage: receivedToday, limit: RATE_LIMITS.STUDENT_DAILY_LIMIT };
}

/**
 * Check cooldown between messages to same parent
 */
export function checkParentCooldown(
  lastMessageAt: Date | null
): RateLimitResult {
  if (!lastMessageAt) {
    return { allowed: true };
  }

  const cooldownMs = RATE_LIMITS.SAME_PARENT_COOLDOWN_MINUTES * 60 * 1000;
  const elapsed = Date.now() - lastMessageAt.getTime();

  if (elapsed < cooldownMs) {
    const remainingMs = cooldownMs - elapsed;
    return {
      allowed: false,
      reason: `Please wait before sending another message to this parent`,
      resetAt: new Date(Date.now() + remainingMs),
    };
  }

  return { allowed: true };
}

/**
 * Check minimum interval between any messages from sender
 */
export function checkMinSendInterval(
  lastSentAt: Date | null
): RateLimitResult {
  if (!lastSentAt) {
    return { allowed: true };
  }

  const minIntervalMs = ABUSE_PREVENTION.MIN_SEND_INTERVAL_SECONDS * 1000;
  const elapsed = Date.now() - lastSentAt.getTime();

  if (elapsed < minIntervalMs) {
    return {
      allowed: false,
      reason: `Please wait a moment before sending another message`,
      resetAt: new Date(lastSentAt.getTime() + minIntervalMs),
    };
  }

  return { allowed: true };
}

// ============================================================================
// ABUSE DETECTION FUNCTIONS
// ============================================================================

/**
 * Check message content for abuse indicators
 */
export function checkMessageContent(
  subject: string,
  body: string
): AbuseCheckResult {
  const reasons: string[] = [];
  let severity: AbuseCheckResult['severity'] = 'none';

  // Length checks
  if (body.length > ABUSE_PREVENTION.MAX_MESSAGE_LENGTH) {
    reasons.push('Message exceeds maximum length');
    severity = 'low';
  }

  if (subject.length > ABUSE_PREVENTION.MAX_SUBJECT_LENGTH) {
    reasons.push('Subject exceeds maximum length');
    severity = 'low';
  }

  // Empty content check
  if (!body.trim() || !subject.trim()) {
    reasons.push('Message or subject is empty');
    severity = 'medium';
  }

  // Repetitive character check (spam indicator)
  const repetitivePattern = /(.)\1{10,}/;
  if (repetitivePattern.test(body) || repetitivePattern.test(subject)) {
    reasons.push('Detected repetitive characters (potential spam)');
    severity = 'medium';
  }

  // All caps check (>50% uppercase)
  const uppercaseRatio = (body.match(/[A-Z]/g) || []).length / body.length;
  if (body.length > 20 && uppercaseRatio > 0.5) {
    reasons.push('Message appears to be in all caps');
    severity = 'low';
  }

  const severityValue = severity;
  return {
    flagged: reasons.length > 0,
    severity: severityValue,
    reasons,
    requiresReview: severityValue === 'medium',
    autoBlocked: false, // Content checks never auto-block, only flag for review
  };
}

/**
 * Check for rapid fire messaging pattern
 */
export function checkRapidFirePattern(
  recentMessageCount: number,
  windowMinutes: number = ABUSE_PREVENTION.RAPID_FIRE_WINDOW_MINUTES
): AbuseCheckResult {
  if (recentMessageCount >= ABUSE_PREVENTION.RAPID_FIRE_COUNT) {
    return {
      flagged: true,
      severity: 'medium',
      reasons: [`Sent ${recentMessageCount} messages in ${windowMinutes} minutes`],
      requiresReview: true,
      autoBlocked: false,
    };
  }

  return {
    flagged: false,
    severity: 'none',
    reasons: [],
    requiresReview: false,
    autoBlocked: false,
  };
}

/**
 * Check for duplicate content
 */
export function checkDuplicateContent(
  newContentHash: string,
  recentHashes: string[]
): AbuseCheckResult {
  const isDuplicate = recentHashes.includes(newContentHash);

  if (isDuplicate) {
    return {
      flagged: true,
      severity: 'low',
      reasons: ['Similar message was sent recently'],
      requiresReview: false,
      autoBlocked: false,
    };
  }

  return {
    flagged: false,
    severity: 'none',
    reasons: [],
    requiresReview: false,
    autoBlocked: false,
  };
}

/**
 * Check rejection history for potential abuse
 */
export function checkRejectionHistory(
  recentRejections: number
): AbuseCheckResult {
  if (recentRejections >= ABUSE_PREVENTION.REJECTION_THRESHOLD_FOR_REVIEW) {
    return {
      flagged: true,
      severity: 'medium' as const,
      reasons: [`${recentRejections} recent message rejections`],
      requiresReview: true,
      autoBlocked: recentRejections >= ABUSE_PREVENTION.REJECTION_THRESHOLD_FOR_REVIEW * 2,
    };
  }

  return {
    flagged: false,
    severity: 'none',
    reasons: [],
    requiresReview: false,
    autoBlocked: false,
  };
}

// ============================================================================
// MESSAGE RECALL FUNCTIONS
// ============================================================================

/**
 * Check if a message can be recalled
 */
export function canRecallMessage(
  status: string,
  createdAt: Date,
  isLocked: boolean
): { canRecall: boolean; reason?: string } {
  // Locked messages cannot be recalled
  if (isLocked) {
    return { canRecall: false, reason: 'Message is locked and cannot be recalled' };
  }

  // Check if status allows recall
  if (!RECALLABLE_STATUSES.includes(status as RecallableStatus)) {
    return { 
      canRecall: false, 
      reason: `Message in "${status}" status cannot be recalled` 
    };
  }

  // Check recall window
  const recallWindowMs = COMPLIANCE_RULES.RECALL_WINDOW_MINUTES * 60 * 1000;
  const elapsed = Date.now() - createdAt.getTime();

  // For queued messages, check if within recall window
  if (status === 'queued' && elapsed > recallWindowMs) {
    return { 
      canRecall: false, 
      reason: 'Recall window has expired' 
    };
  }

  return { canRecall: true };
}

/**
 * Get remaining recall time in seconds
 */
export function getRecallTimeRemaining(createdAt: Date): number {
  const recallWindowMs = COMPLIANCE_RULES.RECALL_WINDOW_MINUTES * 60 * 1000;
  const elapsed = Date.now() - createdAt.getTime();
  const remaining = recallWindowMs - elapsed;
  return Math.max(0, Math.floor(remaining / 1000));
}

// ============================================================================
// COMPLIANCE CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if message requires admin approval
 */
export function requiresAdminApproval(
  category: string,
  isAiGenerated: boolean
): boolean {
  // Fee messages always require admin
  if (category === 'fee_status' && COMPLIANCE_RULES.FEE_MESSAGES_REQUIRE_ADMIN) {
    return true;
  }

  return false;
}

/**
 * Check if message requires teacher approval
 */
export function requiresTeacherApproval(isAiGenerated: boolean): boolean {
  return isAiGenerated && COMPLIANCE_RULES.AI_REQUIRES_APPROVAL;
}

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

export const AUDIT_EVENTS = {
  MESSAGE_CREATED: 'message_created',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_SUBMITTED: 'message_submitted',
  MESSAGE_APPROVED: 'message_approved',
  MESSAGE_REJECTED: 'message_rejected',
  MESSAGE_QUEUED: 'message_queued',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_FAILED: 'message_failed',
  MESSAGE_RECALLED: 'message_recalled',
  MESSAGE_LOCKED: 'message_locked',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  ABUSE_FLAGGED: 'abuse_flagged',
  ADMIN_OVERRIDE: 'admin_override',
} as const;

export type AuditEventType = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getEndOfDay(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

function getEndOfWeek(): Date {
  const end = new Date();
  const daysUntilSunday = 7 - end.getDay();
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Generate a simple hash for content comparison
 */
export function hashContent(content: string): string {
  let hash = 0;
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `msg_${Math.abs(hash).toString(16)}`;
}

/**
 * Combine multiple rate limit checks
 */
export function combineRateLimitChecks(
  ...checks: RateLimitResult[]
): RateLimitResult {
  for (const check of checks) {
    if (!check.allowed) {
      return check;
    }
  }
  return { allowed: true };
}

/**
 * Combine multiple abuse checks
 */
export function combineAbuseChecks(
  ...checks: AbuseCheckResult[]
): AbuseCheckResult {
  const allReasons: string[] = [];
  let maxSeverity: AbuseCheckResult['severity'] = 'none';
  let requiresReview = false;
  let autoBlocked = false;

  const severityOrder = ['none', 'low', 'medium', 'high'] as const;

  for (const check of checks) {
    allReasons.push(...check.reasons);
    
    if (severityOrder.indexOf(check.severity) > severityOrder.indexOf(maxSeverity)) {
      maxSeverity = check.severity;
    }
    
    if (check.requiresReview) requiresReview = true;
    if (check.autoBlocked) autoBlocked = true;
  }

  return {
    flagged: allReasons.length > 0,
    severity: maxSeverity,
    reasons: allReasons,
    requiresReview,
    autoBlocked,
  };
}

/**
 * Consent Fallback System
 * 
 * Handles missing or unclear consent states with safe defaults.
 * Non-emergency messages are NEVER auto-sent without clear consent.
 * All overrides are logged for audit compliance.
 */

import { logAuditEvent } from './audit-logger';
import type { ConsentStatus, ConsentCategory, ConsentDecision } from './parent-consent-system';

// =============================================================================
// TYPES
// =============================================================================

export type ConsentClarity = 'clear' | 'unclear' | 'missing' | 'expired' | 'conflicting';

export type FallbackAction = 
  | 'allow'           // Consent is clear, proceed
  | 'block'           // No consent, block sending
  | 'flag_for_review' // Unclear, needs manual review
  | 'require_override'; // Blocked but override possible

export type OverrideReason =
  | 'verbal_confirmation'      // Teacher got verbal OK
  | 'paper_consent_pending'    // Paper form submitted, processing
  | 'admin_discretion'         // Admin judgment call
  | 'time_sensitive'           // Urgent non-emergency
  | 'parent_requested'         // Parent asked to receive
  | 'correction_to_prior';     // Fixing previous error

export interface ConsentFallbackResult {
  action: FallbackAction;
  clarity: ConsentClarity;
  reason: string;
  canOverride: boolean;
  overrideRequiresRole: 'teacher' | 'admin' | null;
  followUpRequired: boolean;
  followUpType?: 'collect_consent' | 'verify_consent' | 'resolve_conflict';
  expiresAt?: Date;
}

export interface OverrideRequest {
  messageId: string;
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  overrideReason: OverrideReason;
  additionalNotes?: string;
  overriddenBy: string;
  overriddenByRole: 'teacher' | 'admin';
  witnessName?: string;
  expiresAfterSend: boolean;
}

export interface OverrideLogEntry {
  id: string;
  timestamp: Date;
  request: OverrideRequest;
  originalConsentStatus: ConsentStatus;
  originalClarity: ConsentClarity;
  auditLogId: string;
  wasSuccessful: boolean;
}

// =============================================================================
// FALLBACK RULES
// =============================================================================

const CATEGORY_FALLBACK_RULES: Record<ConsentCategory, {
  missingAction: FallbackAction;
  unclearAction: FallbackAction;
  expiredAction: FallbackAction;
  conflictingAction: FallbackAction;
  canTeacherOverride: boolean;
  canAdminOverride: boolean;
  autoFlagForFollowUp: boolean;
}> = {
  emergency_alerts: {
    // Emergency ALWAYS sends - no consent needed
    missingAction: 'allow',
    unclearAction: 'allow',
    expiredAction: 'allow',
    conflictingAction: 'allow',
    canTeacherOverride: false, // No override needed
    canAdminOverride: false,
    autoFlagForFollowUp: false,
  },
  attendance_notifications: {
    missingAction: 'block',
    unclearAction: 'flag_for_review',
    expiredAction: 'flag_for_review',
    conflictingAction: 'require_override',
    canTeacherOverride: true,
    canAdminOverride: true,
    autoFlagForFollowUp: true,
  },
  academic_updates: {
    missingAction: 'block',
    unclearAction: 'flag_for_review',
    expiredAction: 'flag_for_review',
    conflictingAction: 'require_override',
    canTeacherOverride: true,
    canAdminOverride: true,
    autoFlagForFollowUp: true,
  },
  fee_communications: {
    // More restrictive - admin oversight
    missingAction: 'block',
    unclearAction: 'require_override',
    expiredAction: 'require_override',
    conflictingAction: 'require_override',
    canTeacherOverride: false, // Teachers can't override fee messages
    canAdminOverride: true,
    autoFlagForFollowUp: true,
  },
  school_announcements: {
    missingAction: 'block',
    unclearAction: 'flag_for_review',
    expiredAction: 'flag_for_review',
    conflictingAction: 'flag_for_review',
    canTeacherOverride: true,
    canAdminOverride: true,
    autoFlagForFollowUp: true,
  },
  event_invitations: {
    missingAction: 'block',
    unclearAction: 'flag_for_review',
    expiredAction: 'allow', // Expired consent OK for non-sensitive invites
    conflictingAction: 'flag_for_review',
    canTeacherOverride: true,
    canAdminOverride: true,
    autoFlagForFollowUp: false,
  },
};

// =============================================================================
// CORE FALLBACK LOGIC
// =============================================================================

/**
 * Determine consent clarity from available data
 */
export function assessConsentClarity(
  status: ConsentStatus | null,
  expiresAt?: Date | null,
  hasConflictingRecords?: boolean
): ConsentClarity {
  if (status === null || status === undefined) {
    return 'missing';
  }

  if (hasConflictingRecords) {
    return 'conflicting';
  }

  if (expiresAt && new Date() > expiresAt) {
    return 'expired';
  }

  if (status === 'pending' || status === 'not_requested') {
    return 'unclear';
  }

  return 'clear';
}

/**
 * Evaluate fallback action for a consent state
 */
export function evaluateConsentFallback(
  category: ConsentCategory,
  status: ConsentStatus | null,
  expiresAt?: Date | null,
  hasConflictingRecords?: boolean
): ConsentFallbackResult {
  const clarity = assessConsentClarity(status, expiresAt, hasConflictingRecords);
  const rules = CATEGORY_FALLBACK_RULES[category];

  // Clear consent granted - allow
  if (clarity === 'clear' && status === 'granted') {
    return {
      action: 'allow',
      clarity,
      reason: 'Consent is granted and valid',
      canOverride: false,
      overrideRequiresRole: null,
      followUpRequired: false,
    };
  }

  // Clear consent withdrawn - block, no override
  if (clarity === 'clear' && status === 'withdrawn') {
    return {
      action: 'block',
      clarity,
      reason: 'Parent has explicitly withdrawn consent',
      canOverride: false, // Cannot override explicit withdrawal
      overrideRequiresRole: null,
      followUpRequired: false,
    };
  }

  // Get action based on clarity
  let action: FallbackAction;
  let followUpType: ConsentFallbackResult['followUpType'] | undefined;

  switch (clarity) {
    case 'missing':
      action = rules.missingAction;
      followUpType = 'collect_consent';
      break;
    case 'unclear':
      action = rules.unclearAction;
      followUpType = 'verify_consent';
      break;
    case 'expired':
      action = rules.expiredAction;
      followUpType = 'collect_consent';
      break;
    case 'conflicting':
      action = rules.conflictingAction;
      followUpType = 'resolve_conflict';
      break;
    default:
      action = 'block';
  }

  // Determine override capability
  const canOverride = rules.canTeacherOverride || rules.canAdminOverride;
  const overrideRequiresRole = rules.canTeacherOverride ? 'teacher' : 
                               rules.canAdminOverride ? 'admin' : null;

  return {
    action,
    clarity,
    reason: getFallbackReasonMessage(clarity, category),
    canOverride: action !== 'allow' && canOverride,
    overrideRequiresRole,
    followUpRequired: rules.autoFlagForFollowUp && action !== 'allow',
    followUpType,
    expiresAt: expiresAt ?? undefined,
  };
}

function getFallbackReasonMessage(clarity: ConsentClarity, category: ConsentCategory): string {
  const categoryLabel = getCategoryLabel(category);
  
  switch (clarity) {
    case 'missing':
      return `No consent record found for ${categoryLabel}. Message blocked until consent is collected.`;
    case 'unclear':
      return `Consent status for ${categoryLabel} is pending or unclear. Flagged for review.`;
    case 'expired':
      return `Consent for ${categoryLabel} has expired. Renewal required.`;
    case 'conflicting':
      return `Conflicting consent records for ${categoryLabel}. Manual resolution required.`;
    default:
      return `Consent status unclear for ${categoryLabel}.`;
  }
}

function getCategoryLabel(category: ConsentCategory): string {
  const labels: Record<ConsentCategory, string> = {
    attendance_notifications: 'Attendance Notifications',
    academic_updates: 'Academic Updates',
    emergency_alerts: 'Emergency Alerts',
    fee_communications: 'Fee Communications',
    school_announcements: 'School Announcements',
    event_invitations: 'Event Invitations',
  };
  return labels[category];
}

// =============================================================================
// OVERRIDE HANDLING
// =============================================================================

/**
 * Process an override request with full audit logging
 */
export async function processOverrideRequest(
  request: OverrideRequest,
  originalStatus: ConsentStatus | null,
  originalClarity: ConsentClarity
): Promise<OverrideLogEntry> {
  const category = request.category;
  const rules = CATEGORY_FALLBACK_RULES[category];

  // Validate override permission
  const canOverride = 
    (request.overriddenByRole === 'teacher' && rules.canTeacherOverride) ||
    (request.overriddenByRole === 'admin' && rules.canAdminOverride);

  if (!canOverride) {
    throw new Error(`Role '${request.overriddenByRole}' cannot override consent for ${category}`);
  }

  // Cannot override explicit withdrawal
  if (originalStatus === 'withdrawn') {
    throw new Error('Cannot override explicitly withdrawn consent');
  }

  // Log the override action
  const auditLogId = await logAuditEvent({
    entity_type: 'consent_override',
    entity_id: request.messageId,
    action: 'consent_override_applied',
    actor_type: request.overriddenByRole === 'admin' ? 'admin' : 'teacher',
    actor_id: request.overriddenBy,
    summary: buildOverrideSummary(request, originalClarity),
    metadata: {
      guardianId: request.guardianId,
      studentId: request.studentId,
      category: request.category,
      overrideReason: request.overrideReason,
      originalStatus,
      originalClarity,
      additionalNotes: request.additionalNotes,
      witnessName: request.witnessName,
      expiresAfterSend: request.expiresAfterSend,
      overriddenByRole: request.overriddenByRole,
    },
  });

  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    request,
    originalConsentStatus: originalStatus ?? 'not_requested',
    originalClarity,
    auditLogId,
    wasSuccessful: true,
  };
}

function buildOverrideSummary(request: OverrideRequest, clarity: ConsentClarity): string {
  const reasonLabels: Record<OverrideReason, string> = {
    verbal_confirmation: 'verbal confirmation received',
    paper_consent_pending: 'paper consent form submitted',
    admin_discretion: 'admin discretion',
    time_sensitive: 'time-sensitive communication',
    parent_requested: 'parent explicitly requested',
    correction_to_prior: 'correction to prior record',
  };

  return `Consent override applied for ${request.category} (was: ${clarity}). Reason: ${reasonLabels[request.overrideReason]}. Authorized by ${request.overriddenByRole}.`;
}

// =============================================================================
// FOLLOW-UP MANAGEMENT
// =============================================================================

export interface FollowUpTask {
  id: string;
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  taskType: 'collect_consent' | 'verify_consent' | 'resolve_conflict';
  createdAt: Date;
  dueBy?: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Create a follow-up task for unclear consent
 */
export function createConsentFollowUp(
  guardianId: string,
  studentId: string,
  category: ConsentCategory,
  fallbackResult: ConsentFallbackResult
): FollowUpTask | null {
  if (!fallbackResult.followUpRequired || !fallbackResult.followUpType) {
    return null;
  }

  const priority = getPriorityForCategory(category);

  return {
    id: crypto.randomUUID(),
    guardianId,
    studentId,
    category,
    taskType: fallbackResult.followUpType,
    createdAt: new Date(),
    dueBy: getDueDate(fallbackResult.followUpType),
    priority,
    notes: fallbackResult.reason,
  };
}

function getPriorityForCategory(category: ConsentCategory): FollowUpTask['priority'] {
  switch (category) {
    case 'attendance_notifications':
    case 'fee_communications':
      return 'high';
    case 'academic_updates':
    case 'school_announcements':
      return 'medium';
    default:
      return 'low';
  }
}

function getDueDate(taskType: FollowUpTask['taskType']): Date {
  const now = new Date();
  switch (taskType) {
    case 'collect_consent':
      // 7 days to collect
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'verify_consent':
      // 3 days to verify
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    case 'resolve_conflict':
      // 1 day for conflicts (urgent)
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a message can be sent given current consent state
 */
export function canSendMessage(
  category: ConsentCategory,
  status: ConsentStatus | null,
  isEmergency: boolean = false,
  hasOverride: boolean = false
): { canSend: boolean; reason: string } {
  // Emergency always sends
  if (isEmergency || category === 'emergency_alerts') {
    return { canSend: true, reason: 'Emergency communications bypass consent' };
  }

  // Clear granted consent
  if (status === 'granted') {
    return { canSend: true, reason: 'Consent granted' };
  }

  // Override applied
  if (hasOverride) {
    return { canSend: true, reason: 'Override authorized' };
  }

  // All other cases - block
  return { 
    canSend: false, 
    reason: status === 'withdrawn' 
      ? 'Consent explicitly withdrawn' 
      : 'Consent not confirmed'
  };
}

/**
 * Get display info for override reasons
 */
export function getOverrideReasonDisplay(reason: OverrideReason): {
  label: string;
  description: string;
  requiresWitness: boolean;
} {
  const config: Record<OverrideReason, { label: string; description: string; requiresWitness: boolean }> = {
    verbal_confirmation: {
      label: 'Verbal Confirmation',
      description: 'Parent gave verbal consent directly',
      requiresWitness: true,
    },
    paper_consent_pending: {
      label: 'Paper Form Submitted',
      description: 'Physical consent form received, processing',
      requiresWitness: false,
    },
    admin_discretion: {
      label: 'Admin Discretion',
      description: 'School administrator judgment',
      requiresWitness: false,
    },
    time_sensitive: {
      label: 'Time-Sensitive',
      description: 'Urgent but non-emergency communication',
      requiresWitness: false,
    },
    parent_requested: {
      label: 'Parent Requested',
      description: 'Parent explicitly asked to receive this',
      requiresWitness: true,
    },
    correction_to_prior: {
      label: 'Correction',
      description: 'Fixing an earlier recording error',
      requiresWitness: false,
    },
  };

  return config[reason];
}

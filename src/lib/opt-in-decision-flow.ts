/**
 * Opt-In/Opt-Out Decision Flow
 * 
 * Manages notification consent decisions with:
 * - Category-based opt-out (except emergencies)
 * - Conflict resolution for complex guardianship
 * - Manual teacher communication bypass
 */

import type { Database } from '@/integrations/supabase/types';
import { 
  ConsentCategory, 
  ConsentStatus, 
  checkConsent, 
  CONSENT_CATEGORIES,
  MESSAGE_TO_CONSENT_CATEGORY,
  type ConsentRecord,
} from './parent-consent-system';

type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// TYPES
// =============================================================================

export type OptOutScope = 
  | 'all_automated'      // Opt out of all automated messages
  | 'category'           // Opt out of specific category
  | 'student_specific'   // Opt out for specific child only
  | 'temporary';         // Temporary opt-out (vacation, etc.)

export interface OptOutRecord {
  guardianId: string;
  studentId: string | null;      // null = applies to all children
  category: ConsentCategory | 'all_automated';
  scope: OptOutScope;
  isActive: boolean;
  reason?: string;
  createdAt: Date;
  expiresAt?: Date;              // For temporary opt-outs
  recordedBy: string;
  recordedByRole: string;
}

export interface OptInDecision {
  allowed: boolean;
  reason: OptInDecisionReason;
  isAutomated: boolean;
  bypassApplied: boolean;
  conflictResolution?: ConflictResolution;
  guardianDecisions?: GuardianDecision[];
}

export type OptInDecisionReason =
  | 'opted_in'
  | 'emergency_mandatory'
  | 'manual_teacher_bypass'
  | 'opted_out_category'
  | 'opted_out_global'
  | 'consent_not_granted'
  | 'expired_opt_out'
  | 'conflict_resolved_any'
  | 'conflict_resolved_all'
  | 'conflict_resolved_primary';

export interface GuardianDecision {
  guardianId: string;
  guardianName: string;
  isPrimary: boolean;
  decision: 'opted_in' | 'opted_out' | 'no_preference';
  reason?: string;
}

export interface ConflictResolution {
  strategy: ConflictStrategy;
  appliedRule: string;
  overriddenBy?: string;
}

export type ConflictStrategy = 
  | 'any_guardian_allows'    // Send if ANY guardian allows
  | 'all_guardians_allow'    // Send only if ALL allow
  | 'primary_guardian_decides' // Primary guardian's choice wins
  | 'most_permissive'        // Use most permissive option
  | 'most_restrictive';      // Use most restrictive option

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Opt-out rules per category
 */
export const OPT_OUT_RULES: Record<ConsentCategory, {
  canOptOut: boolean;
  requiresReason: boolean;
  minimumNotice?: string;   // Description of why mandatory
  conflictStrategy: ConflictStrategy;
}> = {
  emergency_alerts: {
    canOptOut: false,
    requiresReason: false,
    minimumNotice: 'Emergency alerts are mandatory for student safety',
    conflictStrategy: 'any_guardian_allows',  // Always send
  },
  attendance_notifications: {
    canOptOut: true,
    requiresReason: false,
    conflictStrategy: 'any_guardian_allows',
  },
  academic_updates: {
    canOptOut: true,
    requiresReason: false,
    conflictStrategy: 'any_guardian_allows',
  },
  fee_communications: {
    canOptOut: true,
    requiresReason: true,  // Track why opting out of fee notices
    conflictStrategy: 'primary_guardian_decides',  // Primary handles finances
  },
  school_announcements: {
    canOptOut: true,
    requiresReason: false,
    conflictStrategy: 'any_guardian_allows',
  },
  event_invitations: {
    canOptOut: true,
    requiresReason: false,
    conflictStrategy: 'any_guardian_allows',
  },
};

/**
 * Message categories that manual teacher communication can bypass
 */
export const TEACHER_MANUAL_BYPASS_CATEGORIES: ConsentCategory[] = [
  'attendance_notifications',
  'academic_updates',
  'school_announcements',
  'event_invitations',
];

// =============================================================================
// DECISION FLOW FUNCTIONS
// =============================================================================

/**
 * Main decision flow for opt-in/opt-out
 */
export function evaluateOptInDecision(
  category: MessageCategory,
  guardianPreferences: Array<{
    guardianId: string;
    guardianName: string;
    isPrimary: boolean;
    consentRecords: ConsentRecord[];
    globalOptOut: boolean;
    categoryOptOut: boolean;
  }>,
  options: {
    isManualTeacherMessage?: boolean;
    isEmergency?: boolean;
    forStudentId?: string;
  } = {}
): OptInDecision {
  const consentCategory = MESSAGE_TO_CONSENT_CATEGORY[category];
  const rules = OPT_OUT_RULES[consentCategory];
  const config = CONSENT_CATEGORIES[consentCategory];

  // Step 1: Emergency override - ALWAYS allow
  if (options.isEmergency || config.isMandatory) {
    return {
      allowed: true,
      reason: 'emergency_mandatory',
      isAutomated: !options.isManualTeacherMessage,
      bypassApplied: true,
    };
  }

  // Step 2: Manual teacher communication bypass
  if (options.isManualTeacherMessage && 
      TEACHER_MANUAL_BYPASS_CATEGORIES.includes(consentCategory)) {
    return {
      allowed: true,
      reason: 'manual_teacher_bypass',
      isAutomated: false,
      bypassApplied: true,
    };
  }

  // Step 3: Evaluate each guardian's preference
  const guardianDecisions: GuardianDecision[] = guardianPreferences.map(g => {
    // Check global opt-out first
    if (g.globalOptOut) {
      return {
        guardianId: g.guardianId,
        guardianName: g.guardianName,
        isPrimary: g.isPrimary,
        decision: 'opted_out' as const,
        reason: 'Global opt-out active',
      };
    }

    // Check category-specific opt-out
    if (g.categoryOptOut) {
      return {
        guardianId: g.guardianId,
        guardianName: g.guardianName,
        isPrimary: g.isPrimary,
        decision: 'opted_out' as const,
        reason: `Opted out of ${config.label}`,
      };
    }

    // Check consent status
    const consentDecision = checkConsent(category, g.consentRecords, false);
    
    if (consentDecision.canSend) {
      return {
        guardianId: g.guardianId,
        guardianName: g.guardianName,
        isPrimary: g.isPrimary,
        decision: 'opted_in' as const,
      };
    } else if (consentDecision.consentStatus === 'pending' || 
               consentDecision.consentStatus === 'not_requested') {
      return {
        guardianId: g.guardianId,
        guardianName: g.guardianName,
        isPrimary: g.isPrimary,
        decision: 'no_preference' as const,
        reason: consentDecision.reason,
      };
    } else {
      return {
        guardianId: g.guardianId,
        guardianName: g.guardianName,
        isPrimary: g.isPrimary,
        decision: 'opted_out' as const,
        reason: consentDecision.reason,
      };
    }
  });

  // Step 4: Resolve conflicts if multiple guardians
  if (guardianDecisions.length > 1) {
    return resolveGuardianConflict(
      guardianDecisions,
      rules.conflictStrategy,
      consentCategory
    );
  }

  // Step 5: Single guardian decision
  const decision = guardianDecisions[0];
  if (!decision) {
    return {
      allowed: false,
      reason: 'consent_not_granted',
      isAutomated: !options.isManualTeacherMessage,
      bypassApplied: false,
    };
  }

  return {
    allowed: decision.decision === 'opted_in',
    reason: decision.decision === 'opted_in' ? 'opted_in' : 
            decision.decision === 'opted_out' ? 'opted_out_category' : 'consent_not_granted',
    isAutomated: !options.isManualTeacherMessage,
    bypassApplied: false,
    guardianDecisions,
  };
}

/**
 * Resolve conflicts between multiple guardians
 */
function resolveGuardianConflict(
  decisions: GuardianDecision[],
  strategy: ConflictStrategy,
  category: ConsentCategory
): OptInDecision {
  const allowedCount = decisions.filter(d => d.decision === 'opted_in').length;
  const deniedCount = decisions.filter(d => d.decision === 'opted_out').length;
  const primaryGuardian = decisions.find(d => d.isPrimary);

  let allowed: boolean;
  let reason: OptInDecisionReason;
  let appliedRule: string;
  let overriddenBy: string | undefined;

  switch (strategy) {
    case 'any_guardian_allows':
      allowed = allowedCount > 0;
      reason = allowed ? 'conflict_resolved_any' : 'opted_out_category';
      appliedRule = 'At least one guardian allows';
      break;

    case 'all_guardians_allow':
      allowed = deniedCount === 0 && allowedCount > 0;
      reason = allowed ? 'conflict_resolved_all' : 'opted_out_category';
      appliedRule = 'All guardians must allow';
      break;

    case 'primary_guardian_decides':
      if (primaryGuardian) {
        allowed = primaryGuardian.decision === 'opted_in';
        reason = 'conflict_resolved_primary';
        appliedRule = 'Primary guardian decision applied';
        if (allowed && deniedCount > 0) {
          overriddenBy = primaryGuardian.guardianName;
        }
      } else {
        // Fallback to any_guardian_allows if no primary
        allowed = allowedCount > 0;
        reason = 'conflict_resolved_any';
        appliedRule = 'No primary guardian - using permissive rule';
      }
      break;

    case 'most_permissive':
      allowed = allowedCount > 0;
      reason = allowed ? 'conflict_resolved_any' : 'opted_out_category';
      appliedRule = 'Most permissive option selected';
      break;

    case 'most_restrictive':
      allowed = deniedCount === 0;
      reason = allowed ? 'conflict_resolved_all' : 'opted_out_category';
      appliedRule = 'Most restrictive option selected';
      break;

    default:
      allowed = allowedCount > 0;
      reason = 'conflict_resolved_any';
      appliedRule = 'Default rule applied';
  }

  return {
    allowed,
    reason,
    isAutomated: true,
    bypassApplied: false,
    guardianDecisions: decisions,
    conflictResolution: {
      strategy,
      appliedRule,
      overriddenBy,
    },
  };
}

// =============================================================================
// EDGE CASE HANDLERS
// =============================================================================

/**
 * Handle partial consent (some categories granted, others not)
 */
export function getPartialConsentSummary(
  consentRecords: ConsentRecord[]
): {
  fullyConsented: ConsentCategory[];
  pending: ConsentCategory[];
  withdrawn: ConsentCategory[];
  notRequested: ConsentCategory[];
} {
  const categories = Object.keys(CONSENT_CATEGORIES) as ConsentCategory[];
  
  return {
    fullyConsented: categories.filter(cat => {
      const record = consentRecords.find(r => r.category === cat);
      return record?.status === 'granted' || CONSENT_CATEGORIES[cat].isMandatory;
    }),
    pending: categories.filter(cat => {
      const record = consentRecords.find(r => r.category === cat);
      return record?.status === 'pending';
    }),
    withdrawn: categories.filter(cat => {
      const record = consentRecords.find(r => r.category === cat);
      return record?.status === 'withdrawn';
    }),
    notRequested: categories.filter(cat => {
      const record = consentRecords.find(r => r.category === cat);
      return !record && CONSENT_CATEGORIES[cat].requiresExplicitConsent;
    }),
  };
}

/**
 * Handle parent with multiple children
 * Returns opt-out status per child
 */
export function getMultiChildOptOutStatus(
  guardianId: string,
  optOutRecords: OptOutRecord[],
  childrenIds: string[]
): Record<string, {
  globalOptOut: boolean;
  categoryOptOuts: ConsentCategory[];
}> {
  const result: Record<string, {
    globalOptOut: boolean;
    categoryOptOuts: ConsentCategory[];
  }> = {};

  // Get guardian-wide opt-outs (studentId = null)
  const guardianWideRecords = optOutRecords.filter(
    r => r.guardianId === guardianId && !r.studentId && r.isActive
  );

  const globalOptOut = guardianWideRecords.some(
    r => r.category === 'all_automated'
  );

  const guardianWideCategoryOptOuts = guardianWideRecords
    .filter(r => r.category !== 'all_automated')
    .map(r => r.category as ConsentCategory);

  // Process each child
  childrenIds.forEach(childId => {
    // Get child-specific opt-outs
    const childRecords = optOutRecords.filter(
      r => r.guardianId === guardianId && 
           r.studentId === childId && 
           r.isActive
    );

    const childGlobalOptOut = childRecords.some(
      r => r.category === 'all_automated'
    );

    const childCategoryOptOuts = childRecords
      .filter(r => r.category !== 'all_automated')
      .map(r => r.category as ConsentCategory);

    result[childId] = {
      globalOptOut: globalOptOut || childGlobalOptOut,
      categoryOptOuts: [
        ...new Set([...guardianWideCategoryOptOuts, ...childCategoryOptOuts])
      ],
    };
  });

  return result;
}

/**
 * Check if opt-out has expired
 */
export function isOptOutExpired(record: OptOutRecord): boolean {
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt) < new Date();
}

/**
 * Get effective opt-out for a specific message
 */
export function getEffectiveOptOut(
  guardianId: string,
  studentId: string,
  category: MessageCategory,
  optOutRecords: OptOutRecord[]
): {
  isOptedOut: boolean;
  scope: OptOutScope | null;
  reason?: string;
  expiresAt?: Date;
} {
  const consentCategory = MESSAGE_TO_CONSENT_CATEGORY[category];
  
  // Filter relevant records for this guardian
  const relevantRecords = optOutRecords.filter(r => {
    if (r.guardianId !== guardianId) return false;
    if (!r.isActive) return false;
    if (isOptOutExpired(r)) return false;
    
    // Check if applies to this student
    if (r.studentId && r.studentId !== studentId) return false;
    
    // Check if applies to this category
    if (r.category !== 'all_automated' && r.category !== consentCategory) return false;
    
    return true;
  });

  if (relevantRecords.length === 0) {
    return { isOptedOut: false, scope: null };
  }

  // Priority: student-specific > category > all_automated > temporary
  const prioritized = relevantRecords.sort((a, b) => {
    const scopePriority: Record<OptOutScope, number> = {
      student_specific: 4,
      category: 3,
      all_automated: 2,
      temporary: 1,
    };
    return scopePriority[b.scope] - scopePriority[a.scope];
  })[0];

  return {
    isOptedOut: true,
    scope: prioritized.scope,
    reason: prioritized.reason,
    expiresAt: prioritized.expiresAt,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate opt-out request
 */
export function validateOptOutRequest(
  category: ConsentCategory,
  reason?: string
): { valid: boolean; error?: string } {
  const rules = OPT_OUT_RULES[category];

  if (!rules.canOptOut) {
    return {
      valid: false,
      error: rules.minimumNotice || `Cannot opt out of ${CONSENT_CATEGORIES[category].label}`,
    };
  }

  if (rules.requiresReason && !reason?.trim()) {
    return {
      valid: false,
      error: `A reason is required to opt out of ${CONSENT_CATEGORIES[category].label}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export function getOptInDecisionDisplay(decision: OptInDecision): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  switch (decision.reason) {
    case 'opted_in':
      return {
        label: 'Will Receive',
        description: 'Parent has opted in to receive these notifications',
        icon: 'check-circle',
        color: 'green',
      };
    case 'emergency_mandatory':
      return {
        label: 'Mandatory',
        description: 'Emergency alerts are always sent for safety',
        icon: 'alert-triangle',
        color: 'red',
      };
    case 'manual_teacher_bypass':
      return {
        label: 'Teacher Message',
        description: 'Manual teacher messages bypass automated opt-outs',
        icon: 'user-check',
        color: 'blue',
      };
    case 'opted_out_category':
      return {
        label: 'Opted Out',
        description: 'Parent has opted out of this category',
        icon: 'x-circle',
        color: 'gray',
      };
    case 'opted_out_global':
      return {
        label: 'Opted Out (All)',
        description: 'Parent has opted out of all automated messages',
        icon: 'x-circle',
        color: 'gray',
      };
    case 'consent_not_granted':
      return {
        label: 'No Consent',
        description: 'Consent has not been granted for this category',
        icon: 'clock',
        color: 'yellow',
      };
    case 'conflict_resolved_any':
      return {
        label: 'Allowed (Any)',
        description: 'At least one guardian allows this notification',
        icon: 'users',
        color: 'green',
      };
    case 'conflict_resolved_all':
      return {
        label: 'Allowed (All)',
        description: 'All guardians allow this notification',
        icon: 'users',
        color: 'green',
      };
    case 'conflict_resolved_primary':
      return {
        label: 'Primary Decides',
        description: 'Primary guardian\'s preference applied',
        icon: 'user',
        color: 'blue',
      };
    default:
      return {
        label: 'Unknown',
        description: 'Status could not be determined',
        icon: 'help-circle',
        color: 'gray',
      };
  }
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

export const OPT_IN_DECISION_FLOW_SUMMARY = {
  overview: {
    description: 'Decision flow for parent notification opt-in/opt-out',
    principles: [
      'Parents can opt out per category',
      'Emergency notifications CANNOT be opted out',
      'Manual teacher messages bypass opt-out',
      'Conflict resolution for shared guardianship',
    ],
  },
  decisionFlow: {
    step1: 'Check emergency override - always allow',
    step2: 'Check manual teacher bypass - allow if applicable',
    step3: 'Evaluate each guardian preference',
    step4: 'Resolve conflicts using category strategy',
    step5: 'Return final decision with reason',
  },
  conflictStrategies: {
    any_guardian_allows: 'Send if ANY guardian allows (default for most)',
    all_guardians_allow: 'Send only if ALL guardians allow',
    primary_guardian_decides: 'Primary guardian choice wins (used for fees)',
    most_permissive: 'Use most permissive option',
    most_restrictive: 'Use most restrictive option',
  },
  edgeCases: {
    partialConsent: 'Track consent status per category separately',
    multipleChildren: 'Support child-specific opt-outs per guardian',
    sharedGuardianship: 'Apply conflict resolution strategy per category',
    temporaryOptOut: 'Support expiring opt-outs (vacation mode)',
  },
} as const;

/**
 * Guardian Link Safety Rules
 * 
 * Comprehensive safety system to prevent and recover from
 * incorrect parent-student linking.
 */

/**
 * SAFETY RULES - Enforced at all levels
 */
export const LINK_SAFETY_RULES = {
  /**
   * Rule 1: One-Click Unlink
   * Admins can immediately unlink any guardian-student pair
   */
  oneClickUnlink: {
    enabled: true,
    allowedRoles: ['school_admin', 'platform_admin'],
    requiresReason: true,
    minReasonLength: 10,
  },

  /**
   * Rule 2: Soft Delete Only
   * Links are NEVER hard deleted - always soft deleted
   */
  softDeleteOnly: {
    enabled: true,
    retentionDays: 90,
    auditRequired: true,
    recoverableUntil: 90, // days
  },

  /**
   * Rule 3: Warning Before Relinking
   * System warns if guardian/student was previously linked
   */
  relinkWarning: {
    enabled: true,
    checkPreviousLinks: true,
    checkIncidents: true,
    checkDuplicates: true,
    requireAcknowledgment: true,
  },

  /**
   * Rule 4: Full Action Logging
   * Every action is logged with who, when, what
   */
  actionLogging: {
    enabled: true,
    logFields: ['performer_id', 'performer_role', 'action', 'timestamp', 'reason', 'metadata'],
    immutableLogs: true,
  },

  /**
   * Rule 5: Incident Tracking
   * Mislinks are tracked as incidents for accountability
   */
  incidentTracking: {
    enabled: true,
    severityLevels: ['low', 'medium', 'high', 'critical'],
    requireResolution: true,
    notifySchoolAdmin: true,
  },
} as const;

/**
 * INCIDENT TYPES
 */
export type IncidentType = 
  | 'wrong_parent'      // Linked to wrong parent
  | 'wrong_student'     // Linked to wrong student
  | 'duplicate'         // Duplicate link created
  | 'unauthorized'      // Unauthorized person linked
  | 'other';            // Other issue

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'escalated';

/**
 * Incident severity definitions
 */
export const INCIDENT_SEVERITY_RULES: Record<IncidentSeverity, {
  description: string;
  responseTime: string;
  notifyPlatformAdmin: boolean;
}> = {
  low: {
    description: 'Minor issue, no data accessed',
    responseTime: 'Within 7 days',
    notifyPlatformAdmin: false,
  },
  medium: {
    description: 'Incorrect link, minimal data exposure',
    responseTime: 'Within 48 hours',
    notifyPlatformAdmin: false,
  },
  high: {
    description: 'Wrong parent accessed student data',
    responseTime: 'Within 24 hours',
    notifyPlatformAdmin: true,
  },
  critical: {
    description: 'Significant data breach or safety concern',
    responseTime: 'Immediate',
    notifyPlatformAdmin: true,
  },
};

/**
 * DATA RETENTION RULES
 */
export const DATA_RETENTION_RULES = {
  // Soft-deleted links
  deletedLinks: {
    retentionDays: 90,
    reason: 'Allow recovery from accidental deletion',
    permanentDeleteAfter: true,
  },

  // Audit logs
  auditLogs: {
    retentionDays: 365 * 3, // 3 years
    reason: 'Legal and compliance requirements',
    permanentDeleteAfter: false, // Keep indefinitely
  },

  // Incidents
  incidents: {
    retentionDays: 365 * 5, // 5 years
    reason: 'Accountability and pattern analysis',
    permanentDeleteAfter: false,
  },

  // Link requests
  linkRequests: {
    retentionDays: 365, // 1 year
    reason: 'Reference for disputes',
    permanentDeleteAfter: true,
  },
};

/**
 * MISLINK RECOVERY PROCESS
 * 
 * Step 1: DISCOVER
 * ├── Admin/teacher notices incorrect link
 * ├── Parent reports wrong child visible
 * └── System detects anomaly (future)
 * 
 * Step 2: ASSESS
 * ├── Determine severity
 * ├── Check if data was accessed
 * └── Document what happened
 * 
 * Step 3: CONTAIN
 * ├── One-click unlink (immediate)
 * ├── Soft-delete preserves audit trail
 * └── Log the unlinking action
 * 
 * Step 4: NOTIFY
 * ├── School admin notified
 * ├── Platform admin if high/critical
 * └── Parent notification (if appropriate)
 * 
 * Step 5: RESOLVE
 * ├── Create incident report
 * ├── Determine root cause
 * └── Document preventive measures
 * 
 * Step 6: RECOVER (if needed)
 * ├── Restore correct link if accidentally removed
 * ├── Create new correct link
 * └── Verify correct parent-student pair
 */
export const RECOVERY_FLOW_STEPS = [
  {
    step: 1,
    name: 'Discover',
    description: 'Identify the incorrect link',
    actions: [
      'Admin/teacher notices incorrect link',
      'Parent reports seeing wrong child',
      'System flags anomaly (future)',
    ],
    owner: 'Discoverer',
  },
  {
    step: 2,
    name: 'Assess',
    description: 'Evaluate severity and impact',
    actions: [
      'Determine incident severity',
      'Check if parent accessed child data',
      'Document timeline of events',
    ],
    owner: 'School Admin',
  },
  {
    step: 3,
    name: 'Contain',
    description: 'Immediately stop incorrect access',
    actions: [
      'Use one-click unlink button',
      'Confirm link is soft-deleted',
      'Verify parent can no longer access',
    ],
    owner: 'School Admin',
  },
  {
    step: 4,
    name: 'Notify',
    description: 'Inform relevant parties',
    actions: [
      'Notify school admin (automatic)',
      'Notify platform admin if high severity',
      'Consider parent notification',
    ],
    owner: 'System / School Admin',
  },
  {
    step: 5,
    name: 'Resolve',
    description: 'Complete incident documentation',
    actions: [
      'Create incident report',
      'Identify root cause',
      'Document preventive measures',
    ],
    owner: 'School Admin',
  },
  {
    step: 6,
    name: 'Recover',
    description: 'Restore correct state if needed',
    actions: [
      'Restore link if incorrectly removed',
      'Create correct link if needed',
      'Verify final state is correct',
    ],
    owner: 'School Admin',
  },
] as const;

/**
 * SCHOOL ACCOUNTABILITY SAFEGUARDS
 */
export const ACCOUNTABILITY_SAFEGUARDS = {
  // All actions are attributed to a person
  attribution: {
    requirePerformer: true,
    requireRole: true,
    requireTimestamp: true,
    noAnonymousActions: true,
  },

  // Audit trail is immutable
  auditTrail: {
    appendOnly: true,
    noEdits: true,
    noDeletes: true,
    hashChain: false, // Future: blockchain-style integrity
  },

  // School is responsible for their links
  schoolResponsibility: {
    schoolAdminApprovalRequired: true,
    incidentsAssignedToSchool: true,
    metricsTrackedPerSchool: true,
  },

  // Platform oversight
  platformOversight: {
    canViewAllIncidents: true,
    canAuditSchoolLinks: true,
    canSuspendLinkingForSchool: true,
  },
};

/**
 * Pre-link validation checks
 */
export interface RelinkWarning {
  type: 'previous_link' | 'incident' | 'duplicate' | 'different_school';
  severity: 'info' | 'warning' | 'error';
  message: string;
  blocksAction: boolean;
}

/**
 * Check if action requires confirmation
 */
export function requiresConfirmation(
  action: 'unlink' | 'relink' | 'recover',
  hasWarnings: boolean
): boolean {
  switch (action) {
    case 'unlink':
      return true; // Always confirm unlinks
    case 'relink':
      return hasWarnings; // Confirm if warnings exist
    case 'recover':
      return true; // Always confirm recovery
    default:
      return true;
  }
}

/**
 * Get severity for incident type
 */
export function getSuggestedSeverity(
  incidentType: IncidentType,
  dataAccessed: boolean
): IncidentSeverity {
  if (incidentType === 'unauthorized') return 'critical';
  if (dataAccessed) return 'high';
  if (incidentType === 'duplicate') return 'low';
  return 'medium';
}

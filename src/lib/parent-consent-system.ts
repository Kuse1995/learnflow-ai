/**
 * Parent Consent System
 * 
 * Manages consent for school communications in offline-first,
 * paper-compatible manner suited for Zambian school operations.
 * 
 * Key principles:
 * - Paper and verbal consent are valid initial sources
 * - Emergency alerts ALWAYS bypass consent
 * - Other categories require explicit consent
 * - Consent can be recorded offline and synced later
 */

import type { Database } from '@/integrations/supabase/types';

type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// TYPES
// =============================================================================

export type ConsentStatus = 'granted' | 'pending' | 'withdrawn' | 'not_requested';

export type ConsentSource = 
  | 'paper_form'        // Physical consent form signed
  | 'verbal_teacher'    // Verbal consent to teacher
  | 'verbal_admin'      // Verbal consent to admin
  | 'phone_call'        // Consent given over phone
  | 'sms_reply'         // SMS opt-in confirmation
  | 'whatsapp_reply'    // WhatsApp opt-in confirmation
  | 'app_toggle'        // In-app consent toggle (future)
  | 'inherited'         // Inherited from school enrollment
  | 'assumed_default';  // Default for mandatory categories

export type ConsentCategory = 
  | 'attendance_notifications'
  | 'academic_updates'
  | 'emergency_alerts'      // Mandatory - cannot opt out
  | 'fee_communications'
  | 'school_announcements'
  | 'event_invitations';

export interface ConsentRecord {
  id: string;
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  status: ConsentStatus;
  source: ConsentSource;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  recordedBy: string;         // Teacher/admin who recorded
  recordedByRole: string;
  witnessName?: string;       // For verbal consent
  paperFormRef?: string;      // Reference to physical form
  notes?: string;
  expiresAt?: Date;           // Some consents may expire
  lastReviewedAt?: Date;
  syncedAt?: Date | null;     // Null if offline-only
}

export interface ConsentDecision {
  canSend: boolean;
  reason: ConsentDecisionReason;
  consentStatus: ConsentStatus;
  requiresReview: boolean;
  overrideApplied: boolean;
}

export type ConsentDecisionReason =
  | 'consent_granted'
  | 'emergency_override'
  | 'consent_pending'
  | 'consent_withdrawn'
  | 'consent_expired'
  | 'consent_not_requested'
  | 'assumed_from_enrollment';

// =============================================================================
// CONSENT CATEGORY CONFIGURATION
// =============================================================================

/**
 * Category configuration - defines rules for each consent type
 */
export const CONSENT_CATEGORIES: Record<ConsentCategory, {
  label: string;
  description: string;
  isMandatory: boolean;             // Cannot opt out
  defaultStatus: ConsentStatus;     // Status if not explicitly set
  requiresExplicitConsent: boolean; // Must be explicitly granted
  canBeVerbal: boolean;             // Verbal consent acceptable
  expiryMonths?: number;            // Auto-expire after N months
  messageCategories: MessageCategory[]; // Maps to message categories
}> = {
  emergency_alerts: {
    label: 'Emergency Alerts',
    description: 'Critical safety notifications (school closures, incidents)',
    isMandatory: true,
    defaultStatus: 'granted',
    requiresExplicitConsent: false,
    canBeVerbal: false,
    messageCategories: ['emergency_notice'],
  },
  attendance_notifications: {
    label: 'Attendance Updates',
    description: 'Notifications when child is absent or late',
    isMandatory: false,
    defaultStatus: 'pending',
    requiresExplicitConsent: true,
    canBeVerbal: true,
    messageCategories: ['attendance_notice'],
  },
  academic_updates: {
    label: 'Learning Updates',
    description: 'Updates about child\'s learning progress',
    isMandatory: false,
    defaultStatus: 'pending',
    requiresExplicitConsent: true,
    canBeVerbal: true,
    messageCategories: ['learning_update'],
  },
  fee_communications: {
    label: 'Fee Information',
    description: 'Updates about school fees and payments',
    isMandatory: false,
    defaultStatus: 'pending',
    requiresExplicitConsent: true,
    canBeVerbal: false,  // Should be paper for fee-related
    expiryMonths: 12,    // Re-consent annually
    messageCategories: ['fee_status'],
  },
  school_announcements: {
    label: 'School Announcements',
    description: 'General school news and updates',
    isMandatory: false,
    defaultStatus: 'pending',
    requiresExplicitConsent: true,
    canBeVerbal: true,
    messageCategories: ['school_announcement'],
  },
  event_invitations: {
    label: 'Event Invitations',
    description: 'Invitations to school events and meetings',
    isMandatory: false,
    defaultStatus: 'pending',
    requiresExplicitConsent: false,  // Assumed from enrollment
    canBeVerbal: true,
    messageCategories: ['school_announcement'],
  },
};

/**
 * Map message category to consent category
 */
export const MESSAGE_TO_CONSENT_CATEGORY: Record<MessageCategory, ConsentCategory> = {
  emergency_notice: 'emergency_alerts',
  attendance_notice: 'attendance_notifications',
  learning_update: 'academic_updates',
  fee_status: 'fee_communications',
  school_announcement: 'school_announcements',
};

// =============================================================================
// CONSENT CHECKING FUNCTIONS
// =============================================================================

/**
 * Check if communication can be sent based on consent
 */
export function checkConsent(
  category: MessageCategory,
  consentRecords: ConsentRecord[],
  isEmergency: boolean = false
): ConsentDecision {
  const consentCategory = MESSAGE_TO_CONSENT_CATEGORY[category];
  const config = CONSENT_CATEGORIES[consentCategory];

  // Emergency override - ALWAYS allow
  if (isEmergency || config.isMandatory) {
    return {
      canSend: true,
      reason: 'emergency_override',
      consentStatus: 'granted',
      requiresReview: false,
      overrideApplied: true,
    };
  }

  // Find relevant consent record
  const consent = consentRecords.find(r => r.category === consentCategory);

  // No consent record exists
  if (!consent) {
    return {
      canSend: !config.requiresExplicitConsent,
      reason: config.requiresExplicitConsent 
        ? 'consent_not_requested' 
        : 'assumed_from_enrollment',
      consentStatus: config.defaultStatus,
      requiresReview: config.requiresExplicitConsent,
      overrideApplied: false,
    };
  }

  // Check if consent has expired
  if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
    return {
      canSend: false,
      reason: 'consent_expired',
      consentStatus: 'withdrawn',
      requiresReview: true,
      overrideApplied: false,
    };
  }

  // Check consent status
  switch (consent.status) {
    case 'granted':
      return {
        canSend: true,
        reason: 'consent_granted',
        consentStatus: 'granted',
        requiresReview: false,
        overrideApplied: false,
      };

    case 'pending':
      return {
        canSend: false,
        reason: 'consent_pending',
        consentStatus: 'pending',
        requiresReview: true,
        overrideApplied: false,
      };

    case 'withdrawn':
      return {
        canSend: false,
        reason: 'consent_withdrawn',
        consentStatus: 'withdrawn',
        requiresReview: false,
        overrideApplied: false,
      };

    default:
      return {
        canSend: false,
        reason: 'consent_not_requested',
        consentStatus: 'not_requested',
        requiresReview: true,
        overrideApplied: false,
      };
  }
}

/**
 * Get overall consent status for a guardian-student pair
 */
export function getConsentSummary(
  consentRecords: ConsentRecord[]
): Record<ConsentCategory, ConsentStatus> {
  const categories = Object.keys(CONSENT_CATEGORIES) as ConsentCategory[];
  
  return categories.reduce((acc, category) => {
    const record = consentRecords.find(r => r.category === category);
    const config = CONSENT_CATEGORIES[category];

    if (record) {
      // Check expiry
      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        acc[category] = 'withdrawn';
      } else {
        acc[category] = record.status;
      }
    } else {
      acc[category] = config.defaultStatus;
    }

    return acc;
  }, {} as Record<ConsentCategory, ConsentStatus>);
}

// =============================================================================
// OFFLINE CONSENT RECORDING
// =============================================================================

/**
 * Create a consent record for offline storage
 */
export function createOfflineConsentRecord(
  guardianId: string,
  studentId: string,
  category: ConsentCategory,
  status: ConsentStatus,
  source: ConsentSource,
  recordedBy: string,
  recordedByRole: string,
  options: {
    witnessName?: string;
    paperFormRef?: string;
    notes?: string;
  } = {}
): ConsentRecord {
  const config = CONSENT_CATEGORIES[category];

  return {
    id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    guardianId,
    studentId,
    category,
    status,
    source,
    grantedAt: status === 'granted' ? new Date() : null,
    withdrawnAt: status === 'withdrawn' ? new Date() : null,
    recordedBy,
    recordedByRole,
    witnessName: options.witnessName,
    paperFormRef: options.paperFormRef,
    notes: options.notes,
    expiresAt: config.expiryMonths 
      ? new Date(Date.now() + config.expiryMonths * 30 * 24 * 60 * 60 * 1000)
      : undefined,
    lastReviewedAt: new Date(),
    syncedAt: null,
  };
}

/**
 * Validate consent source for category
 */
export function isValidConsentSource(
  category: ConsentCategory,
  source: ConsentSource
): { valid: boolean; reason?: string } {
  const config = CONSENT_CATEGORIES[category];

  // Paper and verbal for most categories
  if (!config.canBeVerbal && source.startsWith('verbal_')) {
    return { 
      valid: false, 
      reason: `${config.label} requires written consent, verbal not accepted` 
    };
  }

  // Fee communications should be paper for audit trail
  if (category === 'fee_communications' && source !== 'paper_form') {
    return { 
      valid: false, 
      reason: 'Fee communications require paper consent form' 
    };
  }

  return { valid: true };
}

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

const CONSENT_STORAGE_KEY = 'stitch_consent_records';

/**
 * Get locally stored consent records
 */
export function getLocalConsentRecords(): ConsentRecord[] {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save consent record locally
 */
export function saveLocalConsentRecord(record: ConsentRecord): void {
  const records = getLocalConsentRecords();
  const existingIndex = records.findIndex(
    r => r.guardianId === record.guardianId && 
         r.studentId === record.studentId && 
         r.category === record.category
  );

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(records));
}

/**
 * Get unsynced consent records
 */
export function getUnsyncedConsentRecords(): ConsentRecord[] {
  return getLocalConsentRecords().filter(r => !r.syncedAt);
}

/**
 * Mark consent records as synced
 */
export function markConsentRecordsSynced(ids: string[]): void {
  const records = getLocalConsentRecords();
  const now = new Date();

  records.forEach(r => {
    if (ids.includes(r.id)) {
      r.syncedAt = now;
    }
  });

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(records));
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get status display info
 */
export function getConsentStatusDisplay(status: ConsentStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'granted':
      return { label: 'Consent Given', color: 'green', icon: 'check-circle' };
    case 'pending':
      return { label: 'Awaiting Consent', color: 'yellow', icon: 'clock' };
    case 'withdrawn':
      return { label: 'Consent Withdrawn', color: 'red', icon: 'x-circle' };
    case 'not_requested':
      return { label: 'Not Yet Requested', color: 'gray', icon: 'minus-circle' };
  }
}

/**
 * Get source display info
 */
export function getConsentSourceDisplay(source: ConsentSource): string {
  const labels: Record<ConsentSource, string> = {
    paper_form: 'Paper Form',
    verbal_teacher: 'Verbal (Teacher)',
    verbal_admin: 'Verbal (Admin)',
    phone_call: 'Phone Call',
    sms_reply: 'SMS Reply',
    whatsapp_reply: 'WhatsApp Reply',
    app_toggle: 'App Setting',
    inherited: 'School Enrollment',
    assumed_default: 'Default',
  };
  return labels[source];
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

export const CONSENT_SYSTEM_SUMMARY = {
  overview: {
    description: 'Offline-first consent management for Zambian schools',
    principles: [
      'Paper and verbal consent are valid initial sources',
      'Emergency alerts ALWAYS bypass consent',
      'Other categories require explicit consent',
      'Consent can be recorded offline and synced later',
    ],
  },
  categories: {
    emergency_alerts: 'Mandatory - cannot opt out',
    attendance_notifications: 'Requires explicit consent',
    academic_updates: 'Requires explicit consent',
    fee_communications: 'Requires paper form consent',
    school_announcements: 'Requires explicit consent',
    event_invitations: 'Assumed from enrollment',
  },
  states: {
    granted: 'Parent has given consent',
    pending: 'Consent requested but not yet given',
    withdrawn: 'Parent has withdrawn previous consent',
    not_requested: 'Consent has not been formally requested',
  },
  sources: {
    paper: 'Physical consent form signed and filed',
    verbal: 'Verbal consent with witness (except fee-related)',
    digital: 'SMS/WhatsApp reply or app toggle (future)',
  },
} as const;

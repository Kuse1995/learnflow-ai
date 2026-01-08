/**
 * Consent Audit System
 * 
 * Provides immutable audit trail for consent capture with:
 * - Multiple capture sources (admin, teacher, verbal)
 * - Complete history with no deletions
 * - State change tracking
 * - Compliance-ready logging
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from './audit-logger';
import type { 
  ConsentCategory, 
  ConsentStatus, 
  ConsentSource,
  ConsentRecord,
} from './parent-consent-system';

// =============================================================================
// TYPES
// =============================================================================

export type ConsentCaptureMethod = 
  | 'admin_manual_entry'      // Admin enters consent from paper form
  | 'teacher_confirmation'    // Teacher confirms verbal consent
  | 'verbal_witnessed'        // Verbal consent with witness
  | 'phone_recorded'          // Phone call with recorded confirmation
  | 'sms_opt_in'              // SMS reply opt-in
  | 'whatsapp_opt_in'         // WhatsApp reply opt-in
  | 'enrollment_default'      // Default from school enrollment
  | 'system_migration';       // Migrated from legacy system

export type ConsentChangeType =
  | 'initial_grant'           // First time consent given
  | 'renewal'                 // Consent renewed (expired was re-granted)
  | 'withdrawal'              // Consent withdrawn
  | 'modification'            // Category or scope modified
  | 'expiry'                  // Consent expired automatically
  | 'correction'              // Admin corrected error (with reason)
  | 'transfer'                // Transferred from another guardian
  | 'restoration';            // Restored after withdrawal

export interface ConsentAuditEntry {
  id: string;
  consentRecordId: string;
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  
  // State change
  previousStatus: ConsentStatus | null;
  newStatus: ConsentStatus;
  changeType: ConsentChangeType;
  
  // Capture details
  captureMethod: ConsentCaptureMethod;
  capturedBy: string;            // User ID who captured
  capturedByRole: 'admin' | 'teacher' | 'system';
  capturedByName?: string;       // Display name for audit
  
  // Evidence
  witnessName?: string;          // For verbal consent
  paperFormReference?: string;   // Physical form ID/location
  phoneCallId?: string;          // Call recording reference
  smsMessageId?: string;         // SMS message ID
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  
  // Timestamps
  capturedAt: Date;
  effectiveFrom: Date;           // When consent becomes effective
  expiresAt?: Date;
  
  // Immutability
  auditLogId: string;            // Link to main audit_logs table
  entryHash: string;             // Hash for integrity verification
}

export interface ConsentHistoryView {
  guardianId: string;
  guardianName: string;
  studentId: string;
  studentName: string;
  category: ConsentCategory;
  currentStatus: ConsentStatus;
  history: ConsentAuditEntry[];
  totalChanges: number;
  firstGrantedAt?: Date;
  lastModifiedAt: Date;
  lastModifiedBy: string;
}

// =============================================================================
// AUDIT ENTRY CREATION
// =============================================================================

/**
 * Create immutable audit entry for consent change
 */
export async function createConsentAuditEntry(
  params: {
    consentRecordId: string;
    guardianId: string;
    studentId: string;
    category: ConsentCategory;
    previousStatus: ConsentStatus | null;
    newStatus: ConsentStatus;
    changeType: ConsentChangeType;
    captureMethod: ConsentCaptureMethod;
    capturedBy: string;
    capturedByRole: 'admin' | 'teacher' | 'system';
    capturedByName?: string;
    witnessName?: string;
    paperFormReference?: string;
    notes?: string;
    effectiveFrom?: Date;
    expiresAt?: Date;
  }
): Promise<{ success: boolean; auditLogId?: string; error?: string }> {
  try {
    // Create main audit log entry first
    const summary = buildConsentAuditSummary(params);
    
    const auditLogId = await logAuditEvent({
      actor_type: params.capturedByRole === 'system' ? 'system' : params.capturedByRole,
      actor_id: params.capturedBy,
      action: `consent_${params.changeType}`,
      entity_type: 'consent_record',
      entity_id: params.consentRecordId,
      summary,
      metadata: {
        guardian_id: params.guardianId,
        student_id: params.studentId,
        category: params.category,
        previous_status: params.previousStatus,
        new_status: params.newStatus,
        capture_method: params.captureMethod,
        witness_name: params.witnessName,
        paper_form_reference: params.paperFormReference,
        notes: params.notes,
        effective_from: params.effectiveFrom?.toISOString(),
        expires_at: params.expiresAt?.toISOString(),
      },
    });

    if (!auditLogId) {
      throw new Error('Failed to create audit log entry');
    }

    return { success: true, auditLogId };
  } catch (error) {
    console.error('Consent audit entry creation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Build human-readable audit summary
 */
function buildConsentAuditSummary(params: {
  category: ConsentCategory;
  previousStatus: ConsentStatus | null;
  newStatus: ConsentStatus;
  changeType: ConsentChangeType;
  captureMethod: ConsentCaptureMethod;
  capturedByRole: string;
  witnessName?: string;
}): string {
  const categoryLabels: Record<ConsentCategory, string> = {
    emergency_alerts: 'Emergency Alerts',
    attendance_notifications: 'Attendance Notifications',
    academic_updates: 'Academic Updates',
    fee_communications: 'Fee Communications',
    school_announcements: 'School Announcements',
    event_invitations: 'Event Invitations',
  };

  const methodLabels: Record<ConsentCaptureMethod, string> = {
    admin_manual_entry: 'admin manual entry',
    teacher_confirmation: 'teacher confirmation',
    verbal_witnessed: 'witnessed verbal consent',
    phone_recorded: 'recorded phone call',
    sms_opt_in: 'SMS opt-in',
    whatsapp_opt_in: 'WhatsApp opt-in',
    enrollment_default: 'enrollment default',
    system_migration: 'system migration',
  };

  const category = categoryLabels[params.category];
  const method = methodLabels[params.captureMethod];
  const role = params.capturedByRole;

  switch (params.changeType) {
    case 'initial_grant':
      return `Consent granted for ${category} via ${method} by ${role}${
        params.witnessName ? ` (witness: ${params.witnessName})` : ''
      }`;
    case 'withdrawal':
      return `Consent withdrawn for ${category} by ${role}`;
    case 'renewal':
      return `Consent renewed for ${category} via ${method} by ${role}`;
    case 'modification':
      return `Consent modified for ${category}: ${params.previousStatus} → ${params.newStatus} by ${role}`;
    case 'expiry':
      return `Consent expired for ${category}`;
    case 'correction':
      return `Consent record corrected for ${category} by ${role}`;
    case 'transfer':
      return `Consent transferred for ${category} by ${role}`;
    case 'restoration':
      return `Consent restored for ${category} by ${role}`;
    default:
      return `Consent updated for ${category} by ${role}`;
  }
}

// =============================================================================
// CONSENT CAPTURE FUNCTIONS
// =============================================================================

/**
 * Capture consent from admin manual entry
 */
export async function captureConsentFromAdmin(params: {
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  status: ConsentStatus;
  adminId: string;
  adminName: string;
  paperFormReference: string;
  notes?: string;
  effectiveFrom?: Date;
  expiresAt?: Date;
}): Promise<{ success: boolean; error?: string }> {
  return createConsentAuditEntry({
    consentRecordId: generateConsentRecordId(params.guardianId, params.studentId, params.category),
    guardianId: params.guardianId,
    studentId: params.studentId,
    category: params.category,
    previousStatus: null,
    newStatus: params.status,
    changeType: params.status === 'granted' ? 'initial_grant' : 'modification',
    captureMethod: 'admin_manual_entry',
    capturedBy: params.adminId,
    capturedByRole: 'admin',
    capturedByName: params.adminName,
    paperFormReference: params.paperFormReference,
    notes: params.notes,
    effectiveFrom: params.effectiveFrom || new Date(),
    expiresAt: params.expiresAt,
  });
}

/**
 * Capture consent from teacher confirmation
 */
export async function captureConsentFromTeacher(params: {
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  status: ConsentStatus;
  teacherId: string;
  teacherName: string;
  witnessName?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  return createConsentAuditEntry({
    consentRecordId: generateConsentRecordId(params.guardianId, params.studentId, params.category),
    guardianId: params.guardianId,
    studentId: params.studentId,
    category: params.category,
    previousStatus: null,
    newStatus: params.status,
    changeType: params.status === 'granted' ? 'initial_grant' : 'modification',
    captureMethod: 'teacher_confirmation',
    capturedBy: params.teacherId,
    capturedByRole: 'teacher',
    capturedByName: params.teacherName,
    witnessName: params.witnessName,
    notes: params.notes,
    effectiveFrom: new Date(),
  });
}

/**
 * Capture verbal consent with witness
 */
export async function captureVerbalConsent(params: {
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  status: ConsentStatus;
  recordedById: string;
  recordedByName: string;
  recordedByRole: 'admin' | 'teacher';
  witnessName: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  return createConsentAuditEntry({
    consentRecordId: generateConsentRecordId(params.guardianId, params.studentId, params.category),
    guardianId: params.guardianId,
    studentId: params.studentId,
    category: params.category,
    previousStatus: null,
    newStatus: params.status,
    changeType: params.status === 'granted' ? 'initial_grant' : 'modification',
    captureMethod: 'verbal_witnessed',
    capturedBy: params.recordedById,
    capturedByRole: params.recordedByRole,
    capturedByName: params.recordedByName,
    witnessName: params.witnessName,
    notes: params.notes,
    effectiveFrom: new Date(),
  });
}

/**
 * Record consent withdrawal
 */
export async function recordConsentWithdrawal(params: {
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  previousStatus: ConsentStatus;
  recordedById: string;
  recordedByName: string;
  recordedByRole: 'admin' | 'teacher';
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  return createConsentAuditEntry({
    consentRecordId: generateConsentRecordId(params.guardianId, params.studentId, params.category),
    guardianId: params.guardianId,
    studentId: params.studentId,
    category: params.category,
    previousStatus: params.previousStatus,
    newStatus: 'withdrawn',
    changeType: 'withdrawal',
    captureMethod: 'admin_manual_entry',
    capturedBy: params.recordedById,
    capturedByRole: params.recordedByRole,
    capturedByName: params.recordedByName,
    notes: params.reason,
    effectiveFrom: new Date(),
  });
}

/**
 * Record consent correction (admin only)
 */
export async function recordConsentCorrection(params: {
  guardianId: string;
  studentId: string;
  category: ConsentCategory;
  previousStatus: ConsentStatus;
  newStatus: ConsentStatus;
  adminId: string;
  adminName: string;
  correctionReason: string;
}): Promise<{ success: boolean; error?: string }> {
  return createConsentAuditEntry({
    consentRecordId: generateConsentRecordId(params.guardianId, params.studentId, params.category),
    guardianId: params.guardianId,
    studentId: params.studentId,
    category: params.category,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    changeType: 'correction',
    captureMethod: 'admin_manual_entry',
    capturedBy: params.adminId,
    capturedByRole: 'admin',
    capturedByName: params.adminName,
    notes: `CORRECTION: ${params.correctionReason}`,
    effectiveFrom: new Date(),
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate consistent consent record ID
 */
function generateConsentRecordId(
  guardianId: string,
  studentId: string,
  category: ConsentCategory
): string {
  return `consent_${guardianId}_${studentId}_${category}`;
}

/**
 * Get capture method from consent source
 */
export function sourceToCapatureMethod(source: ConsentSource): ConsentCaptureMethod {
  const mapping: Record<ConsentSource, ConsentCaptureMethod> = {
    paper_form: 'admin_manual_entry',
    verbal_teacher: 'teacher_confirmation',
    verbal_admin: 'verbal_witnessed',
    phone_call: 'phone_recorded',
    sms_reply: 'sms_opt_in',
    whatsapp_reply: 'whatsapp_opt_in',
    app_toggle: 'admin_manual_entry',
    inherited: 'enrollment_default',
    assumed_default: 'enrollment_default',
  };
  return mapping[source];
}

/**
 * Get role from consent source
 */
export function sourceToRole(source: ConsentSource): 'admin' | 'teacher' | 'system' {
  switch (source) {
    case 'verbal_teacher':
      return 'teacher';
    case 'inherited':
    case 'assumed_default':
      return 'system';
    default:
      return 'admin';
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate consent capture request
 */
export function validateConsentCapture(params: {
  category: ConsentCategory;
  captureMethod: ConsentCaptureMethod;
  witnessName?: string;
  paperFormReference?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verbal consent requires witness
  if (params.captureMethod === 'verbal_witnessed' && !params.witnessName?.trim()) {
    errors.push('Witness name is required for verbal consent');
  }

  // Paper-based requires form reference
  if (params.captureMethod === 'admin_manual_entry' && !params.paperFormReference?.trim()) {
    errors.push('Paper form reference is required for manual entry');
  }

  // Fee communications should be paper-based
  if (params.category === 'fee_communications' && 
      !['admin_manual_entry', 'enrollment_default'].includes(params.captureMethod)) {
    errors.push('Fee communications consent requires paper form or enrollment default');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export function getCaptureMethodDisplay(method: ConsentCaptureMethod): {
  label: string;
  icon: string;
  description: string;
} {
  const displays: Record<ConsentCaptureMethod, { label: string; icon: string; description: string }> = {
    admin_manual_entry: {
      label: 'Admin Entry',
      icon: 'clipboard-check',
      description: 'Entered by admin from paper form',
    },
    teacher_confirmation: {
      label: 'Teacher Confirmed',
      icon: 'user-check',
      description: 'Confirmed by teacher',
    },
    verbal_witnessed: {
      label: 'Verbal (Witnessed)',
      icon: 'users',
      description: 'Verbal consent with witness',
    },
    phone_recorded: {
      label: 'Phone Call',
      icon: 'phone',
      description: 'Recorded phone confirmation',
    },
    sms_opt_in: {
      label: 'SMS Opt-In',
      icon: 'message-square',
      description: 'SMS reply confirmation',
    },
    whatsapp_opt_in: {
      label: 'WhatsApp Opt-In',
      icon: 'message-circle',
      description: 'WhatsApp reply confirmation',
    },
    enrollment_default: {
      label: 'Enrollment Default',
      icon: 'file-text',
      description: 'Default from enrollment',
    },
    system_migration: {
      label: 'System Migration',
      icon: 'database',
      description: 'Migrated from legacy system',
    },
  };
  return displays[method];
}

export function getChangeTypeDisplay(type: ConsentChangeType): {
  label: string;
  color: string;
} {
  const displays: Record<ConsentChangeType, { label: string; color: string }> = {
    initial_grant: { label: 'Granted', color: 'green' },
    renewal: { label: 'Renewed', color: 'green' },
    withdrawal: { label: 'Withdrawn', color: 'red' },
    modification: { label: 'Modified', color: 'blue' },
    expiry: { label: 'Expired', color: 'yellow' },
    correction: { label: 'Corrected', color: 'orange' },
    transfer: { label: 'Transferred', color: 'purple' },
    restoration: { label: 'Restored', color: 'green' },
  };
  return displays[type];
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

export const CONSENT_AUDIT_SUMMARY = {
  overview: {
    description: 'Immutable audit trail for consent capture and changes',
    principles: [
      'All consent changes are logged with full context',
      'No deletion - only state changes',
      'Links to main audit_logs for compliance',
      'Supports paper-based and verbal consent',
    ],
  },
  captureSources: {
    admin_manual_entry: 'Admin enters from paper form with reference',
    teacher_confirmation: 'Teacher confirms parent consent',
    verbal_witnessed: 'Verbal consent with witness name required',
    phone_recorded: 'Phone call with recording reference',
    sms_opt_in: 'SMS reply opt-in with message ID',
    whatsapp_opt_in: 'WhatsApp reply with message ID',
    enrollment_default: 'Default from school enrollment',
  },
  auditFields: {
    who: 'capturedBy, capturedByRole, capturedByName',
    when: 'capturedAt, effectiveFrom, expiresAt',
    what: 'category, previousStatus, newStatus, changeType',
    how: 'captureMethod, witnessName, paperFormReference',
    link: 'auditLogId links to main audit trail',
  },
  immutability: {
    noDelete: 'Records cannot be deleted',
    correction: 'Errors corrected via new entry with correction type',
    hashChain: 'Entry hash for integrity verification',
  },
} as const;

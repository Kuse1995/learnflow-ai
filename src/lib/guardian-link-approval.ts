/**
 * Guardian Link Approval System
 * 
 * Manual-first approval flow for linking parents to students.
 * No self-service linking - admin or teacher must initiate.
 * 
 * FLOW:
 * ┌─────────────────┐
 * │  1. INITIATE    │ Admin/Teacher starts link request
 * │  - Select parent│ with identity verification
 * │  - Select child │
 * │  - Verify ID    │
 * └────────┬────────┘
 *          ▼
 * ┌─────────────────┐
 * │ 2. RELATIONSHIP │ Assign relationship type
 * │  - Primary      │ (determines default permissions)
 * │  - Secondary    │
 * │  - Informational│
 * └────────┬────────┘
 *          ▼
 * ┌─────────────────┐
 * │ 3. PERMISSIONS  │ Assign permission tier
 * │  - View only    │
 * │  - View + notify│
 * │  - Full access  │
 * └────────┬────────┘
 *          ▼
 * ┌─────────────────┐
 * │ 4. CONFIRMATION │ Optional parent confirmation
 * │  - SMS code     │ (48 hour expiry)
 * │  - WhatsApp code│
 * │  - Skip         │
 * └────────┬────────┘
 *          ▼
 * ┌─────────────────┐
 * │ 5. ACTIVATE     │ Link becomes active
 * │  - Create link  │
 * │  - Set perms    │
 * │  - Audit log    │
 * └─────────────────┘
 */

import type { ParentPermissionTier } from './parent-permissions';

export type LinkRequestStatus = 
  | 'pending_review'
  | 'pending_confirmation'
  | 'confirmed'
  | 'activated'
  | 'rejected'
  | 'expired'
  | 'revoked';

export type LinkDuration = 
  | 'permanent'
  | 'temporary_term'
  | 'temporary_year'
  | 'temporary_custom';

export type GuardianRole = 
  | 'primary_guardian'
  | 'secondary_guardian'
  | 'informational_contact';

export interface LinkRequest {
  id: string;
  guardianId: string;
  studentId: string;
  relationshipType: GuardianRole;
  permissionTier: ParentPermissionTier;
  durationType: LinkDuration;
  expiresAt: string | null;
  status: LinkRequestStatus;
  initiatedBy: string;
  initiatedByRole: string;
  schoolId: string;
  requiresParentConfirmation: boolean;
  confirmationMethod: string | null;
  confirmationSentAt: string | null;
  confirmationExpiresAt: string | null;
  confirmedAt: string | null;
  verificationNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  createdAt: string;
}

export interface LinkAuditEntry {
  id: string;
  linkRequestId: string;
  guardianId: string;
  studentId: string;
  action: string;
  previousStatus: LinkRequestStatus | null;
  newStatus: LinkRequestStatus | null;
  performedBy: string | null;
  performedByRole: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Status labels for UI display
 */
export const STATUS_LABELS: Record<LinkRequestStatus, {
  label: string;
  description: string;
  color: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  pending_review: {
    label: 'Pending Review',
    description: 'Awaiting admin or teacher review',
    color: 'secondary',
  },
  pending_confirmation: {
    label: 'Awaiting Confirmation',
    description: 'Confirmation sent to parent',
    color: 'secondary',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Parent has confirmed',
    color: 'default',
  },
  activated: {
    label: 'Active',
    description: 'Link is active',
    color: 'default',
  },
  rejected: {
    label: 'Rejected',
    description: 'Request was rejected',
    color: 'destructive',
  },
  expired: {
    label: 'Expired',
    description: 'Confirmation expired',
    color: 'outline',
  },
  revoked: {
    label: 'Revoked',
    description: 'Link was revoked',
    color: 'destructive',
  },
};

/**
 * Duration labels
 */
export const DURATION_LABELS: Record<LinkDuration, string> = {
  permanent: 'Permanent',
  temporary_term: 'Until end of term',
  temporary_year: 'Until end of year',
  temporary_custom: 'Custom date',
};

/**
 * Relationship type labels and descriptions
 */
export const RELATIONSHIP_LABELS: Record<GuardianRole, {
  label: string;
  description: string;
  defaultPermissions: ParentPermissionTier;
}> = {
  primary_guardian: {
    label: 'Primary Guardian',
    description: 'Main contact with full action rights',
    defaultPermissions: 'view_notifications',
  },
  secondary_guardian: {
    label: 'Secondary Guardian',
    description: 'Secondary contact with limited action rights',
    defaultPermissions: 'view_notifications',
  },
  informational_contact: {
    label: 'Informational Contact',
    description: 'View-only access, no action rights',
    defaultPermissions: 'view_only',
  },
};

/**
 * Safeguards for preventing wrong parent-child links
 */
export const LINK_SAFEGUARDS = {
  // Required verification before linking
  verificationRequired: true,
  
  // Verification methods
  verificationMethods: [
    'in_person_id_check',
    'phone_verification',
    'existing_records',
    'school_admin_override',
  ],
  
  // Prevent same guardian being linked twice
  preventDuplicateLinks: true,
  
  // Confirmation expiry (hours)
  confirmationExpiryHours: 48,
  
  // Maximum pending requests per guardian
  maxPendingRequestsPerGuardian: 5,
  
  // Audit all changes
  auditAllChanges: true,
};

/**
 * Audit action labels
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  initiated: 'Link request initiated',
  approved: 'Request approved',
  confirmed: 'Parent confirmed',
  activated: 'Link activated',
  rejected: 'Request rejected',
  expired: 'Confirmation expired',
  revoked: 'Link revoked',
};

/**
 * Check if a status allows editing
 */
export function canEditRequest(status: LinkRequestStatus): boolean {
  return status === 'pending_review';
}

/**
 * Check if a status can be approved
 */
export function canApproveRequest(status: LinkRequestStatus): boolean {
  return status === 'pending_review';
}

/**
 * Check if a link can be revoked
 */
export function canRevokeLink(status: LinkRequestStatus): boolean {
  return status === 'activated';
}

/**
 * Get available actions for a request based on status
 */
export function getAvailableActions(status: LinkRequestStatus): string[] {
  switch (status) {
    case 'pending_review':
      return ['approve', 'reject', 'edit'];
    case 'pending_confirmation':
      return ['resend_confirmation', 'cancel'];
    case 'activated':
      return ['revoke', 'edit_permissions'];
    case 'rejected':
    case 'expired':
    case 'revoked':
      return ['reinitiate'];
    default:
      return [];
  }
}

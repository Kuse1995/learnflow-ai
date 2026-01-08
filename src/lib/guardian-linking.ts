/**
 * Guardian-Student Linking System
 * 
 * RELATIONSHIP MODEL:
 * - One parent may have multiple children (one-to-many)
 * - One child may have multiple guardians (one-to-many) 
 * - Combined = many-to-many with role
 * 
 * GUARDIAN ROLES:
 * - Primary Guardian: Full rights (decisions, pickups, all communications)
 * - Secondary Guardian: Limited rights (communications, emergency contact)
 * - Informational Contact: No action rights (receive updates only)
 * 
 * IDENTITY:
 * - No biometric or national ID assumptions
 * - Identified by: phone number, name, or internal school ID
 * - Parent accounts are optional (can exist without login)
 */

import type { Database } from "@/integrations/supabase/types";

export type GuardianRole = Database["public"]["Enums"]["guardian_role"];

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

export interface Guardian {
  id: string;
  displayName: string;
  internalId?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  whatsappNumber?: string;
  userId?: string; // Optional linked user account
  hasAccount: boolean;
  preferredLanguage: string;
  notes?: string;
  schoolId: string;
}

export interface GuardianStudentLink {
  id: string;
  guardianId: string;
  studentId: string;
  role: GuardianRole;
  relationshipLabel?: string; // 'Mother', 'Father', 'Uncle', etc.
  
  // Rights
  canPickup: boolean;
  canMakeDecisions: boolean;
  canReceiveReports: boolean;
  canReceiveEmergency: boolean;
  receivesAllCommunications: boolean;
  
  // Priority (lower = higher priority)
  contactPriority: number;
  
  // Verification
  verifiedAt?: string;
  verifiedBy?: string;
  verificationMethod?: string;
}

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export interface RoleDefinition {
  role: GuardianRole;
  label: string;
  description: string;
  defaultRights: {
    canPickup: boolean;
    canMakeDecisions: boolean;
    canReceiveReports: boolean;
    canReceiveEmergency: boolean;
    receivesAllCommunications: boolean;
  };
  contactPriority: number;
}

export const GUARDIAN_ROLES: Record<GuardianRole, RoleDefinition> = {
  primary_guardian: {
    role: "primary_guardian",
    label: "Primary Guardian",
    description: "Full rights including decisions, pickups, and all communications",
    defaultRights: {
      canPickup: true,
      canMakeDecisions: true,
      canReceiveReports: true,
      canReceiveEmergency: true,
      receivesAllCommunications: true,
    },
    contactPriority: 1,
  },
  secondary_guardian: {
    role: "secondary_guardian",
    label: "Secondary Guardian",
    description: "Limited rights including communications and emergency contact",
    defaultRights: {
      canPickup: false,
      canMakeDecisions: false,
      canReceiveReports: true,
      canReceiveEmergency: true,
      receivesAllCommunications: true,
    },
    contactPriority: 2,
  },
  informational_contact: {
    role: "informational_contact",
    label: "Informational Contact",
    description: "Receive updates only - no action rights",
    defaultRights: {
      canPickup: false, // NEVER
      canMakeDecisions: false, // NEVER
      canReceiveReports: true,
      canReceiveEmergency: false,
      receivesAllCommunications: false,
    },
    contactPriority: 99,
  },
};

// Common relationship labels
export const RELATIONSHIP_LABELS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Guardian",
  "Foster Parent",
  "Stepmother",
  "Stepfather",
  "Sibling",
  "Other Family",
  "Family Friend",
  "Caregiver",
] as const;

// ============================================================================
// RELATIONSHIP RULES
// ============================================================================

export const RELATIONSHIP_RULES = {
  // Maximum guardians per student
  maxGuardiansPerStudent: 10,
  
  // Required roles
  requirePrimaryGuardian: true,
  maxPrimaryGuardians: 2,
  
  // Rights that can NEVER be granted to informational contacts
  informationalRestrictions: {
    canPickup: false,
    canMakeDecisions: false,
  },
  
  // Account requirements
  accountRequirements: {
    primaryGuardian: false, // Account optional even for primary
    secondaryGuardian: false,
    informationalContact: false,
  },
  
  // Who can create/modify links
  linkPermissions: {
    create: ["school_admin", "teacher"],
    modify: ["school_admin"],
    delete: ["school_admin"],
    verify: ["school_admin"],
  },
  
  // Verification requirements
  verificationRequired: {
    primaryGuardian: true, // Should be verified
    secondaryGuardian: false,
    informationalContact: false,
  },
} as const;

// ============================================================================
// EDGE CASES: SHARED PHONE NUMBERS
// ============================================================================

export interface SharedPhoneInfo {
  phoneNumber: string;
  guardianIds: string[];
  guardianNames: string[];
  isShared: boolean;
}

/**
 * Rules for handling shared phone numbers:
 * 
 * 1. Phone numbers are NOT unique - multiple guardians can share
 * 2. When sending messages, check for shared phones
 * 3. If shared, ensure message is relevant to ALL guardians on that phone
 * 4. Display warning to admin when shared phone detected
 * 5. Allow but flag during guardian creation
 */
export const SHARED_PHONE_RULES = {
  // Allow shared phones (don't block)
  allowSharedPhones: true,
  
  // Warn when creating guardian with existing phone
  warnOnSharedPhone: true,
  
  // Require explicit confirmation for shared phones
  requireConfirmation: true,
  
  // Message handling for shared phones
  messageHandling: {
    // Combine messages if multiple children use same phone
    combineMessages: true,
    // Add context about which child message is for
    includeChildContext: true,
    // Max messages per day to shared phone
    maxMessagesPerDay: 5,
  },
} as const;

// ============================================================================
// EDGE CASES: DUPLICATE DETECTION
// ============================================================================

export interface DuplicateGuardianCheck {
  matchType: "exact_phone" | "similar_name" | "same_email" | "internal_id";
  confidence: "high" | "medium" | "low";
  existingGuardianId: string;
  existingGuardianName: string;
  reason: string;
}

/**
 * Duplicate detection rules:
 * 
 * 1. Same internal ID = definite duplicate
 * 2. Same phone + similar name = likely duplicate
 * 3. Same email = likely duplicate
 * 4. Same name + same school = possible duplicate (warn only)
 */
export const DUPLICATE_DETECTION_RULES = {
  // Match by internal ID (definite duplicate)
  checkInternalId: true,
  
  // Match by phone number
  checkPhone: true,
  phoneMustMatchName: true, // Require name similarity for phone match
  
  // Match by email
  checkEmail: true,
  
  // Name similarity threshold (0-1)
  nameSimilarityThreshold: 0.8,
  
  // Actions for duplicates
  actions: {
    definite: "block_and_suggest_link", // Use existing guardian
    likely: "warn_and_allow", // Show warning but allow
    possible: "note_only", // Just add note to record
  },
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate guardian role rights
 */
export function validateRoleRights(
  role: GuardianRole,
  rights: Partial<GuardianStudentLink>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Informational contacts have hard restrictions
  if (role === "informational_contact") {
    if (rights.canPickup === true) {
      errors.push("Informational contacts cannot have pickup rights");
    }
    if (rights.canMakeDecisions === true) {
      errors.push("Informational contacts cannot have decision-making rights");
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if guardian can be linked to student
 */
export function canLinkGuardian(
  existingLinks: GuardianStudentLink[],
  newRole: GuardianRole
): { allowed: boolean; reason?: string } {
  // Check max guardians
  if (existingLinks.length >= RELATIONSHIP_RULES.maxGuardiansPerStudent) {
    return { allowed: false, reason: "Maximum number of guardians reached" };
  }
  
  // Check max primary guardians
  if (newRole === "primary_guardian") {
    const existingPrimary = existingLinks.filter(l => l.role === "primary_guardian");
    if (existingPrimary.length >= RELATIONSHIP_RULES.maxPrimaryGuardians) {
      return { allowed: false, reason: "Maximum primary guardians already assigned" };
    }
  }
  
  return { allowed: true };
}

/**
 * Get contact priority list for a student
 */
export function getContactPriority(links: GuardianStudentLink[]): GuardianStudentLink[] {
  return [...links].sort((a, b) => {
    // First by contact priority
    if (a.contactPriority !== b.contactPriority) {
      return a.contactPriority - b.contactPriority;
    }
    // Then by role (primary > secondary > informational)
    const roleOrder: Record<GuardianRole, number> = {
      primary_guardian: 1,
      secondary_guardian: 2,
      informational_contact: 3,
    };
    return roleOrder[a.role] - roleOrder[b.role];
  });
}

/**
 * Filter guardians who can receive a specific type of communication
 */
export function getGuardiansForCommunication(
  links: GuardianStudentLink[],
  communicationType: "emergency" | "report" | "general"
): GuardianStudentLink[] {
  return links.filter(link => {
    switch (communicationType) {
      case "emergency":
        return link.canReceiveEmergency;
      case "report":
        return link.canReceiveReports;
      case "general":
        return link.receivesAllCommunications;
      default:
        return false;
    }
  });
}

/**
 * CENTRAL SAFETY VALIDATOR
 * 
 * Unified safety validation for all AI-generated content.
 * This module orchestrates language validation, rate limiting, and audit logging.
 */

import {
  validateLanguageSafety,
  validateObjectLanguageSafety,
  logLanguageViolation,
  getLanguageViolationFallback,
} from "./language-validator";
import { checkRateLimit, type RateLimitCheckResult } from "./rate-limit-guard";
import { FALLBACK_COPY, SAFETY_DISCLAIMERS } from "./safety-constants";

export interface SafetyValidationResult {
  isValid: boolean;
  content: unknown;
  fallbackUsed: boolean;
  fallbackMessage?: string;
  violations?: string[];
}

/**
 * Validate AI-generated content for safety
 * Returns sanitized content or fallback if violations detected
 */
export function validateAIContent<T>(
  content: T,
  featureType: string,
  options?: {
    studentIdHash?: string;
    teacherId?: string;
    retryCount?: number;
  }
): SafetyValidationResult {
  const { studentIdHash, teacherId, retryCount = 0 } = options || {};

  // Validate object for banned language
  const validation = validateObjectLanguageSafety(content);

  if (!validation.isValid) {
    // Log violation internally
    logLanguageViolation(
      featureType,
      validation.allViolations.map((v) => v.term),
      studentIdHash,
      teacherId
    );

    // If this is a retry and still failing, return fallback
    if (retryCount > 0) {
      return {
        isValid: false,
        content: null,
        fallbackUsed: true,
        fallbackMessage: getLanguageViolationFallback(),
        violations: validation.allViolations.map((v) => v.term),
      };
    }

    // First violation - return for retry
    return {
      isValid: false,
      content: null,
      fallbackUsed: false,
      violations: validation.allViolations.map((v) => v.term),
    };
  }

  return {
    isValid: true,
    content,
    fallbackUsed: false,
  };
}

/**
 * Validate string content for safety
 */
export function validateStringContent(
  content: string,
  featureType: string
): SafetyValidationResult {
  const validation = validateLanguageSafety(content);

  if (!validation.isValid) {
    logLanguageViolation(featureType, validation.violations);

    return {
      isValid: false,
      content: null,
      fallbackUsed: true,
      fallbackMessage: getLanguageViolationFallback(),
      violations: validation.violations,
    };
  }

  return {
    isValid: true,
    content,
    fallbackUsed: false,
  };
}

/**
 * Check if generation is allowed (rate limiting)
 */
export async function checkGenerationAllowed(
  featureType: string,
  studentId: string,
  classId: string
): Promise<RateLimitCheckResult> {
  return checkRateLimit(featureType, studentId, classId);
}

/**
 * Get appropriate disclaimer for a feature
 */
export function getFeatureDisclaimer(
  featureType: string,
  audience: "teacher" | "parent" | "student" = "teacher"
): string {
  switch (audience) {
    case "parent":
      return SAFETY_DISCLAIMERS.PARENT_APPROVED;
    case "student":
      return SAFETY_DISCLAIMERS.TEACHER_GUIDANCE;
    case "teacher":
    default:
      if (featureType === "parent_insight") {
        return SAFETY_DISCLAIMERS.PARENT_APPROVED;
      }
      return SAFETY_DISCLAIMERS.TEACHER_GUIDANCE;
  }
}

/**
 * Get fallback message for service unavailability
 */
export function getServiceUnavailableMessage(): string {
  return FALLBACK_COPY.SERVICE_UNAVAILABLE;
}

/**
 * Get fallback message for generation failure
 */
export function getGenerationFailedMessage(): string {
  return FALLBACK_COPY.GENERATION_FAILED;
}

/**
 * Log AI generation event for audit (internal only)
 */
export function logAIGeneration(event: {
  featureType: string;
  studentId: string;
  classId: string;
  teacherId?: string;
  success: boolean;
  acknowledged?: boolean;
}): void {
  // Internal audit logging - never exposed to UI
  console.info("[AUDIT] AI Generation", {
    timestamp: new Date().toISOString(),
    featureType: event.featureType,
    studentIdHash: hashForAudit(event.studentId),
    classId: event.classId,
    teacherId: event.teacherId,
    success: event.success,
    acknowledged: event.acknowledged,
  });
}

/**
 * Hash ID for audit logging (anonymization)
 */
function hashForAudit(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `aud_${Math.abs(hash).toString(16)}`;
}

// Re-export commonly used items
export { SAFETY_DISCLAIMERS, FALLBACK_COPY } from "./safety-constants";
export type { RateLimitCheckResult } from "./rate-limit-guard";

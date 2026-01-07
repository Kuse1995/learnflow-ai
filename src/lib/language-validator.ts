/**
 * LANGUAGE SAFETY VALIDATOR
 * 
 * Validates AI-generated content against banned terms.
 * This is a HARD SAFETY LAYER - violations must be caught and handled.
 */

import { BANNED_TERMS, FALLBACK_COPY } from "./safety-constants";

export interface LanguageValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedContent: string | null;
}

/**
 * Check if text contains any banned terms (case-insensitive)
 */
export function containsBannedTerms(text: string): string[] {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  const violations: string[] = [];
  
  for (const term of BANNED_TERMS) {
    // Use word boundary matching to avoid false positives
    // e.g., "weakness" shouldn't match if "weak" is banned, but "weak student" should
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
    if (regex.test(lowerText)) {
      violations.push(term);
    }
  }
  
  return violations;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate AI-generated content for language safety
 */
export function validateLanguageSafety(content: string): LanguageValidationResult {
  const violations = containsBannedTerms(content);
  
  return {
    isValid: violations.length === 0,
    violations,
    sanitizedContent: violations.length === 0 ? content : null,
  };
}

/**
 * Validate an object's string fields recursively
 */
export function validateObjectLanguageSafety(
  obj: unknown,
  path: string = ""
): { isValid: boolean; allViolations: Array<{ path: string; term: string }> } {
  const allViolations: Array<{ path: string; term: string }> = [];
  
  function traverse(value: unknown, currentPath: string) {
    if (typeof value === "string") {
      const violations = containsBannedTerms(value);
      for (const term of violations) {
        allViolations.push({ path: currentPath, term });
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        traverse(item, `${currentPath}[${index}]`);
      });
    } else if (value !== null && typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        traverse(val, currentPath ? `${currentPath}.${key}` : key);
      }
    }
  }
  
  traverse(obj, path);
  
  return {
    isValid: allViolations.length === 0,
    allViolations,
  };
}

/**
 * Get fallback content when language validation fails
 */
export function getLanguageViolationFallback(): string {
  return FALLBACK_COPY.LANGUAGE_VIOLATION;
}

/**
 * Log language violation internally (for audit purposes)
 * In production, this would log to a secure audit system
 */
export function logLanguageViolation(
  featureType: string,
  violations: string[],
  studentIdHash?: string,
  teacherId?: string
): void {
  // Internal logging only - never exposed to UI
  console.warn("[SAFETY] Language violation detected", {
    timestamp: new Date().toISOString(),
    featureType,
    violationCount: violations.length,
    violations: violations.slice(0, 5), // Log first 5 only
    studentIdHash: studentIdHash ? hashString(studentIdHash) : undefined,
    teacherId,
  });
}

/**
 * Simple hash function for student ID anonymization in logs
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

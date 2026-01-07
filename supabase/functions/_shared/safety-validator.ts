/**
 * EDGE FUNCTION SAFETY VALIDATOR
 * 
 * Server-side language validation for AI-generated content.
 * This is a HARD SAFETY LAYER for edge functions.
 */

// Banned terms that must never appear in AI output
const BANNED_TERMS = [
  // Deficit language
  "weak", "struggling", "poor", "failing", "failed", "failure",
  "deficit", "deficient", "risk", "at-risk", "at risk",
  "concern", "concerning", "worried", "problematic",
  
  // Ability labels
  "low ability", "high ability", "low-ability", "high-ability",
  "below average", "above average", "below-average", "above-average",
  "underperforming", "underachiever", "overachiever", "gifted",
  "remedial", "slow learner", "fast learner", "slow-learner", "fast-learner",
  
  // Comparison language
  "behind", "ahead", "worst", "best", "lowest", "highest",
  "bottom", "top", "rank", "ranking", "percentile",
  
  // Behavioral judgment
  "lazy", "unmotivated", "disruptive", "troublesome", "difficult",
  
  // Intelligence inference
  "intelligence", "iq", "smart", "dumb", "stupid", "brilliant", "genius",
];

const FALLBACK_MESSAGE = "Learning observations are currently being refined. Please check back later.";

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if text contains any banned terms
 */
export function containsBannedTerms(text: string): string[] {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  const violations: string[] = [];
  
  for (const term of BANNED_TERMS) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
    if (regex.test(lowerText)) {
      violations.push(term);
    }
  }
  
  return violations;
}

/**
 * Validate an object's string fields recursively
 */
export function validateObjectLanguage(obj: unknown): {
  isValid: boolean;
  violations: string[];
} {
  const allViolations: string[] = [];
  
  function traverse(value: unknown) {
    if (typeof value === "string") {
      const violations = containsBannedTerms(value);
      allViolations.push(...violations);
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (value !== null && typeof value === "object") {
      Object.values(value).forEach(traverse);
    }
  }
  
  traverse(obj);
  
  // Deduplicate violations
  const uniqueViolations = [...new Set(allViolations)];
  
  return {
    isValid: uniqueViolations.length === 0,
    violations: uniqueViolations,
  };
}

/**
 * Get fallback message for language violation
 */
export function getLanguageViolationFallback(): string {
  return FALLBACK_MESSAGE;
}

/**
 * Log language violation (internal audit)
 */
export function logLanguageViolation(
  featureType: string,
  violations: string[],
  studentId?: string
): void {
  console.warn("[SAFETY] Language violation detected", {
    timestamp: new Date().toISOString(),
    featureType,
    violationCount: violations.length,
    violations: violations.slice(0, 5),
    studentIdHash: studentId ? hashString(studentId) : undefined,
  });
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

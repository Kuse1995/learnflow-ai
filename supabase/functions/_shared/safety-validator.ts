/**
 * EDGE FUNCTION SAFETY VALIDATOR
 * 
 * Server-side language validation for AI-generated content.
 * This is a HARD SAFETY LAYER for edge functions.
 */

// CORS headers for all edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
const DEMO_PLACEHOLDER_MESSAGE = "Not enough demo data yet";

/**
 * Check if the system is in demo mode by checking the request or environment
 * DEMO MODE GLOBALLY DISABLED - Always returns false to treat all data as real
 * To re-enable: return !Deno.env.get("LOVABLE_API_KEY");
 */
export function isDemoMode(): boolean {
  return false;
}

/**
 * Create a demo-safe response for when data is missing
 */
export function createDemoPlaceholderResponse(
  data: Record<string, unknown> = {},
  message: string = DEMO_PLACEHOLDER_MESSAGE
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      isDemoPlaceholder: true,
      message,
      ...data,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create a demo-safe error response (always returns 200)
 * Logs the error internally but returns a safe placeholder to the client
 */
export function createDemoSafeErrorResponse(
  error: unknown,
  fallbackData: Record<string, unknown> = {},
  context: string = "edge-function"
): Response {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error(`[${context}] Demo-safe error:`, errorMessage);
  
  return new Response(
    JSON.stringify({
      success: true,
      isDemoPlaceholder: true,
      message: DEMO_PLACEHOLDER_MESSAGE,
      ...fallbackData,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Wrap error handling for demo mode - never returns non-2xx
 */
export function wrapDemoSafe<T>(
  fn: () => Promise<Response>,
  fallbackData: Record<string, unknown> = {},
  context: string = "edge-function"
): Promise<Response> {
  return fn().catch((error) => {
    return createDemoSafeErrorResponse(error, fallbackData, context);
  });
}

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

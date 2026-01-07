/**
 * Input Sanitization & Validation
 * Prevents prompt injection and malicious inputs
 */

import { z } from "zod";

// Dangerous patterns for AI prompt injection
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /disregard\s+(previous|above|all)/i,
  /forget\s+(everything|what|previous)/i,
  /new\s+instructions?:\s*/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\[\[.*\]\]/,
  /<\|.*\|>/,
  /\{\{.*\}\}/,
  /```\s*(system|assistant|user)/i,
  /role\s*:\s*(system|assistant)/i,
];

// PII patterns to detect and optionally mask
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  blockedPatterns: string[];
  piiDetected: boolean;
}

/**
 * Sanitize user input for AI prompts
 */
export function sanitizeForAI(input: string): SanitizationResult {
  let sanitized = input.trim();
  const blockedPatterns: string[] = [];
  let wasModified = false;

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      blockedPatterns.push(pattern.source);
      sanitized = sanitized.replace(pattern, "[BLOCKED]");
      wasModified = true;
    }
  }

  // Remove control characters
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (controlCharPattern.test(sanitized)) {
    sanitized = sanitized.replace(controlCharPattern, "");
    wasModified = true;
  }

  // Detect PII (but don't modify - just flag)
  const piiDetected = Object.values(PII_PATTERNS).some((pattern) =>
    pattern.test(input)
  );

  return {
    sanitized,
    wasModified,
    blockedPatterns,
    piiDetected,
  };
}

/**
 * Mask PII in text for logging/display
 */
export function maskPII(input: string): string {
  let masked = input;

  // Mask emails
  masked = masked.replace(PII_PATTERNS.email, "[EMAIL]");

  // Mask phone numbers
  masked = masked.replace(PII_PATTERNS.phone, "[PHONE]");

  // Mask SSN
  masked = masked.replace(PII_PATTERNS.ssn, "[SSN]");

  // Mask credit cards
  masked = masked.replace(PII_PATTERNS.creditCard, "[CARD]");

  return masked;
}

/**
 * Hash input for abuse tracking (non-reversible)
 */
export function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `inp_${Math.abs(hash).toString(16)}`;
}

// Zod schemas for common inputs
export const studentNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[\p{L}\p{M}\s\-'.]+$/u, "Name contains invalid characters");

export const topicSchema = z
  .string()
  .trim()
  .min(1, "Topic is required")
  .max(200, "Topic must be less than 200 characters");

export const notesSchema = z
  .string()
  .trim()
  .max(2000, "Notes must be less than 2000 characters")
  .optional();

export const classIdSchema = z.string().uuid("Invalid class ID");

export const studentIdSchema = z.string().uuid("Invalid student ID");

/**
 * Check if input contains potential injection attempts
 */
export function hasInjectionAttempt(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Validate and sanitize form data
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((e) => e.message);
  return { success: false, errors };
}

/**
 * Friendly error messages (no technical details exposed)
 */
export const FRIENDLY_ERRORS = {
  NETWORK: "Unable to connect. Please check your internet and try again.",
  SERVER: "Something went wrong on our end. Please try again in a moment.",
  VALIDATION: "Please check your input and try again.",
  PERMISSION: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item could not be found.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  GENERIC: "Something unexpected happened. Please try again.",
} as const;

/**
 * Convert technical errors to user-friendly messages
 */
export function getFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("network") || msg.includes("fetch")) {
      return FRIENDLY_ERRORS.NETWORK;
    }
    if (msg.includes("permission") || msg.includes("unauthorized") || msg.includes("forbidden")) {
      return FRIENDLY_ERRORS.PERMISSION;
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return FRIENDLY_ERRORS.NOT_FOUND;
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return FRIENDLY_ERRORS.RATE_LIMIT;
    }
    if (msg.includes("expired") || msg.includes("invalid token")) {
      return FRIENDLY_ERRORS.SESSION_EXPIRED;
    }
    if (msg.includes("validation") || msg.includes("invalid")) {
      return FRIENDLY_ERRORS.VALIDATION;
    }
  }

  return FRIENDLY_ERRORS.GENERIC;
}

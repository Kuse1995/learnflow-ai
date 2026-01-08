/**
 * Zambia Communication Guardrails Hooks
 * 
 * Provides hooks for validating and enforcing communication guardrails
 */

import { useMemo, useCallback } from 'react';
import {
  validateMessageContent,
  parentMessageSchema,
  attendanceNotificationSchema,
  learningUpdateSchema,
  sanitizeStudentDataForParent,
  shouldIncludeField,
  COMPLIANCE_PRINCIPLES,
  FORBIDDEN_CONTENT,
  SAFE_ALTERNATIVES,
  getViolationDisplay,
  getPrincipleDisplay,
  type ContentValidationResult,
  type ContentViolation,
} from '@/lib/zambia-communication-guardrails';

// =============================================================================
// CONTENT VALIDATION HOOKS
// =============================================================================

/**
 * Validate message content in real-time
 */
export function useContentValidation(content: string) {
  return useMemo(() => {
    if (!content.trim()) {
      return {
        isValid: true,
        violations: [],
        severity: 'none' as const,
        suggestions: [],
      };
    }
    return validateMessageContent(content);
  }, [content]);
}

/**
 * Get validation status for form fields
 */
export function useMessageFormValidation() {
  const validateSubject = useCallback((subject: string): ContentValidationResult => {
    return validateMessageContent(subject);
  }, []);

  const validateBody = useCallback((body: string): ContentValidationResult => {
    return validateMessageContent(body);
  }, []);

  const validateFullMessage = useCallback((subject: string, body: string): {
    isValid: boolean;
    subjectResult: ContentValidationResult;
    bodyResult: ContentValidationResult;
    allViolations: ContentViolation[];
    allSuggestions: string[];
  } => {
    const subjectResult = validateMessageContent(subject);
    const bodyResult = validateMessageContent(body);

    return {
      isValid: subjectResult.isValid && bodyResult.isValid,
      subjectResult,
      bodyResult,
      allViolations: [...subjectResult.violations, ...bodyResult.violations],
      allSuggestions: [...new Set([...subjectResult.suggestions, ...bodyResult.suggestions])],
    };
  }, []);

  return { validateSubject, validateBody, validateFullMessage };
}

/**
 * Schema validation for different message types
 */
export function useSchemaValidation() {
  const validateParentMessage = useCallback((data: unknown) => {
    return parentMessageSchema.safeParse(data);
  }, []);

  const validateAttendanceNotification = useCallback((data: unknown) => {
    return attendanceNotificationSchema.safeParse(data);
  }, []);

  const validateLearningUpdate = useCallback((data: unknown) => {
    return learningUpdateSchema.safeParse(data);
  }, []);

  return {
    validateParentMessage,
    validateAttendanceNotification,
    validateLearningUpdate,
  };
}

// =============================================================================
// SAFE ALTERNATIVES HOOKS
// =============================================================================

/**
 * Get safe alternatives for detected violations
 */
export function useSafeAlternatives(violations: ContentViolation[]) {
  return useMemo(() => {
    return violations.map(v => {
      const lowerText = v.matchedText.toLowerCase();
      
      for (const [forbidden, safe] of Object.entries(SAFE_ALTERNATIVES)) {
        if (lowerText.includes(forbidden.toLowerCase())) {
          return {
            violation: v,
            original: v.matchedText,
            suggested: safe,
          };
        }
      }
      
      return {
        violation: v,
        original: v.matchedText,
        suggested: null,
      };
    });
  }, [violations]);
}

/**
 * Auto-correct content using safe alternatives
 */
export function useAutoCorrect() {
  return useCallback((content: string): {
    corrected: string;
    changesApplied: number;
    changes: Array<{ from: string; to: string }>;
  } => {
    let corrected = content;
    const changes: Array<{ from: string; to: string }> = [];

    for (const [forbidden, safe] of Object.entries(SAFE_ALTERNATIVES)) {
      const regex = new RegExp(forbidden, 'gi');
      if (regex.test(corrected)) {
        changes.push({ from: forbidden, to: safe });
        corrected = corrected.replace(regex, safe);
      }
    }

    return {
      corrected,
      changesApplied: changes.length,
      changes,
    };
  }, []);
}

// =============================================================================
// DATA MINIMIZATION HOOKS
// =============================================================================

/**
 * Sanitize student data for parent messages
 */
export function useSanitizeStudentData() {
  return useCallback((student: {
    id: string;
    firstName: string;
    lastName: string;
    classId?: string;
    dateOfBirth?: string;
  }) => {
    return sanitizeStudentDataForParent(student);
  }, []);
}

/**
 * Check which fields can be included in a message type
 */
export function useAllowedFields(messageCategory: string) {
  return useMemo(() => {
    const commonFields = ['firstName'];
    const categoryFields: Record<string, string[]> = {
      attendance_notice: [...commonFields, 'date', 'status'],
      learning_update: [...commonFields, 'subject', 'topic'],
      school_announcement: [...commonFields],
      emergency_notice: [...commonFields, 'emergencyType', 'instructions'],
      fee_status: [...commonFields, 'balanceStatus'],
    };

    return {
      allowed: categoryFields[messageCategory] || commonFields,
      checkField: (field: string) => shouldIncludeField(field, messageCategory),
    };
  }, [messageCategory]);
}

// =============================================================================
// DISPLAY HOOKS
// =============================================================================

/**
 * Get formatted violation info for UI display
 */
export function useViolationDisplay(violations: ContentViolation[]) {
  return useMemo(() => {
    return violations.map(v => ({
      ...v,
      display: getViolationDisplay(v),
      principleDisplay: getPrincipleDisplay(v.principle),
    }));
  }, [violations]);
}

/**
 * Get compliance principles documentation
 */
export function useCompliancePrinciples() {
  return useMemo(() => {
    return Object.entries(COMPLIANCE_PRINCIPLES).map(([key, value]) => ({
      key: key as keyof typeof COMPLIANCE_PRINCIPLES,
      ...value,
      display: getPrincipleDisplay(key as keyof typeof COMPLIANCE_PRINCIPLES),
    }));
  }, []);
}

/**
 * Get forbidden content patterns for documentation
 */
export function useForbiddenPatterns() {
  return useMemo(() => {
    return Object.entries(FORBIDDEN_CONTENT).map(([type, patterns]) => ({
      type,
      patternCount: patterns.length,
      display: getViolationDisplay({ type } as ContentViolation),
    }));
  }, []);
}

// =============================================================================
// REAL-TIME FEEDBACK HOOK
// =============================================================================

/**
 * Provides real-time feedback as user types
 */
export function useRealTimeFeedback(
  content: string,
  options: {
    debounceMs?: number;
    showWarnings?: boolean;
  } = {}
) {
  const validation = useContentValidation(content);
  const alternatives = useSafeAlternatives(validation.violations);
  const violationDisplays = useViolationDisplay(validation.violations);

  return useMemo(() => {
    const warnings = validation.violations.filter(v => v.severity === 'warning');
    const blockers = validation.violations.filter(v => v.severity === 'blocked');

    return {
      isValid: validation.isValid,
      severity: validation.severity,
      hasWarnings: warnings.length > 0,
      hasBlockers: blockers.length > 0,
      warningCount: warnings.length,
      blockerCount: blockers.length,
      violations: violationDisplays,
      alternatives,
      suggestions: validation.suggestions,
      // Summary for UI
      statusMessage: getStatusMessage(validation),
      statusColor: getStatusColor(validation.severity),
    };
  }, [validation, alternatives, violationDisplays]);
}

function getStatusMessage(result: ContentValidationResult): string {
  if (result.severity === 'blocked') {
    const count = result.violations.filter(v => v.severity === 'blocked').length;
    return `${count} issue${count > 1 ? 's' : ''} must be fixed before sending`;
  }
  if (result.severity === 'warning') {
    const count = result.violations.length;
    return `${count} suggestion${count > 1 ? 's' : ''} for improvement`;
  }
  return 'Content meets guidelines';
}

function getStatusColor(severity: ContentValidationResult['severity']): string {
  switch (severity) {
    case 'blocked': return 'destructive';
    case 'warning': return 'yellow';
    default: return 'green';
  }
}

// =============================================================================
// GUARDRAILS DOCUMENTATION HOOK
// =============================================================================

/**
 * Get complete guardrails documentation for help/training
 */
export function useGuardrailsDocumentation() {
  const principles = useCompliancePrinciples();
  const forbiddenPatterns = useForbiddenPatterns();

  return useMemo(() => ({
    principles,
    forbiddenPatterns,
    safeAlternatives: Object.entries(SAFE_ALTERNATIVES).map(([from, to]) => ({
      forbidden: from,
      safe: to,
    })),
    quickReference: [
      { do: 'Use first name only', dont: 'Include full name or ID' },
      { do: 'Say "working on"', dont: 'Say "struggling with"' },
      { do: 'Focus on growth', dont: 'Compare to other students' },
      { do: 'State facts neutrally', dont: 'Use judgmental language' },
      { do: 'Offer specific support tips', dont: 'Give generic advice' },
    ],
  }), [principles, forbiddenPatterns]);
}

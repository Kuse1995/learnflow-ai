/**
 * Zambia Parent Communication Guardrails
 * 
 * Legal and ethical constraints for parent communication
 * aligned with Zambian context and child protection principles.
 * 
 * Principles:
 * - Minimal data usage
 * - Purpose limitation
 * - Child dignity
 * - Parent respect
 */

import { z } from 'zod';

// =============================================================================
// COMPLIANCE PRINCIPLES
// =============================================================================

export const COMPLIANCE_PRINCIPLES = {
  minimalData: {
    principle: 'Minimal Data Usage',
    description: 'Only collect and share data necessary for educational purpose',
    rules: [
      'Never include full student ID numbers in messages',
      'Use first name only in automated messages',
      'Exclude medical information unless emergency',
      'No home address details in messages',
      'Exclude financial details beyond basic fee status',
    ],
  },
  purposeLimitation: {
    principle: 'Purpose Limitation',
    description: 'Data used only for stated educational communication purpose',
    rules: [
      'Attendance data used only for attendance notices',
      'Learning data used only for progress updates',
      'Contact data used only for school communication',
      'No data sharing with third parties',
      'No marketing or promotional content',
    ],
  },
  childDignity: {
    principle: 'Child Dignity',
    description: 'All communication preserves child dignity and self-worth',
    rules: [
      'No comparative language (better/worse than others)',
      'No negative labels (slow, struggling, failing)',
      'No public disclosure of performance',
      'Focus on growth, not deficits',
      'Celebrate effort, not just results',
    ],
  },
  parentRespect: {
    principle: 'Parent Respect',
    description: 'Communication respects parent circumstances and autonomy',
    rules: [
      'No judgmental language about parenting',
      'No assumptions about home environment',
      'Respect quiet hours and preferences',
      'Provide opt-out for non-essential categories',
      'Use accessible, non-technical language',
    ],
  },
} as const;

// =============================================================================
// FORBIDDEN CONTENT PATTERNS
// =============================================================================

/**
 * Content that must NEVER appear in parent messages
 */
export const FORBIDDEN_CONTENT = {
  // Performance rankings and comparisons
  rankingPatterns: [
    /\b(ranked?|ranking|position)\s*(in|among|out of)/i,
    /\b(top|bottom)\s*\d+/i,
    /\b(best|worst)\s*(student|performer|in class)/i,
    /\b(better|worse)\s*than\s*(other|most|many)/i,
    /\b(ahead|behind)\s*(of|the)\s*(class|others|peers)/i,
    /\b(\d+)(st|nd|rd|th)\s*(place|position|out of)/i,
    /\bclass\s*average/i,
    /\bpercentile/i,
  ],

  // Negative labels
  negativeLabels: [
    /\b(slow|slower)\s*(learner|student|child)/i,
    /\b(struggling|struggles)\s*(with|in|to)/i,
    /\bfailing\b/i,
    /\bfailed\b/i,
    /\b(poor|weak)\s*(performance|student|work)/i,
    /\b(low|lower)\s*(performer|achieving)/i,
    /\b(behind|lagging)\s*(in|on)/i,
    /\bunderperforming/i,
    /\b(needs|requires)\s*(remedial|extra help)/i,
    /\b(learning\s*)?(disability|disorder|problem)/i,
  ],

  // Disciplinary language
  disciplinaryLanguage: [
    /\b(punish|punishment|punished)/i,
    /\b(suspend|suspension|suspended)/i,
    /\b(expel|expulsion|expelled)/i,
    /\b(detention)/i,
    /\b(bad|naughty)\s*(behavior|behaviour|child)/i,
    /\b(troublemaker|problem\s*child)/i,
    /\b(disruptive|disobedient)/i,
    /\b(warned|warning|final warning)/i,
  ],

  // Financial shaming
  financialShaming: [
    /\b(defaulter|defaulting)/i,
    /\b(outstanding\s*)?debt/i,
    /\bowe(s|d)?\s*(us|the school|fees)/i,
    /\b(will be|may be)\s*(sent home|excluded)/i,
    /\b(immediate|urgent)\s*payment/i,
    /\blegal\s*action/i,
    /\bcollection\s*agency/i,
  ],

  // Sensitive medical/personal
  sensitiveContent: [
    /\b(diagnosis|diagnosed)/i,
    /\b(medication|medicated)/i,
    /\b(therapy|therapist|counseling)/i,
    /\b(mental\s*health)/i,
    /\b(special\s*needs)/i,
    /\b(disability|disabled)/i,
    /\b(adhd|autism|dyslexia)/i,
  ],

  // AI/diagnostic references (parents should not see)
  aiReferences: [
    /\b(ai|artificial\s*intelligence)\s*(detected|suggests|analysis)/i,
    /\b(algorithm|automated\s*system)/i,
    /\b(diagnostic|diagnostics)/i,
    /\b(learning\s*profile\s*score)/i,
    /\b(intervention\s*plan)/i,
    /\b(risk\s*score|at.risk\s*indicator)/i,
  ],
} as const;

// =============================================================================
// APPROVED LANGUAGE ALTERNATIVES
// =============================================================================

/**
 * Safe alternatives for common forbidden phrases
 */
export const SAFE_ALTERNATIVES: Record<string, string> = {
  // Instead of negative labels
  'struggling with': 'working on',
  'failed': 'did not complete',
  'poor performance': 'opportunity for growth',
  'weak in': 'developing skills in',
  'behind': 'progressing at own pace',
  'slow learner': 'learning at own pace',
  
  // Instead of rankings
  'ranked': 'participated in',
  'came last': 'completed the activity',
  'bottom of class': 'has room to grow',
  
  // Instead of disciplinary
  'punished': 'reminded of expectations',
  'detention': 'reflection time',
  'bad behavior': 'behavior that needs attention',
  'naughty': 'needing guidance',
  
  // Instead of financial shaming
  'defaulter': 'fee balance pending',
  'owes fees': 'has outstanding balance',
  'sent home': 'requires attention',
};

// =============================================================================
// MESSAGE VALIDATION
// =============================================================================

export interface ContentValidationResult {
  isValid: boolean;
  violations: ContentViolation[];
  severity: 'none' | 'warning' | 'blocked';
  suggestions: string[];
}

export interface ContentViolation {
  type: keyof typeof FORBIDDEN_CONTENT;
  matchedText: string;
  position: number;
  principle: keyof typeof COMPLIANCE_PRINCIPLES;
  severity: 'warning' | 'blocked';
}

/**
 * Validate message content against guardrails
 */
export function validateMessageContent(content: string): ContentValidationResult {
  const violations: ContentViolation[] = [];
  const suggestions: string[] = [];

  // Check each forbidden pattern category
  Object.entries(FORBIDDEN_CONTENT).forEach(([type, patterns]) => {
    patterns.forEach(pattern => {
      const matches = content.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        const violation: ContentViolation = {
          type: type as keyof typeof FORBIDDEN_CONTENT,
          matchedText: match[0],
          position: match.index || 0,
          principle: getPrincipleForViolationType(type),
          severity: getSeverityForType(type),
        };
        violations.push(violation);

        // Add suggestion if available
        const alternative = findAlternative(match[0]);
        if (alternative) {
          suggestions.push(`Consider replacing "${match[0]}" with "${alternative}"`);
        }
      }
    });
  });

  // Determine overall severity
  let severity: ContentValidationResult['severity'] = 'none';
  if (violations.some(v => v.severity === 'blocked')) {
    severity = 'blocked';
  } else if (violations.length > 0) {
    severity = 'warning';
  }

  return {
    isValid: severity !== 'blocked',
    violations,
    severity,
    suggestions: [...new Set(suggestions)],
  };
}

function getPrincipleForViolationType(type: string): keyof typeof COMPLIANCE_PRINCIPLES {
  const mapping: Record<string, keyof typeof COMPLIANCE_PRINCIPLES> = {
    rankingPatterns: 'childDignity',
    negativeLabels: 'childDignity',
    disciplinaryLanguage: 'childDignity',
    financialShaming: 'parentRespect',
    sensitiveContent: 'minimalData',
    aiReferences: 'purposeLimitation',
  };
  return mapping[type] || 'childDignity';
}

function getSeverityForType(type: string): 'warning' | 'blocked' {
  // These categories always block the message
  const blockedTypes = [
    'rankingPatterns',
    'financialShaming',
    'sensitiveContent',
    'aiReferences',
  ];
  return blockedTypes.includes(type) ? 'blocked' : 'warning';
}

function findAlternative(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const [forbidden, safe] of Object.entries(SAFE_ALTERNATIVES)) {
    if (lowerText.includes(forbidden.toLowerCase())) {
      return safe;
    }
  }
  return null;
}

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for parent message content
 */
export const parentMessageSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be less than 100 characters')
    .refine(
      (val) => validateMessageContent(val).isValid,
      (val) => ({ message: `Subject contains prohibited content: ${validateMessageContent(val).violations[0]?.matchedText}` })
    ),
  body: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters')
    .refine(
      (val) => validateMessageContent(val).isValid,
      (val) => ({ message: `Message contains prohibited content: ${validateMessageContent(val).violations[0]?.matchedText}` })
    ),
  studentFirstName: z
    .string()
    .trim()
    .min(1, 'Student name is required')
    .max(50, 'Name too long'),
});

/**
 * Schema for attendance notification
 */
export const attendanceNotificationSchema = z.object({
  studentFirstName: z.string().trim().min(1).max(50),
  status: z.enum(['absent', 'late', 'early_departure']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  note: z.string().trim().max(200).optional(),
}).refine(
  (data) => !data.note || validateMessageContent(data.note).isValid,
  { message: 'Note contains prohibited content' }
);

/**
 * Schema for learning update
 */
export const learningUpdateSchema = z.object({
  studentFirstName: z.string().trim().min(1).max(50),
  subject: z.string().trim().min(1).max(50),
  update: z
    .string()
    .trim()
    .min(10, 'Update too short')
    .max(500, 'Update must be less than 500 characters')
    .refine(
      (val) => validateMessageContent(val).isValid,
      { message: 'Update contains prohibited content' }
    ),
  homeSupport: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine(
      (val) => !val || validateMessageContent(val).isValid,
      { message: 'Home support tip contains prohibited content' }
    ),
});

// =============================================================================
// DATA MINIMIZATION HELPERS
// =============================================================================

/**
 * Sanitize student data for parent-facing messages
 */
export function sanitizeStudentDataForParent(student: {
  id: string;
  firstName: string;
  lastName: string;
  classId?: string;
  dateOfBirth?: string;
}): {
  firstName: string;
  classDisplay?: string;
} {
  return {
    firstName: student.firstName,
    // Only include class grade level, not section or ID
    classDisplay: undefined, // Removed for minimal data
  };
}

/**
 * Check if data field should be included in message
 */
export function shouldIncludeField(
  fieldName: string,
  messageCategory: string
): boolean {
  const allowedFields: Record<string, string[]> = {
    attendance_notice: ['firstName', 'date', 'status'],
    learning_update: ['firstName', 'subject', 'topic'],
    school_announcement: ['firstName'],
    emergency_notice: ['firstName', 'emergencyType', 'instructions'],
    fee_status: ['firstName', 'balanceStatus'], // No amounts
  };

  return allowedFields[messageCategory]?.includes(fieldName) ?? false;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export function getViolationDisplay(violation: ContentViolation): {
  title: string;
  description: string;
  icon: string;
} {
  const displays: Record<keyof typeof FORBIDDEN_CONTENT, { title: string; description: string; icon: string }> = {
    rankingPatterns: {
      title: 'Performance Ranking',
      description: 'Comparing students or revealing class rankings is not allowed',
      icon: 'bar-chart-2',
    },
    negativeLabels: {
      title: 'Negative Label',
      description: 'Labels that could harm child dignity are not allowed',
      icon: 'alert-triangle',
    },
    disciplinaryLanguage: {
      title: 'Disciplinary Language',
      description: 'Automated disciplinary messages require admin review',
      icon: 'shield-alert',
    },
    financialShaming: {
      title: 'Financial Pressure',
      description: 'Language that shames parents about fees is not allowed',
      icon: 'credit-card',
    },
    sensitiveContent: {
      title: 'Sensitive Information',
      description: 'Medical or diagnostic information should not be in messages',
      icon: 'lock',
    },
    aiReferences: {
      title: 'Internal Reference',
      description: 'AI/diagnostic references should not be visible to parents',
      icon: 'eye-off',
    },
  };
  return displays[violation.type];
}

export function getPrincipleDisplay(principle: keyof typeof COMPLIANCE_PRINCIPLES): {
  title: string;
  icon: string;
  color: string;
} {
  const displays = {
    minimalData: { title: 'Minimal Data', icon: 'database', color: 'blue' },
    purposeLimitation: { title: 'Purpose Limitation', icon: 'target', color: 'purple' },
    childDignity: { title: 'Child Dignity', icon: 'heart', color: 'pink' },
    parentRespect: { title: 'Parent Respect', icon: 'users', color: 'green' },
  };
  return displays[principle];
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

export const ZAMBIA_GUARDRAILS_SUMMARY = {
  overview: {
    context: 'Zambian school communication compliance framework',
    lastUpdated: '2026-01-08',
    principles: Object.keys(COMPLIANCE_PRINCIPLES),
  },
  strictlyForbidden: [
    'Performance rankings or class position',
    'Comparative language between students',
    'Negative labels (slow, struggling, failing)',
    'Automated disciplinary language',
    'Financial shaming or threats',
    'Medical/diagnostic information',
    'AI system references',
    'Full student IDs or personal details',
  ],
  approvedPractices: [
    'First name only in messages',
    'Growth-focused language',
    'Effort acknowledgment',
    'Specific, actionable home support tips',
    'Neutral attendance facts',
    'Respectful fee balance notices',
    'Clear emergency instructions',
  ],
  validationFlow: [
    '1. Schema validation (length, format)',
    '2. Content pattern matching',
    '3. Violation severity assessment',
    '4. Safe alternative suggestions',
    '5. Block or warn based on severity',
  ],
} as const;

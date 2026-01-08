/**
 * Message Template Standards
 * 
 * Defines approved language rules and template structure for
 * parent-facing automated notifications.
 * 
 * Core principles:
 * - Simple, clear language
 * - No blame or judgment
 * - No performance/academic language
 * - Short sentences (max 15 words)
 * - Clear action when needed
 */

// ============================================================================
// FORBIDDEN LANGUAGE
// ============================================================================

/**
 * Words and phrases that must NEVER appear in parent messages
 */
export const FORBIDDEN_PHRASES = {
  // Blame language
  blame: [
    'failed to',
    'did not bother',
    'neglected',
    'irresponsible',
    'careless',
    'lazy',
    'disappointing',
    'unacceptable',
    'inexcusable',
    'again',
    'repeatedly',
    'constantly',
    'always late',
    'never on time',
  ],
  
  // Performance/academic language
  performance: [
    'struggling',
    'falling behind',
    'underperforming',
    'below average',
    'above average',
    'top of class',
    'bottom of class',
    'ranked',
    'compared to',
    'other students',
    'peers',
    'score',
    'grade',
    'percentage',
    'failed',
    'passed',
    'weak',
    'strong',
    'gifted',
    'slow',
    'fast learner',
    'behind',
    'ahead',
  ],
  
  // Alarming language
  alarming: [
    'urgent',
    'critical',
    'serious concern',
    'worrying',
    'alarming',
    'troubling',
    'problematic',
    'issue',
    'problem',
    'concern',
    'warning',
    'alert',
    'immediately',
    'as soon as possible',
    'ASAP',
  ],
  
  // Financial/shame language
  financial: [
    'overdue',
    'outstanding balance',
    'unpaid',
    'debt',
    'owe',
    'payment required',
    'fees',
    'fine',
    'penalty',
  ],
  
  // Technical/AI language
  technical: [
    'AI',
    'artificial intelligence',
    'algorithm',
    'automated',
    'system generated',
    'diagnostic',
    'analysis',
    'data',
    'metrics',
    'analytics',
  ],
} as const;

/**
 * All forbidden phrases flattened for quick lookup
 */
export const ALL_FORBIDDEN_PHRASES = Object.values(FORBIDDEN_PHRASES).flat();

// ============================================================================
// APPROVED LANGUAGE
// ============================================================================

/**
 * Approved alternative phrases to use instead of forbidden ones
 */
export const APPROVED_ALTERNATIVES: Record<string, string> = {
  // Instead of blame
  'failed to attend': 'was not present',
  'did not show up': 'was not in class',
  'missed school': 'was absent',
  'skipped': 'was not recorded as present',
  
  // Instead of alarming
  'urgent': 'please note',
  'immediately': 'at your earliest convenience',
  'critical': 'important',
  'warning': 'notice',
  'alert': 'update',
  'concern': 'update',
  'problem': 'situation',
  'issue': 'matter',
  
  // Instead of performance
  'struggling': 'working on',
  'behind': 'focusing on',
  'weak in': 'developing skills in',
  'failed': 'is continuing to work on',
  'poor performance': 'current focus area',
};

/**
 * Approved opening phrases
 */
export const APPROVED_OPENINGS = [
  'Dear Parent/Guardian,',
  'Good morning,',
  'Good afternoon,',
  'Hello,',
] as const;

/**
 * Approved closing phrases
 */
export const APPROVED_CLOSINGS = [
  'Thank you.',
  'Warm regards,',
  'Best regards,',
  'Kind regards,',
] as const;

/**
 * Approved action phrases
 */
export const APPROVED_ACTION_PHRASES = [
  'No action is needed.',
  'No response is required.',
  'This is for your information only.',
  'Please acknowledge receipt.',
  'Please contact the school office if you have questions.',
  'Please let us know if you need any support.',
] as const;

// ============================================================================
// TEMPLATE STRUCTURE
// ============================================================================

export type TemplateCategory = 
  | 'attendance'
  | 'schedule'
  | 'emergency'
  | 'general';

export type TemplateTone = 'neutral' | 'warm' | 'formal';

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  tone: TemplateTone;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  actionRequired: boolean;
  actionText?: string;
  maxLength: number;
  approved: boolean;
}

export interface TemplateVariable {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

// ============================================================================
// STANDARD TEMPLATES
// ============================================================================

export const STANDARD_TEMPLATES: MessageTemplate[] = [
  // -------------------- ATTENDANCE TEMPLATES --------------------
  {
    id: 'absence_notice',
    name: 'Absence Notice',
    category: 'attendance',
    tone: 'neutral',
    subject: 'Attendance Update for {{student_name}}',
    body: `Dear Parent/Guardian,

This is to let you know that {{student_name}} was not recorded as present in class today, {{date}}.

{{#if reason}}
Reason noted: {{reason}}
{{/if}}

If this is incorrect, please contact the school office.

No further action is needed unless you have questions.

Thank you.
{{school_name}}`,
    variables: [
      { key: 'student_name', label: 'Student Name', required: true, example: 'Amara' },
      { key: 'date', label: 'Date', required: true, example: 'Monday, 8 January' },
      { key: 'reason', label: 'Reason (optional)', required: false, example: 'Illness' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 500,
    approved: true,
  },
  
  {
    id: 'late_arrival_notice',
    name: 'Late Arrival Notice',
    category: 'attendance',
    tone: 'neutral',
    subject: 'Arrival Update for {{student_name}}',
    body: `Dear Parent/Guardian,

{{student_name}} arrived at school at {{arrival_time}} today, {{date}}.

The school day begins at {{school_start_time}}.

This is for your records. No action is needed.

Thank you.
{{school_name}}`,
    variables: [
      { key: 'student_name', label: 'Student Name', required: true, example: 'Kofi' },
      { key: 'arrival_time', label: 'Arrival Time', required: true, example: '8:45 AM' },
      { key: 'date', label: 'Date', required: true, example: 'Tuesday, 9 January' },
      { key: 'school_start_time', label: 'School Start Time', required: true, example: '8:00 AM' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 400,
    approved: true,
  },
  
  {
    id: 'attendance_correction',
    name: 'Attendance Correction',
    category: 'attendance',
    tone: 'warm',
    subject: 'Updated Attendance for {{student_name}}',
    body: `Dear Parent/Guardian,

Good news. {{student_name}} has been marked present for {{date}}.

A previous message may have indicated otherwise. Please disregard any earlier notice.

Thank you for your patience.
{{school_name}}`,
    variables: [
      { key: 'student_name', label: 'Student Name', required: true, example: 'Ama' },
      { key: 'date', label: 'Date', required: true, example: 'Wednesday, 10 January' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 350,
    approved: true,
  },
  
  {
    id: 'early_pickup_request',
    name: 'Early Pickup Confirmation',
    category: 'attendance',
    tone: 'neutral',
    subject: 'Early Pickup Confirmation',
    body: `Dear Parent/Guardian,

We have noted that {{student_name}} will be picked up early today at {{pickup_time}}.

Please come to the main office when you arrive.

Thank you.
{{school_name}}`,
    variables: [
      { key: 'student_name', label: 'Student Name', required: true, example: 'Kwame' },
      { key: 'pickup_time', label: 'Pickup Time', required: true, example: '2:00 PM' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 300,
    approved: true,
  },
  
  // -------------------- EMERGENCY TEMPLATES --------------------
  {
    id: 'school_closure_notice',
    name: 'School Closure Notice',
    category: 'emergency',
    tone: 'formal',
    subject: 'School Closure: {{date}}',
    body: `Dear Parent/Guardian,

{{school_name}} will be closed on {{date}}.

Reason: {{reason}}

{{#if reopening_date}}
We expect to reopen on {{reopening_date}}.
{{/if}}

{{#if action_required}}
{{action_required}}
{{/if}}

Please confirm you have received this message.

{{school_name}} Administration`,
    variables: [
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
      { key: 'date', label: 'Closure Date', required: true, example: 'Thursday, 11 January' },
      { key: 'reason', label: 'Reason', required: true, example: 'scheduled maintenance' },
      { key: 'reopening_date', label: 'Reopening Date', required: false, example: 'Friday, 12 January' },
      { key: 'action_required', label: 'Action Required', required: false, example: 'Please arrange alternative care.' },
    ],
    actionRequired: true,
    actionText: 'Please confirm receipt.',
    maxLength: 600,
    approved: true,
  },
  
  {
    id: 'weather_notice',
    name: 'Weather Notice',
    category: 'emergency',
    tone: 'neutral',
    subject: 'Weather Update: {{school_name}}',
    body: `Dear Parent/Guardian,

Due to {{weather_condition}}, please note:

{{message}}

{{#if action_required}}
{{action_required}}
{{/if}}

We will send updates if the situation changes.

Thank you.
{{school_name}}`,
    variables: [
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
      { key: 'weather_condition', label: 'Weather Condition', required: true, example: 'heavy rainfall' },
      { key: 'message', label: 'Message', required: true, example: 'School will close at 1:00 PM today.' },
      { key: 'action_required', label: 'Action Required', required: false, example: 'Please collect your child by 1:00 PM.' },
    ],
    actionRequired: false,
    maxLength: 500,
    approved: true,
  },
  
  {
    id: 'safety_notice',
    name: 'Safety Notice',
    category: 'emergency',
    tone: 'formal',
    subject: 'Safety Update from {{school_name}}',
    body: `Dear Parent/Guardian,

This is an important safety update from {{school_name}}.

{{message}}

All students are safe.

{{#if instructions}}
Please note:
{{instructions}}
{{/if}}

Please confirm you have received this message.

{{school_name}} Administration`,
    variables: [
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
      { key: 'message', label: 'Safety Message', required: true, example: 'A minor water leak has been contained in Block B.' },
      { key: 'instructions', label: 'Instructions', required: false, example: 'Normal school operations will continue.' },
    ],
    actionRequired: true,
    actionText: 'Please confirm receipt.',
    maxLength: 500,
    approved: true,
  },
  
  // -------------------- SCHEDULE TEMPLATES --------------------
  {
    id: 'schedule_change',
    name: 'Schedule Change',
    category: 'schedule',
    tone: 'neutral',
    subject: 'Schedule Update: {{event_name}}',
    body: `Dear Parent/Guardian,

Please note a change to the school schedule:

{{event_name}} has been {{change_type}} to {{new_date_time}}.

{{#if additional_info}}
{{additional_info}}
{{/if}}

No action is needed unless you have questions.

Thank you.
{{school_name}}`,
    variables: [
      { key: 'event_name', label: 'Event Name', required: true, example: 'Parent-Teacher Meeting' },
      { key: 'change_type', label: 'Change Type', required: true, example: 'rescheduled' },
      { key: 'new_date_time', label: 'New Date/Time', required: true, example: 'Friday, 15 January at 3:00 PM' },
      { key: 'additional_info', label: 'Additional Info', required: false, example: '' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 450,
    approved: true,
  },
  
  // -------------------- GENERAL TEMPLATES --------------------
  {
    id: 'general_reminder',
    name: 'General Reminder',
    category: 'general',
    tone: 'warm',
    subject: 'Reminder: {{subject}}',
    body: `Dear Parent/Guardian,

This is a friendly reminder about {{subject}}.

{{message}}

{{#if action_required}}
{{action_required}}
{{/if}}

Thank you for your support.
{{school_name}}`,
    variables: [
      { key: 'subject', label: 'Reminder Subject', required: true, example: 'school photo day' },
      { key: 'message', label: 'Message', required: true, example: 'School photos will be taken tomorrow.' },
      { key: 'action_required', label: 'Action Required', required: false, example: 'Please ensure uniforms are neat.' },
      { key: 'school_name', label: 'School Name', required: true, example: 'Greenfield Primary' },
    ],
    actionRequired: false,
    maxLength: 400,
    approved: true,
  },
];

// ============================================================================
// LANGUAGE VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
}

export interface ValidationIssue {
  type: 'forbidden_phrase' | 'sentence_length' | 'missing_greeting' | 'missing_closing' | 'too_long' | 'tone_mismatch';
  severity: 'error' | 'warning';
  message: string;
  position?: { start: number; end: number };
  suggestion?: string;
}

/**
 * Validate a message against template standards
 */
export function validateMessage(
  text: string,
  options: {
    maxSentenceWords?: number;
    maxLength?: number;
    requireGreeting?: boolean;
    requireClosing?: boolean;
  } = {}
): ValidationResult {
  const {
    maxSentenceWords = 15,
    maxLength = 500,
    requireGreeting = true,
    requireClosing = true,
  } = options;
  
  const issues: ValidationIssue[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for forbidden phrases
  for (const phrase of ALL_FORBIDDEN_PHRASES) {
    const lowerPhrase = phrase.toLowerCase();
    const index = lowerText.indexOf(lowerPhrase);
    
    if (index !== -1) {
      const alternative = APPROVED_ALTERNATIVES[phrase.toLowerCase()];
      issues.push({
        type: 'forbidden_phrase',
        severity: 'error',
        message: `Forbidden phrase detected: "${phrase}"`,
        position: { start: index, end: index + phrase.length },
        suggestion: alternative ? `Consider using: "${alternative}"` : 'Remove or rephrase this.',
      });
    }
  }
  
  // Check sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > maxSentenceWords) {
      issues.push({
        type: 'sentence_length',
        severity: 'warning',
        message: `Sentence too long (${wordCount} words). Max recommended: ${maxSentenceWords}`,
        suggestion: 'Break into shorter sentences for clarity.',
      });
    }
  }
  
  // Check greeting
  if (requireGreeting) {
    const hasGreeting = APPROVED_OPENINGS.some(opening => 
      text.toLowerCase().includes(opening.toLowerCase().replace(',', ''))
    );
    if (!hasGreeting) {
      issues.push({
        type: 'missing_greeting',
        severity: 'warning',
        message: 'Missing approved greeting.',
        suggestion: `Start with one of: ${APPROVED_OPENINGS.join(', ')}`,
      });
    }
  }
  
  // Check closing
  if (requireClosing) {
    const hasClosing = APPROVED_CLOSINGS.some(closing =>
      text.toLowerCase().includes(closing.toLowerCase().replace(',', ''))
    );
    if (!hasClosing) {
      issues.push({
        type: 'missing_closing',
        severity: 'warning',
        message: 'Missing approved closing.',
        suggestion: `End with one of: ${APPROVED_CLOSINGS.join(', ')}`,
      });
    }
  }
  
  // Check total length
  if (text.length > maxLength) {
    issues.push({
      type: 'too_long',
      severity: 'warning',
      message: `Message too long (${text.length} chars). Max: ${maxLength}`,
      suggestion: 'Shorten the message for better readability.',
    });
  }
  
  // Calculate score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));
  
  return {
    valid: errorCount === 0,
    issues,
    score,
  };
}

/**
 * Get a clean version of text with forbidden phrases highlighted or removed
 */
export function sanitizeMessage(text: string): string {
  let sanitized = text;
  
  for (const phrase of ALL_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    const alternative = APPROVED_ALTERNATIVES[phrase.toLowerCase()];
    
    if (alternative) {
      sanitized = sanitized.replace(regex, alternative);
    }
  }
  
  return sanitized;
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Render a template with provided variables
 */
export function renderTemplate(
  template: MessageTemplate,
  variables: Record<string, string | undefined>
): { subject: string; body: string; valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  // Check for missing required variables
  for (const variable of template.variables) {
    if (variable.required && !variables[variable.key]) {
      missingVars.push(variable.key);
    }
  }
  
  let subject = template.subject;
  let body = template.body;
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    if (value) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }
  }
  
  // Handle conditionals (simplified Handlebars-like syntax)
  body = body.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, key, content) => {
    return variables[key] ? content.trim() : '';
  });
  
  // Clean up unused variables
  subject = subject.replace(/{{[\w_]+}}/g, '');
  body = body.replace(/{{[\w_]+}}/g, '');
  
  // Clean up extra whitespace
  body = body.replace(/\n{3,}/g, '\n\n').trim();
  
  return {
    subject,
    body,
    valid: missingVars.length === 0,
    missingVars,
  };
}

// ============================================================================
// TEMPLATE LOOKUP
// ============================================================================

export function getTemplate(templateId: string): MessageTemplate | undefined {
  return STANDARD_TEMPLATES.find(t => t.id === templateId);
}

export function getTemplatesByCategory(category: TemplateCategory): MessageTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.category === category);
}

export function getApprovedTemplates(): MessageTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.approved);
}

// ============================================================================
// LANGUAGE GUIDELINES SUMMARY
// ============================================================================

export const LANGUAGE_GUIDELINES = {
  principles: [
    'Use simple, everyday language',
    'Keep sentences under 15 words',
    'State facts without judgment',
    'Include clear action if needed',
    'Always use approved greetings and closings',
  ],
  
  doNot: [
    'Blame or shame parents or students',
    'Use academic or performance language',
    'Compare students to others',
    'Use alarming or urgent language (except genuine emergencies)',
    'Mention AI, algorithms, or automated systems',
    'Reference scores, grades, or rankings',
    'Use technical jargon',
  ],
  
  examples: {
    good: [
      'This is to let you know...',
      'Please note that...',
      'For your information...',
      'No action is needed.',
      'Thank you for your support.',
    ],
    avoid: [
      'We are concerned that...',
      'Your child failed to...',
      'This is urgent...',
      'Compared to other students...',
      'Your child is struggling...',
    ],
  },
  
  toneGuidance: {
    neutral: 'Factual, no emotion, just information',
    warm: 'Friendly but professional, shows care',
    formal: 'Official, appropriate for serious matters',
  },
} as const;

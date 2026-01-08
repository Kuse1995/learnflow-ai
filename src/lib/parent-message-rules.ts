/**
 * Parent Communication Language Rules
 * 
 * CRITICAL: All parent-facing messages MUST pass through these validation rules.
 * These rules ensure warm, supportive, non-judgmental communication.
 */

// ============================================================================
// BANNED TERMS - NEVER use these in parent-facing messages
// ============================================================================

export const BANNED_TERMS = {
  // Financial pressure terms
  financial: [
    "overdue",
    "unpaid",
    "outstanding",
    "arrears",
    "defaulted",
    "delinquent",
    "owed",
    "debt",
    "penalty",
    "late fee",
    "final notice",
    "collection",
    "immediate payment",
    "required payment",
  ],

  // Negative academic terms
  academic: [
    "failed",
    "failing",
    "weak",
    "struggling",
    "behind",
    "underperforming",
    "below average",
    "poor",
    "deficient",
    "lacking",
    "insufficient",
    "remedial",
    "at risk",
    "concerning",
    "disappointing",
    "unsatisfactory",
  ],

  // Comparative terms
  comparative: [
    "compared to",
    "unlike other",
    "other students",
    "class average",
    "ranked",
    "percentile",
    "bottom",
    "lowest",
    "worst",
    "better than",
    "worse than",
    "ahead of",
    "behind others",
  ],

  // Internal system terms (never expose to parents)
  internal: [
    "AI",
    "artificial intelligence",
    "algorithm",
    "machine learning",
    "analysis",
    "diagnostic",
    "assessment score",
    "data",
    "analytics",
    "system generated",
    "automated",
    "flagged",
    "triggered",
  ],

  // Pressure/demanding terms
  pressure: [
    "must",
    "required",
    "mandatory",
    "urgent",
    "immediately",
    "failure to",
    "consequences",
    "action required",
    "respond by",
    "deadline",
    "final",
    "warning",
    "last chance",
  ],

  // Blame/negligence terms
  blame: [
    "neglect",
    "ignored",
    "failed to",
    "did not",
    "absence of",
    "lack of support",
    "missing",
    "forgotten",
    "overlooked",
    "irresponsible",
  ],
} as const;

// Flat list of all banned terms for validation
export const ALL_BANNED_TERMS = Object.values(BANNED_TERMS).flat();

// ============================================================================
// APPROVED PHRASES - Use these for consistent, warm communication
// ============================================================================

export const APPROVED_PHRASES = {
  // Greetings
  greetings: [
    "Dear Parent/Guardian",
    "Good day",
    "Warm greetings",
    "Hello",
  ],

  // Opening statements
  openings: [
    "This is a learning update to keep you informed",
    "We wanted to share some information with you",
    "Here is an update about your child",
    "Please find below a brief update",
    "We hope this message finds you well",
  ],

  // Transition phrases
  transitions: [
    "Please note",
    "For your information",
    "You may be interested to know",
    "We would like to share",
    "As an update",
  ],

  // Action suggestions (never demands)
  suggestions: [
    "You may wish to follow up at your convenience",
    "No action is required unless you choose to",
    "Feel free to reach out if you have questions",
    "You are welcome to discuss this further",
    "Should you wish to learn more, please contact us",
    "This is for your information only",
  ],

  // Positive reinforcement
  positive: [
    "We appreciate your partnership",
    "Thank you for your continued support",
    "We value your involvement",
    "Together we support your child",
    "We look forward to working with you",
  ],

  // Closings
  closings: [
    "Warm regards",
    "With best wishes",
    "Kind regards",
    "Respectfully",
    "Thank you",
  ],

  // Attendance (informational only)
  attendance: [
    "Your child was not present today",
    "We noticed your child was away",
    "Your child was marked absent",
    "Your child left early today",
    "Your child arrived after the start of class",
  ],

  // Learning updates (neutral)
  learning: [
    "Your child has been working on",
    "Recent classroom activities include",
    "Your child is exploring",
    "The class has been learning about",
    "Your child participated in",
  ],

  // Fee information (neutral, never shaming)
  fees: [
    "This is a routine account update",
    "For your records",
    "Account information for your reference",
    "This is a courtesy notice",
  ],
} as const;

// ============================================================================
// MESSAGE TEMPLATES - Pre-approved message structures
// ============================================================================

export const MESSAGE_TEMPLATES = {
  learning_update: {
    structure: "greeting + opening + content + suggestion + closing",
    example: `Dear Parent/Guardian,

This is a learning update to keep you informed.

{{content}}

No action is required unless you choose to. Should you wish to learn more, please contact us.

Warm regards,
{{teacher_name}}`,
  },

  attendance_notice: {
    structure: "greeting + attendance_fact + closing",
    example: `Dear Parent/Guardian,

We noticed {{student_name}} was not present today ({{date}}).

This is for your information only.

Warm regards,
{{school_name}}`,
  },

  fee_status: {
    structure: "greeting + neutral_statement + no_pressure + closing",
    example: `Dear Parent/Guardian,

This is a routine account update for your records.

{{content}}

No action is required unless you choose to.

Kind regards,
{{school_name}}`,
  },

  announcement: {
    structure: "greeting + information + closing",
    example: `Dear Parent/Guardian,

{{content}}

Thank you for your continued support.

Warm regards,
{{school_name}}`,
  },
} as const;

// ============================================================================
// TONE CHECKLIST - For developers implementing parent messages
// ============================================================================

export const TONE_CHECKLIST = {
  required: [
    "Message uses warm, welcoming language",
    "Message is informational, not demanding",
    "No numeric scores, ranks, or percentages included",
    "No comparison to other children or averages",
    "No blame or implication of parental negligence",
    "No internal system terms exposed (AI, analysis, etc.)",
    "Action is suggested, never required",
    "Message respects parent autonomy",
  ],

  forbidden: [
    "Pressure language (must, required, urgent)",
    "Negative labels (weak, struggling, failing)",
    "Financial shame language (overdue, unpaid)",
    "Comparative statements (behind others)",
    "Automated escalation threats",
    "Multiple reminders for same item",
    "Messages after 6 PM local time",
  ],

  questions_to_ask: [
    "Would a parent feel respected reading this?",
    "Does this message assume positive intent?",
    "Is this information helpful, not alarming?",
    "Can the parent choose to ignore this without consequence?",
    "Does this avoid making the parent feel judged?",
  ],
} as const;

// ============================================================================
// DELIVERY RULES - When and how messages can be sent
// ============================================================================

export const DELIVERY_RULES = {
  // Time restrictions
  allowedHours: {
    start: 8, // 8 AM
    end: 18, // 6 PM - NEVER send after this
  },

  // Frequency limits
  maxPerWeek: {
    learning_update: 2,
    attendance_notice: 3,
    fee_status: 1,
    school_announcement: 2,
    emergency_notice: 10, // Emergencies are exceptions
  },

  // Reminder rules
  reminders: {
    allowed: false, // NEVER send automated reminders
    exception: "emergency_notice",
  },

  // Escalation rules
  escalation: {
    allowed: false, // NEVER auto-escalate to parents
    reason: "All escalation must be human-initiated",
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a message contains any banned terms
 */
export function containsBannedTerms(message: string): { hasBanned: boolean; found: string[] } {
  const lowerMessage = message.toLowerCase();
  const found: string[] = [];

  for (const term of ALL_BANNED_TERMS) {
    // Use word boundary matching to avoid false positives
    const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, "i");
    if (regex.test(lowerMessage)) {
      found.push(term);
    }
  }

  return { hasBanned: found.length > 0, found };
}

/**
 * Validate a parent-facing message
 */
export function validateParentMessage(message: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for banned terms
  const { hasBanned, found } = containsBannedTerms(message);
  if (hasBanned) {
    errors.push(`Contains banned terms: ${found.join(", ")}`);
  }

  // Check for numeric scores/percentages
  const scorePattern = /\b\d+%|\b\d+\/\d+|\bscore[d]?\s*:?\s*\d+/i;
  if (scorePattern.test(message)) {
    errors.push("Contains numeric scores or percentages");
  }

  // Check for ranking language
  const rankPattern = /\b(1st|2nd|3rd|\d+th|rank|position)\b/i;
  if (rankPattern.test(message)) {
    errors.push("Contains ranking language");
  }

  // Check message length (SMS-friendly)
  if (message.length > 320) {
    warnings.push("Message exceeds 2 SMS segments (320 chars)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if current time is within allowed sending hours
 */
export function isWithinSendingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= DELIVERY_RULES.allowedHours.start && hour < DELIVERY_RULES.allowedHours.end;
}

/**
 * Get a safe fallback message if original fails validation
 */
export function getSafeFallbackMessage(category: keyof typeof MESSAGE_TEMPLATES): string {
  const templates: Record<string, string> = {
    learning_update: "This is a learning update. Please contact your child's teacher for details.",
    attendance_notice: "This is an attendance update for your records.",
    fee_status: "This is a routine account notice for your information.",
    announcement: "Please check with the school for the latest announcements.",
  };
  return templates[category] || "Please contact the school for more information.";
}

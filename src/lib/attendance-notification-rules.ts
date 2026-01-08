/**
 * Attendance Notification Rules
 * 
 * Principles:
 * - Neutral, factual language (no shaming or alarming)
 * - One notification per event per day (suppress duplicates)
 * - Warm, supportive tone
 */

import { 
  NotificationRule, 
  MessageTemplate, 
  TriggerEvent,
  NotificationCategory,
} from './notification-rule-engine';

// ============================================================================
// ATTENDANCE TRIGGER EVENTS
// ============================================================================

export type AttendanceTrigger = 
  | 'student_marked_absent'
  | 'student_marked_late'
  | 'attendance_corrected_to_present';

export interface AttendanceEvent {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM for late arrivals
  previousStatus?: 'absent' | 'late' | 'present';
  newStatus: 'absent' | 'late' | 'present';
  markedBy: string;
  schoolName: string;
}

// ============================================================================
// SUPPRESSION LOGIC
// ============================================================================

const SUPPRESSION_KEY_PREFIX = 'attendance_notif_';

interface SuppressionRecord {
  studentId: string;
  date: string;
  eventType: AttendanceTrigger;
  sentAt: string;
}

/**
 * Generates a unique key for suppression checks
 */
function getSuppressionKey(studentId: string, date: string, eventType: AttendanceTrigger): string {
  return `${SUPPRESSION_KEY_PREFIX}${studentId}_${date}_${eventType}`;
}

/**
 * Checks if a notification has already been sent for this event today
 */
export function isDuplicateNotification(
  studentId: string,
  date: string,
  eventType: AttendanceTrigger
): boolean {
  const key = getSuppressionKey(studentId, date, eventType);
  const stored = localStorage.getItem(key);
  
  if (!stored) return false;
  
  try {
    const record: SuppressionRecord = JSON.parse(stored);
    // Check if it's the same day
    return record.date === date;
  } catch {
    return false;
  }
}

/**
 * Marks a notification as sent (for duplicate suppression)
 */
export function markNotificationSent(
  studentId: string,
  date: string,
  eventType: AttendanceTrigger
): void {
  const key = getSuppressionKey(studentId, date, eventType);
  const record: SuppressionRecord = {
    studentId,
    date,
    eventType,
    sentAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(record));
}

/**
 * Clears old suppression records (call periodically)
 */
export function clearOldSuppressionRecords(): void {
  const today = new Date().toISOString().split('T')[0];
  const keys = Object.keys(localStorage).filter(k => k.startsWith(SUPPRESSION_KEY_PREFIX));
  
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const record: SuppressionRecord = JSON.parse(stored);
        if (record.date < today) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}

// ============================================================================
// MESSAGE TEMPLATES (Warm, Neutral Language)
// ============================================================================

export const ATTENDANCE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'attendance_absence_notice',
    category: 'absence',
    subject: 'Attendance Update for {{student_name}}',
    body: `Dear Parent/Guardian,

This is a routine attendance update for {{student_name}}.

Today ({{date}}), {{student_name}} was not recorded as present in class.

If you have any questions or would like to share additional context, please feel free to contact the school office.

Warm regards,
{{school_name}}`,
    requiredVariables: ['student_name', 'date', 'school_name'],
    optionalVariables: ['class_name'],
  },
  {
    id: 'attendance_late_notice',
    category: 'late_arrival',
    subject: 'Attendance Update for {{student_name}}',
    body: `Dear Parent/Guardian,

This is a routine attendance update for {{student_name}}.

Today ({{date}}), {{student_name}} arrived at {{arrival_time}}, which was after the scheduled start time.

No action is required on your part. This is for your records only.

Warm regards,
{{school_name}}`,
    requiredVariables: ['student_name', 'date', 'arrival_time', 'school_name'],
    optionalVariables: ['class_name'],
  },
  {
    id: 'attendance_correction_notice',
    category: 'attendance',
    subject: 'Attendance Correction for {{student_name}}',
    body: `Dear Parent/Guardian,

This is a brief update regarding attendance records for {{student_name}}.

We wanted to let you know that {{student_name}}'s attendance for {{date}} has been updated. The record now shows that {{student_name}} was present.

Thank you for your understanding.

Warm regards,
{{school_name}}`,
    requiredVariables: ['student_name', 'date', 'school_name'],
    optionalVariables: ['class_name'],
  },
];

// ============================================================================
// NOTIFICATION RULES
// ============================================================================

export const ATTENDANCE_RULES: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'Same-Day Absence Notice',
    description: 'Notifies guardian when student is marked absent (sent once per day)',
    category: 'absence',
    triggerEvent: 'student_marked_absent',
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'attendance_absence_notice',
    delayWindow: {
      delayMinutes: 45, // Wait 45 min for potential corrections
      cancellationWindowMinutes: 40,
      allowedHours: { start: 9, end: 14 }, // Send during school hours only
      skipWeekends: true,
    },
    priority: 2,
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
  {
    name: 'Late Arrival Notice',
    description: 'Notifies guardian when student arrives late (sent once per day)',
    category: 'late_arrival',
    triggerEvent: 'student_marked_late',
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'attendance_late_notice',
    delayWindow: {
      delayMinutes: 30, // Wait 30 min
      cancellationWindowMinutes: 25,
      allowedHours: { start: 8, end: 12 }, // Morning only
      skipWeekends: true,
    },
    priority: 3,
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
  {
    name: 'Attendance Correction Notice',
    description: 'Notifies guardian when absence is corrected to present',
    category: 'attendance',
    triggerEvent: 'attendance_corrected_to_present' as TriggerEvent,
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'attendance_correction_notice',
    delayWindow: {
      delayMinutes: 15, // Short delay for corrections
      cancellationWindowMinutes: 10,
      allowedHours: { start: 8, end: 16 },
      skipWeekends: true,
    },
    priority: 4, // Lower priority than absence/late
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
];

// ============================================================================
// TRIGGER-TO-MESSAGE MAPPING
// ============================================================================

export interface TriggerMapping {
  trigger: AttendanceTrigger;
  templateId: string;
  ruleName: string;
  description: string;
  exampleScenario: string;
}

export const TRIGGER_TO_MESSAGE_MAP: TriggerMapping[] = [
  {
    trigger: 'student_marked_absent',
    templateId: 'attendance_absence_notice',
    ruleName: 'Same-Day Absence Notice',
    description: 'Sent when a student is marked absent during attendance',
    exampleScenario: 'Teacher marks Riya as absent at 9:15 AM → Parent receives neutral notification at ~10:00 AM',
  },
  {
    trigger: 'student_marked_late',
    templateId: 'attendance_late_notice',
    ruleName: 'Late Arrival Notice',
    description: 'Sent when a student arrives after the scheduled start time',
    exampleScenario: 'Amit arrives at 9:30 AM (school starts 9:00 AM) → Parent receives notification at ~10:00 AM',
  },
  {
    trigger: 'attendance_corrected_to_present',
    templateId: 'attendance_correction_notice',
    ruleName: 'Attendance Correction Notice',
    description: 'Sent when an absence is later corrected to present',
    exampleScenario: 'Priya was marked absent, then teacher corrects to present → Parent receives correction notice',
  },
];

// ============================================================================
// ATTENDANCE NOTIFICATION PROCESSOR
// ============================================================================

export interface AttendanceNotificationResult {
  shouldSend: boolean;
  reason: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  scheduledFor?: string;
}

/**
 * Processes an attendance event and determines if a notification should be sent
 */
export function processAttendanceEvent(event: AttendanceEvent): AttendanceNotificationResult {
  // Determine the trigger type
  let triggerType: AttendanceTrigger;
  
  if (event.newStatus === 'absent') {
    triggerType = 'student_marked_absent';
  } else if (event.newStatus === 'late') {
    triggerType = 'student_marked_late';
  } else if (event.newStatus === 'present' && event.previousStatus === 'absent') {
    triggerType = 'attendance_corrected_to_present';
  } else {
    return {
      shouldSend: false,
      reason: 'No notification required for this status change',
    };
  }

  // Check for duplicates
  if (isDuplicateNotification(event.studentId, event.date, triggerType)) {
    return {
      shouldSend: false,
      reason: `Notification already sent for ${triggerType} on ${event.date}`,
    };
  }

  // Find the matching template
  const mapping = TRIGGER_TO_MESSAGE_MAP.find(m => m.trigger === triggerType);
  if (!mapping) {
    return {
      shouldSend: false,
      reason: 'No template mapping found for this trigger',
    };
  }

  // Build template variables
  const templateVariables: Record<string, string> = {
    student_name: event.studentName,
    date: formatDateForParent(event.date),
    school_name: event.schoolName,
    class_name: event.className,
  };

  if (event.time) {
    templateVariables.arrival_time = formatTimeForParent(event.time);
  }

  // Calculate scheduled time based on rule
  const rule = ATTENDANCE_RULES.find(r => r.templateId === mapping.templateId);
  const delayMinutes = rule?.delayWindow.delayMinutes || 30;
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  return {
    shouldSend: true,
    reason: `${mapping.ruleName} triggered`,
    templateId: mapping.templateId,
    templateVariables,
    scheduledFor,
  };
}

/**
 * Formats a date for parent-friendly display
 */
function formatDateForParent(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  };
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Formats a time for parent-friendly display
 */
function formatTimeForParent(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============================================================================
// LANGUAGE SAFETY CHECKS
// ============================================================================

const FORBIDDEN_PHRASES = [
  'failed to attend',
  'truant',
  'skipped',
  'bunked',
  'did not bother',
  'irresponsible',
  'concerning',
  'worrying',
  'unacceptable',
  'must explain',
  'needs improvement',
  'falling behind',
  'poor attendance',
  'disappointing',
];

const ALARM_PHRASES = [
  'urgent',
  'immediately',
  'serious matter',
  'disciplinary action',
  'consequences',
  'warning',
  'final notice',
];

/**
 * Validates that a message does not contain shaming or alarming language
 */
export function validateMessageTone(message: string): { 
  isValid: boolean; 
  violations: string[] 
} {
  const lowerMessage = message.toLowerCase();
  const violations: string[] = [];

  for (const phrase of FORBIDDEN_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      violations.push(`Contains shaming phrase: "${phrase}"`);
    }
  }

  for (const phrase of ALARM_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      violations.push(`Contains alarming phrase: "${phrase}"`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Pre-validates all attendance templates to ensure tone compliance
 */
export function validateAllTemplates(): { 
  templateId: string; 
  isValid: boolean; 
  violations: string[] 
}[] {
  return ATTENDANCE_TEMPLATES.map(template => {
    const fullText = `${template.subject} ${template.body}`;
    const result = validateMessageTone(fullText);
    return {
      templateId: template.id,
      ...result,
    };
  });
}

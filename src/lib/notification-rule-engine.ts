/**
 * Automated Notification Rule Engine
 * 
 * Core principles:
 * - Offline-first: Rules stored locally, evaluated without network
 * - Deterministic: No AI decisions, predictable outcomes
 * - Human override: Always allowed at any stage
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type NotificationCategory = 
  | 'attendance'
  | 'absence'
  | 'late_arrival'
  | 'early_pickup'
  | 'emergency_notice'
  | 'school_wide_alert';

export type TriggerEvent =
  | 'student_marked_absent'
  | 'student_marked_late'
  | 'attendance_not_marked'
  | 'early_pickup_requested'
  | 'early_pickup_completed'
  | 'emergency_declared'
  | 'emergency_resolved'
  | 'school_announcement_created'
  | 'consecutive_absence_threshold'
  | 'pattern_detected';

export type TargetAudience =
  | 'primary_guardian'
  | 'all_guardians'
  | 'emergency_contacts'
  | 'class_parents'
  | 'school_wide'
  | 'specific_guardians';

export type EscalationLevel = 'none' | 'teacher' | 'admin' | 'principal' | 'emergency';

export interface DelayWindow {
  /** Minutes to wait before sending */
  delayMinutes: number;
  /** Window during which notification can be cancelled */
  cancellationWindowMinutes: number;
  /** Only send during these hours (24h format) */
  allowedHours?: { start: number; end: number };
  /** Skip weekends */
  skipWeekends?: boolean;
}

export interface EscalationPath {
  /** Initial level */
  startLevel: EscalationLevel;
  /** Escalate after this many minutes without acknowledgment */
  escalateAfterMinutes: number;
  /** Maximum escalation level */
  maxLevel: EscalationLevel;
  /** Levels to escalate through in order */
  levels: EscalationLevel[];
}

export interface MessageTemplate {
  id: string;
  category: NotificationCategory;
  subject: string;
  /** Body with placeholders: {{student_name}}, {{date}}, {{time}}, etc. */
  body: string;
  /** Variables that must be provided */
  requiredVariables: string[];
  /** Optional variables */
  optionalVariables?: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  category: NotificationCategory;
  
  /** What triggers this rule */
  triggerEvent: TriggerEvent;
  /** Additional conditions that must be met */
  conditions: RuleCondition[];
  
  /** Who receives the notification */
  targetAudience: TargetAudience;
  /** Specific guardian IDs if targetAudience is 'specific_guardians' */
  specificGuardianIds?: string[];
  
  /** Message to send */
  templateId: string;
  
  /** Timing configuration */
  delayWindow: DelayWindow;
  
  /** Escalation if no response */
  escalationPath?: EscalationPath;
  
  /** Rule priority (lower = higher priority) */
  priority: number;
  
  /** Is this rule active */
  isActive: boolean;
  
  /** Can be overridden by teachers */
  allowTeacherOverride: boolean;
  /** Can be overridden by admins */
  allowAdminOverride: boolean;
  
  /** School-specific or system-wide */
  schoolId?: string;
  
  /** Audit metadata */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: string | number | boolean | string[];
}

export interface RuleEvaluationContext {
  schoolId: string;
  studentId?: string;
  classId?: string;
  guardianId?: string;
  eventType: TriggerEvent;
  eventData: Record<string, unknown>;
  timestamp: string;
  /** User requesting override, if any */
  overrideRequestedBy?: string;
  overrideReason?: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  /** Why it matched or didn't match */
  reason: string;
  /** Conditions that were evaluated */
  conditionResults: { condition: RuleCondition; passed: boolean; reason: string }[];
  /** If matched, the notification to queue */
  notification?: QueuedNotification;
  /** Was this overridden by a human */
  wasOverridden: boolean;
  overrideDetails?: {
    by: string;
    reason: string;
    action: 'suppress' | 'force_send' | 'modify';
  };
}

export interface QueuedNotification {
  id: string;
  ruleId: string;
  category: NotificationCategory;
  templateId: string;
  templateVariables: Record<string, string>;
  targetAudience: TargetAudience;
  targetGuardianIds: string[];
  
  scheduledFor: string;
  cancellableUntil: string;
  
  escalationPath?: EscalationPath;
  currentEscalationLevel: EscalationLevel;
  
  status: 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'escalated' | 'failed';
  
  /** For offline-first: stored locally until synced */
  syncedToServer: boolean;
  localId: string;
  
  createdAt: string;
  context: RuleEvaluationContext;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'absence_first_day',
    category: 'absence',
    subject: 'Absence Notice: {{student_name}}',
    body: 'Dear Parent/Guardian,\n\nThis is to inform you that {{student_name}} was marked absent on {{date}}.\n\nIf this is unexpected, please contact the school office.\n\nRegards,\n{{school_name}}',
    requiredVariables: ['student_name', 'date', 'school_name'],
  },
  {
    id: 'absence_consecutive',
    category: 'absence',
    subject: 'Extended Absence Notice: {{student_name}}',
    body: 'Dear Parent/Guardian,\n\n{{student_name}} has been absent for {{consecutive_days}} consecutive days ({{date_range}}).\n\nPlease contact the school to discuss.\n\nRegards,\n{{school_name}}',
    requiredVariables: ['student_name', 'consecutive_days', 'date_range', 'school_name'],
  },
  {
    id: 'late_arrival',
    category: 'late_arrival',
    subject: 'Late Arrival: {{student_name}}',
    body: 'Dear Parent/Guardian,\n\n{{student_name}} arrived late to school today at {{arrival_time}}.\n\nRegards,\n{{school_name}}',
    requiredVariables: ['student_name', 'arrival_time', 'school_name'],
  },
  {
    id: 'early_pickup_request',
    category: 'early_pickup',
    subject: 'Early Pickup Confirmation: {{student_name}}',
    body: 'Dear Parent/Guardian,\n\nA request for early pickup of {{student_name}} at {{pickup_time}} has been received.\n\nPickup by: {{pickup_person}}\n\nRegards,\n{{school_name}}',
    requiredVariables: ['student_name', 'pickup_time', 'pickup_person', 'school_name'],
  },
  {
    id: 'emergency_notice',
    category: 'emergency_notice',
    subject: 'URGENT: {{emergency_type}}',
    body: '{{emergency_message}}\n\nPlease follow instructions from school authorities.\n\n{{school_name}}',
    requiredVariables: ['emergency_type', 'emergency_message', 'school_name'],
  },
  {
    id: 'school_announcement',
    category: 'school_wide_alert',
    subject: '{{announcement_title}}',
    body: '{{announcement_body}}\n\n{{school_name}}',
    requiredVariables: ['announcement_title', 'announcement_body', 'school_name'],
  },
  {
    id: 'attendance_reminder',
    category: 'attendance',
    subject: 'Attendance Update: {{student_name}}',
    body: 'Dear Parent/Guardian,\n\nThis is your daily attendance update for {{student_name}} on {{date}}.\n\nStatus: {{attendance_status}}\n\nRegards,\n{{school_name}}',
    requiredVariables: ['student_name', 'date', 'attendance_status', 'school_name'],
  },
];

// ============================================================================
// DEFAULT RULES
// ============================================================================

export const DEFAULT_RULES: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'First Day Absence',
    description: 'Notify guardians when student is marked absent',
    category: 'absence',
    triggerEvent: 'student_marked_absent',
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'absence_first_day',
    delayWindow: {
      delayMinutes: 30, // Wait 30 min in case of correction
      cancellationWindowMinutes: 25,
      allowedHours: { start: 8, end: 18 },
      skipWeekends: true,
    },
    priority: 2,
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
  {
    name: 'Consecutive Absence Alert',
    description: 'Escalated notice for 3+ consecutive absences',
    category: 'absence',
    triggerEvent: 'consecutive_absence_threshold',
    conditions: [
      { field: 'consecutive_days', operator: 'greater_than', value: 2 },
    ],
    targetAudience: 'all_guardians',
    templateId: 'absence_consecutive',
    delayWindow: {
      delayMinutes: 0,
      cancellationWindowMinutes: 0,
      allowedHours: { start: 8, end: 18 },
    },
    escalationPath: {
      startLevel: 'teacher',
      escalateAfterMinutes: 60,
      maxLevel: 'admin',
      levels: ['teacher', 'admin'],
    },
    priority: 1,
    isActive: true,
    allowTeacherOverride: false,
    allowAdminOverride: true,
  },
  {
    name: 'Late Arrival Notice',
    description: 'Notify guardian when student arrives late',
    category: 'late_arrival',
    triggerEvent: 'student_marked_late',
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'late_arrival',
    delayWindow: {
      delayMinutes: 15,
      cancellationWindowMinutes: 10,
      allowedHours: { start: 7, end: 12 },
    },
    priority: 3,
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
  {
    name: 'Early Pickup Confirmation',
    description: 'Confirm early pickup request to guardian',
    category: 'early_pickup',
    triggerEvent: 'early_pickup_requested',
    conditions: [],
    targetAudience: 'primary_guardian',
    templateId: 'early_pickup_request',
    delayWindow: {
      delayMinutes: 0,
      cancellationWindowMinutes: 0,
    },
    priority: 1,
    isActive: true,
    allowTeacherOverride: true,
    allowAdminOverride: true,
  },
  {
    name: 'Emergency Notice',
    description: 'Immediate emergency notification to all contacts',
    category: 'emergency_notice',
    triggerEvent: 'emergency_declared',
    conditions: [],
    targetAudience: 'emergency_contacts',
    templateId: 'emergency_notice',
    delayWindow: {
      delayMinutes: 0,
      cancellationWindowMinutes: 0,
      // No hour restrictions for emergencies
    },
    escalationPath: {
      startLevel: 'emergency',
      escalateAfterMinutes: 5,
      maxLevel: 'emergency',
      levels: ['emergency'],
    },
    priority: 0, // Highest priority
    isActive: true,
    allowTeacherOverride: false,
    allowAdminOverride: false, // Emergencies always send
  },
  {
    name: 'School Announcement',
    description: 'School-wide announcement to all parents',
    category: 'school_wide_alert',
    triggerEvent: 'school_announcement_created',
    conditions: [],
    targetAudience: 'school_wide',
    templateId: 'school_announcement',
    delayWindow: {
      delayMinutes: 5,
      cancellationWindowMinutes: 5,
      allowedHours: { start: 7, end: 20 },
    },
    priority: 2,
    isActive: true,
    allowTeacherOverride: false,
    allowAdminOverride: true,
  },
];

// ============================================================================
// RULE EVALUATION ENGINE
// ============================================================================

/**
 * Evaluates a single condition against the context
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: RuleEvaluationContext
): { passed: boolean; reason: string } {
  const value = context.eventData[condition.field];
  
  if (value === undefined) {
    return { passed: false, reason: `Field '${condition.field}' not found in context` };
  }

  switch (condition.operator) {
    case 'equals':
      return {
        passed: value === condition.value,
        reason: value === condition.value 
          ? `${condition.field} equals ${condition.value}` 
          : `${condition.field} (${value}) does not equal ${condition.value}`,
      };
    
    case 'not_equals':
      return {
        passed: value !== condition.value,
        reason: value !== condition.value 
          ? `${condition.field} does not equal ${condition.value}` 
          : `${condition.field} (${value}) equals ${condition.value}`,
      };
    
    case 'greater_than':
      return {
        passed: Number(value) > Number(condition.value),
        reason: Number(value) > Number(condition.value)
          ? `${condition.field} (${value}) > ${condition.value}`
          : `${condition.field} (${value}) <= ${condition.value}`,
      };
    
    case 'less_than':
      return {
        passed: Number(value) < Number(condition.value),
        reason: Number(value) < Number(condition.value)
          ? `${condition.field} (${value}) < ${condition.value}`
          : `${condition.field} (${value}) >= ${condition.value}`,
      };
    
    case 'contains':
      const strValue = String(value).toLowerCase();
      const searchValue = String(condition.value).toLowerCase();
      return {
        passed: strValue.includes(searchValue),
        reason: strValue.includes(searchValue)
          ? `${condition.field} contains '${condition.value}'`
          : `${condition.field} does not contain '${condition.value}'`,
      };
    
    case 'in':
      const inArray = Array.isArray(condition.value) ? condition.value : [condition.value];
      return {
        passed: inArray.includes(value as string),
        reason: inArray.includes(value as string)
          ? `${condition.field} (${value}) is in [${inArray.join(', ')}]`
          : `${condition.field} (${value}) not in [${inArray.join(', ')}]`,
      };
    
    case 'not_in':
      const notInArray = Array.isArray(condition.value) ? condition.value : [condition.value];
      return {
        passed: !notInArray.includes(value as string),
        reason: !notInArray.includes(value as string)
          ? `${condition.field} (${value}) not in [${notInArray.join(', ')}]`
          : `${condition.field} (${value}) is in [${notInArray.join(', ')}]`,
      };
    
    default:
      return { passed: false, reason: `Unknown operator: ${condition.operator}` };
  }
}

/**
 * Checks if current time is within allowed hours
 */
export function isWithinAllowedHours(
  delayWindow: DelayWindow,
  timestamp: Date = new Date()
): boolean {
  if (!delayWindow.allowedHours) return true;
  
  const hour = timestamp.getHours();
  return hour >= delayWindow.allowedHours.start && hour < delayWindow.allowedHours.end;
}

/**
 * Checks if date is a weekend
 */
export function isWeekend(timestamp: Date = new Date()): boolean {
  const day = timestamp.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculates the scheduled send time based on delay window
 */
export function calculateScheduledTime(
  delayWindow: DelayWindow,
  baseTime: Date = new Date()
): Date {
  let scheduledTime = new Date(baseTime.getTime() + delayWindow.delayMinutes * 60 * 1000);
  
  // If outside allowed hours, schedule for next allowed window
  if (delayWindow.allowedHours) {
    const hour = scheduledTime.getHours();
    
    if (hour < delayWindow.allowedHours.start) {
      scheduledTime.setHours(delayWindow.allowedHours.start, 0, 0, 0);
    } else if (hour >= delayWindow.allowedHours.end) {
      // Schedule for next day
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(delayWindow.allowedHours.start, 0, 0, 0);
    }
  }
  
  // Skip weekends if configured
  if (delayWindow.skipWeekends) {
    while (isWeekend(scheduledTime)) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
  }
  
  return scheduledTime;
}

/**
 * Evaluates a rule against the given context
 */
export function evaluateRule(
  rule: NotificationRule,
  context: RuleEvaluationContext,
  templates: MessageTemplate[] = DEFAULT_TEMPLATES
): RuleEvaluationResult {
  // Check if rule is active
  if (!rule.isActive) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      reason: 'Rule is inactive',
      conditionResults: [],
      wasOverridden: false,
    };
  }

  // Check trigger event matches
  if (rule.triggerEvent !== context.eventType) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      reason: `Trigger event mismatch: expected ${rule.triggerEvent}, got ${context.eventType}`,
      conditionResults: [],
      wasOverridden: false,
    };
  }

  // Check school match if rule is school-specific
  if (rule.schoolId && rule.schoolId !== context.schoolId) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      reason: 'School ID mismatch',
      conditionResults: [],
      wasOverridden: false,
    };
  }

  // Evaluate all conditions
  const conditionResults = rule.conditions.map(condition => ({
    condition,
    ...evaluateCondition(condition, context),
  }));

  const allConditionsPassed = conditionResults.every(r => r.passed);

  if (!allConditionsPassed) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      reason: 'One or more conditions not met',
      conditionResults,
      wasOverridden: false,
    };
  }

  // Handle human override
  if (context.overrideRequestedBy) {
    const canOverride = 
      (rule.allowTeacherOverride) || 
      (rule.allowAdminOverride);

    if (canOverride) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        reason: 'Suppressed by human override',
        conditionResults,
        wasOverridden: true,
        overrideDetails: {
          by: context.overrideRequestedBy,
          reason: context.overrideReason || 'No reason provided',
          action: 'suppress',
        },
      };
    }
  }

  // Find template
  const template = templates.find(t => t.id === rule.templateId);
  if (!template) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      reason: `Template not found: ${rule.templateId}`,
      conditionResults,
      wasOverridden: false,
    };
  }

  // Calculate timing
  const now = new Date();
  const scheduledFor = calculateScheduledTime(rule.delayWindow, now);
  const cancellableUntil = new Date(
    now.getTime() + rule.delayWindow.cancellationWindowMinutes * 60 * 1000
  );

  // Build notification
  const notification: QueuedNotification = {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    category: rule.category,
    templateId: rule.templateId,
    templateVariables: context.eventData as Record<string, string>,
    targetAudience: rule.targetAudience,
    targetGuardianIds: rule.specificGuardianIds || [],
    scheduledFor: scheduledFor.toISOString(),
    cancellableUntil: cancellableUntil.toISOString(),
    escalationPath: rule.escalationPath,
    currentEscalationLevel: rule.escalationPath?.startLevel || 'none',
    status: 'pending',
    syncedToServer: false,
    localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now.toISOString(),
    context,
  };

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched: true,
    reason: 'All conditions met',
    conditionResults,
    notification,
    wasOverridden: false,
  };
}

/**
 * Evaluates all rules against a context, returning matching rules sorted by priority
 */
export function evaluateAllRules(
  rules: NotificationRule[],
  context: RuleEvaluationContext,
  templates: MessageTemplate[] = DEFAULT_TEMPLATES
): RuleEvaluationResult[] {
  const results = rules
    .sort((a, b) => a.priority - b.priority)
    .map(rule => evaluateRule(rule, context, templates));
  
  return results;
}

/**
 * Gets only the matching rules that should trigger notifications
 */
export function getMatchingRules(
  rules: NotificationRule[],
  context: RuleEvaluationContext,
  templates: MessageTemplate[] = DEFAULT_TEMPLATES
): RuleEvaluationResult[] {
  return evaluateAllRules(rules, context, templates).filter(r => r.matched);
}

// ============================================================================
// OFFLINE STORAGE HELPERS
// ============================================================================

const LOCAL_STORAGE_KEYS = {
  RULES: 'notification_rules',
  TEMPLATES: 'notification_templates',
  QUEUE: 'notification_queue',
  PENDING_SYNC: 'notification_pending_sync',
} as const;

/**
 * Stores rules locally for offline access
 */
export function storeRulesLocally(rules: NotificationRule[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RULES, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to store rules locally:', e);
  }
}

/**
 * Retrieves locally stored rules
 */
export function getLocalRules(): NotificationRule[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.RULES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to retrieve local rules:', e);
    return [];
  }
}

/**
 * Stores a notification in the local queue
 */
export function queueNotificationLocally(notification: QueuedNotification): void {
  try {
    const queue = getLocalQueue();
    queue.push(notification);
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to queue notification locally:', e);
  }
}

/**
 * Gets the local notification queue
 */
export function getLocalQueue(): QueuedNotification[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.QUEUE);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to retrieve local queue:', e);
    return [];
  }
}

/**
 * Removes a notification from the local queue
 */
export function removeFromLocalQueue(localId: string): void {
  try {
    const queue = getLocalQueue().filter(n => n.localId !== localId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to remove from local queue:', e);
  }
}

/**
 * Gets notifications pending sync to server
 */
export function getPendingSyncNotifications(): QueuedNotification[] {
  return getLocalQueue().filter(n => !n.syncedToServer);
}

/**
 * Marks a notification as synced
 */
export function markAsSynced(localId: string): void {
  try {
    const queue = getLocalQueue().map(n => 
      n.localId === localId ? { ...n, syncedToServer: true } : n
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to mark as synced:', e);
  }
}

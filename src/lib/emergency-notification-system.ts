/**
 * Emergency Notification System
 * 
 * Handles high-priority emergency communications with:
 * - Bypass of normal delays and queues
 * - Mandatory delivery with aggressive retry
 * - Acknowledgment tracking
 * - Escalation to alternative contacts
 */

// ============================================================================
// EMERGENCY TYPES & SEVERITY
// ============================================================================

export type EmergencyType = 
  | 'school_closure'
  | 'safety_incident'
  | 'weather_disruption'
  | 'infrastructure_failure';

export type EmergencySeverity = 'critical' | 'high' | 'elevated';

export type InfrastructureType = 'power' | 'water' | 'gas' | 'network' | 'building';

export interface EmergencyDetails {
  type: EmergencyType;
  severity: EmergencySeverity;
  title: string;
  description: string;
  affectedAreas?: string[];
  infrastructureType?: InfrastructureType;
  expectedResolution?: Date;
  actionRequired?: string;
  safetyInstructions?: string[];
}

// ============================================================================
// EMERGENCY CONFIGURATION
// ============================================================================

export const EMERGENCY_CONFIG: Record<EmergencyType, {
  defaultSeverity: EmergencySeverity;
  bypassApproval: boolean;
  maxRetryAttempts: number;
  retryIntervalMs: number;
  requireAcknowledgment: boolean;
  escalateAfterMs: number;
  channels: ('whatsapp' | 'sms' | 'email')[];
}> = {
  school_closure: {
    defaultSeverity: 'critical',
    bypassApproval: true,
    maxRetryAttempts: 10,
    retryIntervalMs: 60_000, // 1 minute
    requireAcknowledgment: true,
    escalateAfterMs: 300_000, // 5 minutes
    channels: ['whatsapp', 'sms', 'email'],
  },
  safety_incident: {
    defaultSeverity: 'critical',
    bypassApproval: true,
    maxRetryAttempts: 15,
    retryIntervalMs: 30_000, // 30 seconds
    requireAcknowledgment: true,
    escalateAfterMs: 180_000, // 3 minutes
    channels: ['whatsapp', 'sms', 'email'],
  },
  weather_disruption: {
    defaultSeverity: 'high',
    bypassApproval: true,
    maxRetryAttempts: 8,
    retryIntervalMs: 120_000, // 2 minutes
    requireAcknowledgment: false,
    escalateAfterMs: 600_000, // 10 minutes
    channels: ['whatsapp', 'sms', 'email'],
  },
  infrastructure_failure: {
    defaultSeverity: 'elevated',
    bypassApproval: true,
    maxRetryAttempts: 6,
    retryIntervalMs: 180_000, // 3 minutes
    requireAcknowledgment: false,
    escalateAfterMs: 900_000, // 15 minutes
    channels: ['whatsapp', 'sms'],
  },
};

// ============================================================================
// EMERGENCY STATE MACHINE
// ============================================================================

export type EmergencyState = 
  | 'initiated'      // Admin started emergency
  | 'broadcasting'   // Sending to all recipients
  | 'awaiting_ack'   // Waiting for acknowledgments
  | 'escalating'     // Escalating to secondary contacts
  | 'resolved'       // Emergency resolved
  | 'cancelled';     // Emergency cancelled

export type EmergencyEvent =
  | 'initiate'
  | 'start_broadcast'
  | 'broadcast_complete'
  | 'ack_received'
  | 'ack_timeout'
  | 'escalate'
  | 'resolve'
  | 'cancel';

interface StateTransition {
  from: EmergencyState;
  event: EmergencyEvent;
  to: EmergencyState;
  condition?: (context: EmergencyContext) => boolean;
}

export const EMERGENCY_STATE_MACHINE: StateTransition[] = [
  { from: 'initiated', event: 'start_broadcast', to: 'broadcasting' },
  { from: 'initiated', event: 'cancel', to: 'cancelled' },
  
  { from: 'broadcasting', event: 'broadcast_complete', to: 'awaiting_ack',
    condition: (ctx) => ctx.config.requireAcknowledgment },
  { from: 'broadcasting', event: 'broadcast_complete', to: 'resolved',
    condition: (ctx) => !ctx.config.requireAcknowledgment },
  { from: 'broadcasting', event: 'cancel', to: 'cancelled' },
  
  { from: 'awaiting_ack', event: 'ack_received', to: 'awaiting_ack',
    condition: (ctx) => ctx.pendingAcks > 0 },
  { from: 'awaiting_ack', event: 'ack_received', to: 'resolved',
    condition: (ctx) => ctx.pendingAcks === 0 },
  { from: 'awaiting_ack', event: 'ack_timeout', to: 'escalating' },
  { from: 'awaiting_ack', event: 'resolve', to: 'resolved' },
  { from: 'awaiting_ack', event: 'cancel', to: 'cancelled' },
  
  { from: 'escalating', event: 'ack_received', to: 'awaiting_ack' },
  { from: 'escalating', event: 'escalate', to: 'escalating' },
  { from: 'escalating', event: 'resolve', to: 'resolved' },
  { from: 'escalating', event: 'cancel', to: 'cancelled' },
];

export interface EmergencyContext {
  id: string;
  state: EmergencyState;
  details: EmergencyDetails;
  config: typeof EMERGENCY_CONFIG[EmergencyType];
  initiatedBy: string;
  initiatedAt: Date;
  schoolId: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  acknowledgedCount: number;
  pendingAcks: number;
  escalationLevel: number;
  lastEscalationAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export function getNextState(
  current: EmergencyState,
  event: EmergencyEvent,
  context: EmergencyContext
): EmergencyState | null {
  const transitions = EMERGENCY_STATE_MACHINE.filter(
    t => t.from === current && t.event === event
  );
  
  for (const transition of transitions) {
    if (!transition.condition || transition.condition(context)) {
      return transition.to;
    }
  }
  
  return null;
}

export function canTransition(
  current: EmergencyState,
  event: EmergencyEvent,
  context: EmergencyContext
): boolean {
  return getNextState(current, event, context) !== null;
}

// ============================================================================
// DELIVERY TRACKING
// ============================================================================

export type DeliveryState = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'acknowledged'
  | 'failed'
  | 'escalated';

export interface RecipientDelivery {
  recipientId: string;
  guardianId: string;
  studentId: string;
  channel: 'whatsapp' | 'sms' | 'email';
  state: DeliveryState;
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  acknowledgedAt?: Date;
  escalatedAt?: Date;
  errorMessage?: string;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  acknowledged: number;
  failed: number;
  escalated: number;
  ackRate: number;
}

export function calculateDeliveryStats(deliveries: RecipientDelivery[]): DeliveryStats {
  const stats = {
    total: deliveries.length,
    pending: 0,
    sent: 0,
    delivered: 0,
    acknowledged: 0,
    failed: 0,
    escalated: 0,
    ackRate: 0,
  };
  
  for (const d of deliveries) {
    stats[d.state]++;
  }
  
  stats.ackRate = stats.total > 0 
    ? Math.round((stats.acknowledged / stats.total) * 100) 
    : 0;
  
  return stats;
}

// ============================================================================
// ESCALATION RULES
// ============================================================================

export interface EscalationRule {
  level: number;
  triggerAfterMs: number;
  actions: EscalationAction[];
  maxAttempts: number;
}

export type EscalationAction = 
  | 'retry_primary'
  | 'try_secondary_contact'
  | 'try_alternative_channel'
  | 'notify_admin'
  | 'phone_call_fallback';

export const ESCALATION_RULES: EscalationRule[] = [
  {
    level: 1,
    triggerAfterMs: 180_000, // 3 minutes
    actions: ['retry_primary', 'try_alternative_channel'],
    maxAttempts: 3,
  },
  {
    level: 2,
    triggerAfterMs: 300_000, // 5 minutes after level 1
    actions: ['try_secondary_contact', 'notify_admin'],
    maxAttempts: 3,
  },
  {
    level: 3,
    triggerAfterMs: 600_000, // 10 minutes after level 2
    actions: ['phone_call_fallback', 'notify_admin'],
    maxAttempts: 2,
  },
];

export function getEscalationRule(level: number): EscalationRule | null {
  return ESCALATION_RULES.find(r => r.level === level) || null;
}

export function shouldEscalate(
  delivery: RecipientDelivery,
  emergencyStartedAt: Date,
  currentLevel: number
): boolean {
  if (delivery.state === 'acknowledged' || delivery.state === 'escalated') {
    return false;
  }
  
  const rule = getEscalationRule(currentLevel + 1);
  if (!rule) return false;
  
  const elapsedMs = Date.now() - emergencyStartedAt.getTime();
  const totalTriggerTime = ESCALATION_RULES
    .filter(r => r.level <= currentLevel)
    .reduce((sum, r) => sum + r.triggerAfterMs, 0) + rule.triggerAfterMs;
  
  return elapsedMs >= totalTriggerTime;
}

// ============================================================================
// PRIORITY QUEUE OVERRIDE
// ============================================================================

export const EMERGENCY_PRIORITY = {
  critical: 1000,  // Highest priority
  high: 900,
  elevated: 800,
  normal: 100,     // Normal messages
} as const;

export interface QueuedEmergencyMessage {
  id: string;
  emergencyId: string;
  recipientId: string;
  channel: 'whatsapp' | 'sms' | 'email';
  priority: number;
  content: string;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  bypassOfflineQueue: boolean;
}

export function createEmergencyQueueItem(
  emergencyId: string,
  recipientId: string,
  channel: 'whatsapp' | 'sms' | 'email',
  content: string,
  severity: EmergencySeverity
): QueuedEmergencyMessage {
  const config = Object.values(EMERGENCY_CONFIG).find(
    c => c.defaultSeverity === severity
  ) || EMERGENCY_CONFIG.school_closure;
  
  return {
    id: `emg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    emergencyId,
    recipientId,
    channel,
    priority: EMERGENCY_PRIORITY[severity],
    content,
    createdAt: new Date(),
    attempts: 0,
    maxAttempts: config.maxRetryAttempts,
    nextRetryAt: new Date(),
    bypassOfflineQueue: true,
  };
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export const EMERGENCY_TEMPLATES: Record<EmergencyType, {
  subject: string;
  body: string;
  urgencyPrefix: string;
}> = {
  school_closure: {
    subject: 'School Closure Notice',
    urgencyPrefix: '🔴 URGENT: ',
    body: `Dear Parent/Guardian,

{{school_name}} will be CLOSED on {{date}}.

Reason: {{reason}}

{{#if expected_resolution}}
Expected reopening: {{expected_resolution}}
{{/if}}

{{#if action_required}}
Action required: {{action_required}}
{{/if}}

Please confirm receipt of this message.

Regards,
{{school_name}} Administration`,
  },
  
  safety_incident: {
    subject: 'Safety Notice - Immediate Attention Required',
    urgencyPrefix: '🚨 SAFETY ALERT: ',
    body: `Dear Parent/Guardian,

This is an important safety notice from {{school_name}}.

{{description}}

{{#if safety_instructions}}
Please follow these instructions:
{{#each safety_instructions}}
• {{this}}
{{/each}}
{{/if}}

{{#if action_required}}
{{action_required}}
{{/if}}

All students are safe. Please confirm receipt.

{{school_name}} Administration`,
  },
  
  weather_disruption: {
    subject: 'Weather Advisory',
    urgencyPrefix: '⚠️ WEATHER NOTICE: ',
    body: `Dear Parent/Guardian,

Due to {{reason}}, please note the following:

{{description}}

{{#if affected_areas}}
Affected: {{affected_areas}}
{{/if}}

{{#if expected_resolution}}
Expected resolution: {{expected_resolution}}
{{/if}}

{{#if action_required}}
{{action_required}}
{{/if}}

Regards,
{{school_name}}`,
  },
  
  infrastructure_failure: {
    subject: 'Infrastructure Notice',
    urgencyPrefix: '⚠️ NOTICE: ',
    body: `Dear Parent/Guardian,

{{school_name}} is experiencing a {{infrastructure_type}} issue.

{{description}}

{{#if expected_resolution}}
Estimated resolution: {{expected_resolution}}
{{/if}}

{{#if action_required}}
{{action_required}}
{{/if}}

We will update you when the issue is resolved.

{{school_name}} Administration`,
  },
};

export function renderEmergencyMessage(
  type: EmergencyType,
  variables: Record<string, string | string[] | undefined>
): { subject: string; body: string } {
  const template = EMERGENCY_TEMPLATES[type];
  
  let body = template.body;
  let subject = template.urgencyPrefix + template.subject;
  
  // Simple template rendering
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string') {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }
  
  // Handle conditionals (simplified)
  body = body.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, key, content) => {
    return variables[key] ? content : '';
  });
  
  // Handle arrays
  body = body.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, key, content) => {
    const arr = variables[key];
    if (Array.isArray(arr)) {
      return arr.map(item => content.replace(/{{this}}/g, item)).join('\n');
    }
    return '';
  });
  
  // Clean up unused placeholders
  body = body.replace(/{{[\w_]+}}/g, '');
  body = body.replace(/\n{3,}/g, '\n\n').trim();
  
  return { subject, body };
}

// ============================================================================
// ACKNOWLEDGMENT TRACKING
// ============================================================================

export interface Acknowledgment {
  id: string;
  emergencyId: string;
  recipientId: string;
  guardianId: string;
  acknowledgedAt: Date;
  channel: 'whatsapp' | 'sms' | 'email' | 'app';
  method: 'reply' | 'button' | 'link' | 'auto';
}

export interface AckTrackingState {
  emergencyId: string;
  totalExpected: number;
  received: Acknowledgment[];
  pending: string[];
  overdueRecipients: string[];
}

export function isAckOverdue(
  recipientId: string,
  emergencyStartedAt: Date,
  acks: Acknowledgment[],
  timeoutMs: number = 300_000 // 5 minutes default
): boolean {
  const hasAcked = acks.some(a => a.recipientId === recipientId);
  if (hasAcked) return false;
  
  const elapsedMs = Date.now() - emergencyStartedAt.getTime();
  return elapsedMs > timeoutMs;
}

// ============================================================================
// LOCAL STORAGE FOR OFFLINE
// ============================================================================

const EMERGENCY_STORAGE_KEY = 'sms_active_emergencies';
const EMERGENCY_QUEUE_KEY = 'sms_emergency_queue';
const EMERGENCY_ACKS_KEY = 'sms_emergency_acks';

export function storeActiveEmergency(emergency: EmergencyContext): void {
  try {
    const stored = localStorage.getItem(EMERGENCY_STORAGE_KEY);
    const emergencies: EmergencyContext[] = stored ? JSON.parse(stored) : [];
    
    const index = emergencies.findIndex(e => e.id === emergency.id);
    if (index >= 0) {
      emergencies[index] = emergency;
    } else {
      emergencies.push(emergency);
    }
    
    localStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(emergencies));
  } catch (error) {
    console.error('Failed to store emergency:', error);
  }
}

export function getActiveEmergencies(): EmergencyContext[] {
  try {
    const stored = localStorage.getItem(EMERGENCY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function removeEmergency(emergencyId: string): void {
  try {
    const emergencies = getActiveEmergencies().filter(e => e.id !== emergencyId);
    localStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(emergencies));
  } catch (error) {
    console.error('Failed to remove emergency:', error);
  }
}

export function queueEmergencyMessage(message: QueuedEmergencyMessage): void {
  try {
    const stored = localStorage.getItem(EMERGENCY_QUEUE_KEY);
    const queue: QueuedEmergencyMessage[] = stored ? JSON.parse(stored) : [];
    queue.push(message);
    // Sort by priority (highest first)
    queue.sort((a, b) => b.priority - a.priority);
    localStorage.setItem(EMERGENCY_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue emergency message:', error);
  }
}

export function getEmergencyQueue(): QueuedEmergencyMessage[] {
  try {
    const stored = localStorage.getItem(EMERGENCY_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function dequeueEmergencyMessage(messageId: string): void {
  try {
    const queue = getEmergencyQueue().filter(m => m.id !== messageId);
    localStorage.setItem(EMERGENCY_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to dequeue message:', error);
  }
}

export function storeAcknowledgment(ack: Acknowledgment): void {
  try {
    const stored = localStorage.getItem(EMERGENCY_ACKS_KEY);
    const acks: Acknowledgment[] = stored ? JSON.parse(stored) : [];
    acks.push(ack);
    localStorage.setItem(EMERGENCY_ACKS_KEY, JSON.stringify(acks));
  } catch (error) {
    console.error('Failed to store acknowledgment:', error);
  }
}

export function getAcknowledgments(emergencyId: string): Acknowledgment[] {
  try {
    const stored = localStorage.getItem(EMERGENCY_ACKS_KEY);
    const acks: Acknowledgment[] = stored ? JSON.parse(stored) : [];
    return acks.filter(a => a.emergencyId === emergencyId);
  } catch {
    return [];
  }
}

// ============================================================================
// ADMIN AUTHORIZATION
// ============================================================================

export type AdminRole = 'school_admin' | 'platform_admin';

export function canInitiateEmergency(role: string): boolean {
  return role === 'school_admin' || role === 'platform_admin';
}

export function canResolveEmergency(role: string, initiatedBy: string, userId: string): boolean {
  if (role === 'platform_admin') return true;
  if (role === 'school_admin') return true;
  return initiatedBy === userId;
}

export function canCancelEmergency(role: string): boolean {
  return role === 'school_admin' || role === 'platform_admin';
}

// ============================================================================
// FORCED RESEND RULES
// ============================================================================

export interface ResendRule {
  condition: 'undelivered' | 'unacknowledged' | 'failed';
  afterMs: number;
  maxResends: number;
  useAlternativeChannel: boolean;
}

export const FORCED_RESEND_RULES: Record<EmergencySeverity, ResendRule[]> = {
  critical: [
    { condition: 'undelivered', afterMs: 60_000, maxResends: 5, useAlternativeChannel: true },
    { condition: 'unacknowledged', afterMs: 180_000, maxResends: 3, useAlternativeChannel: true },
    { condition: 'failed', afterMs: 30_000, maxResends: 10, useAlternativeChannel: true },
  ],
  high: [
    { condition: 'undelivered', afterMs: 120_000, maxResends: 3, useAlternativeChannel: true },
    { condition: 'unacknowledged', afterMs: 300_000, maxResends: 2, useAlternativeChannel: false },
    { condition: 'failed', afterMs: 60_000, maxResends: 5, useAlternativeChannel: true },
  ],
  elevated: [
    { condition: 'undelivered', afterMs: 180_000, maxResends: 2, useAlternativeChannel: false },
    { condition: 'failed', afterMs: 120_000, maxResends: 3, useAlternativeChannel: true },
  ],
};

export function getApplicableResendRules(
  severity: EmergencySeverity,
  delivery: RecipientDelivery
): ResendRule[] {
  const rules = FORCED_RESEND_RULES[severity] || [];
  
  return rules.filter(rule => {
    switch (rule.condition) {
      case 'undelivered':
        return delivery.state === 'sent' || delivery.state === 'pending';
      case 'unacknowledged':
        return delivery.state === 'delivered';
      case 'failed':
        return delivery.state === 'failed';
      default:
        return false;
    }
  });
}

export function shouldForcedResend(
  delivery: RecipientDelivery,
  severity: EmergencySeverity,
  elapsedMs: number
): { shouldResend: boolean; useAlternativeChannel: boolean } {
  const rules = getApplicableResendRules(severity, delivery);
  
  for (const rule of rules) {
    if (elapsedMs >= rule.afterMs && delivery.attempts < rule.maxResends) {
      return { shouldResend: true, useAlternativeChannel: rule.useAlternativeChannel };
    }
  }
  
  return { shouldResend: false, useAlternativeChannel: false };
}

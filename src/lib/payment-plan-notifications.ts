/**
 * Parent Communication Rules for Payment Plans
 * Respectful, supportive, non-judgmental messaging
 */

// ==================== NOTIFICATION TYPES ====================

export type PaymentPlanNotificationType =
  | 'plan_approved'
  | 'installment_received'
  | 'balance_reminder'
  | 'plan_completed'
  | 'payment_confirmation';

export interface PaymentPlanNotification {
  type: PaymentPlanNotificationType;
  studentName: string;
  guardianName: string;
  planDetails: {
    totalAmount: number;
    remainingBalance: number;
    nextDueDate?: string;
    nextDueAmount?: number;
    installmentsPaid: number;
    totalInstallments: number;
  };
  paymentDetails?: {
    amount: number;
    date: string;
    reference?: string;
  };
  schoolName: string;
  term: number;
  academicYear: number;
}

export interface NotificationTemplate {
  type: PaymentPlanNotificationType;
  subject: string;
  body: string;
  smsBody: string;
  whatsappBody: string;
}

// ==================== TRIGGER CONDITIONS ====================

export interface TriggerCondition {
  type: PaymentPlanNotificationType;
  description: string;
  triggerMode: 'automatic' | 'manual_only';
  requiresApproval: boolean;
  maxFrequency?: string;
  allowedActors: ('admin' | 'bursar' | 'finance_officer')[];
}

export const TRIGGER_CONDITIONS: Record<PaymentPlanNotificationType, TriggerCondition> = {
  plan_approved: {
    type: 'plan_approved',
    description: 'Sent when a payment plan is officially approved',
    triggerMode: 'automatic',
    requiresApproval: false, // Auto-sent on approval
    allowedActors: ['admin', 'bursar', 'finance_officer']
  },
  installment_received: {
    type: 'installment_received',
    description: 'Sent when a payment is recorded against an installment',
    triggerMode: 'automatic',
    requiresApproval: false,
    allowedActors: ['admin', 'bursar', 'finance_officer']
  },
  balance_reminder: {
    type: 'balance_reminder',
    description: 'Gentle reminder about upcoming or current balance',
    triggerMode: 'manual_only', // Never automated
    requiresApproval: true, // Must be reviewed before sending
    maxFrequency: 'once_per_week',
    allowedActors: ['admin', 'bursar']
  },
  plan_completed: {
    type: 'plan_completed',
    description: 'Sent when all installments are paid',
    triggerMode: 'automatic',
    requiresApproval: false,
    allowedActors: ['admin', 'bursar', 'finance_officer']
  },
  payment_confirmation: {
    type: 'payment_confirmation',
    description: 'Receipt confirmation for any payment made',
    triggerMode: 'automatic',
    requiresApproval: false,
    allowedActors: ['admin', 'bursar', 'finance_officer']
  }
};

// ==================== FORBIDDEN CONTENT ====================

export const FORBIDDEN_PHRASES = [
  // Threatening language
  'suspend',
  'expel',
  'remove from school',
  'denied access',
  'barred',
  'blocked',
  'prohibited',
  'banned',
  
  // Penalty language
  'penalty',
  'fine',
  'interest',
  'late fee',
  'additional charge',
  'surcharge',
  
  // Shame-inducing
  'defaulter',
  'delinquent',
  'failure to pay',
  'non-payment',
  'overdue',
  'arrears',
  'outstanding debt',
  'owe',
  'debt',
  
  // Legal threats
  'legal action',
  'court',
  'lawsuit',
  'collection agency',
  'credit report',
  'authorities',
  
  // Ultimatums
  'final notice',
  'last warning',
  'immediate action required',
  'consequences',
  'or else',
  'must pay now',
  'pay immediately',
  
  // Comparative/judgmental
  'other parents',
  'unlike others',
  'everyone else has',
  'you are the only',
  'disappointing'
];

export const FORBIDDEN_PATTERNS = [
  /fail(ed|ure|ing)?\s+to\s+pay/i,
  /if\s+you\s+don['']?t\s+pay/i,
  /your\s+child\s+will\s+(not|be)/i,
  /action\s+will\s+be\s+taken/i,
  /we\s+will\s+be\s+forced/i,
  /no\s+choice\s+but\s+to/i
];

/**
 * Validate message content for forbidden phrases
 */
export function validateMessageContent(content: string): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      violations.push(`Contains forbidden phrase: "${phrase}"`);
    }
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Contains forbidden pattern: ${pattern.source}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

// ==================== MESSAGE TEMPLATES ====================

/**
 * Format currency for parent display
 */
function formatAmount(amount: number): string {
  return `K${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for parent display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZM', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Generate plan approved notification
 */
function generatePlanApprovedTemplate(notification: PaymentPlanNotification): NotificationTemplate {
  const { studentName, guardianName, planDetails, schoolName, term, academicYear } = notification;
  
  const subject = `Payment Plan Confirmed - ${studentName}`;
  
  const body = `Dear ${guardianName},

We are pleased to confirm that a payment plan has been arranged for ${studentName}'s school fees for Term ${term}, ${academicYear}.

Plan Summary:
• Total Amount: ${formatAmount(planDetails.totalAmount)}
• Number of Installments: ${planDetails.totalInstallments}
${planDetails.nextDueDate ? `• First Payment Due: ${formatDate(planDetails.nextDueDate)}` : ''}
${planDetails.nextDueAmount ? `• First Installment: ${formatAmount(planDetails.nextDueAmount)}` : ''}

Thank you for working with us to support ${studentName}'s education. If you have any questions about this arrangement, please contact the school office.

Warm regards,
${schoolName}`;

  const smsBody = `${schoolName}: Dear ${guardianName}, your payment plan for ${studentName} (Term ${term}) has been confirmed. Total: ${formatAmount(planDetails.totalAmount)} in ${planDetails.totalInstallments} installments. Thank you.`;

  const whatsappBody = `*${schoolName}*\n\nDear ${guardianName},\n\nYour payment plan for *${studentName}* has been confirmed.\n\n📋 *Plan Details*\n• Total: ${formatAmount(planDetails.totalAmount)}\n• Installments: ${planDetails.totalInstallments}\n${planDetails.nextDueDate ? `• First Due: ${formatDate(planDetails.nextDueDate)}` : ''}\n\nThank you for your partnership in supporting ${studentName}'s education. 🙏`;

  return { type: 'plan_approved', subject, body, smsBody, whatsappBody };
}

/**
 * Generate installment received notification
 */
function generateInstallmentReceivedTemplate(notification: PaymentPlanNotification): NotificationTemplate {
  const { studentName, guardianName, planDetails, paymentDetails, schoolName } = notification;
  
  if (!paymentDetails) {
    throw new Error('Payment details required for installment received notification');
  }

  const subject = `Payment Received - Thank You`;
  
  const body = `Dear ${guardianName},

Thank you for your payment of ${formatAmount(paymentDetails.amount)} received on ${formatDate(paymentDetails.date)}.

Payment Summary:
• Amount Received: ${formatAmount(paymentDetails.amount)}
• Installments Completed: ${planDetails.installmentsPaid} of ${planDetails.totalInstallments}
• Remaining Balance: ${formatAmount(planDetails.remainingBalance)}
${planDetails.nextDueDate && planDetails.remainingBalance > 0 ? `• Next Due Date: ${formatDate(planDetails.nextDueDate)}` : ''}

We appreciate your continued support for ${studentName}'s education.

Warm regards,
${schoolName}`;

  const smsBody = `${schoolName}: Thank you! Payment of ${formatAmount(paymentDetails.amount)} received for ${studentName}. Installment ${planDetails.installmentsPaid}/${planDetails.totalInstallments} complete.`;

  const whatsappBody = `*${schoolName}*\n\n✅ *Payment Received*\n\nDear ${guardianName},\n\nThank you for your payment of *${formatAmount(paymentDetails.amount)}*.\n\n📊 *Progress*\n• Installments: ${planDetails.installmentsPaid}/${planDetails.totalInstallments}\n• Remaining: ${formatAmount(planDetails.remainingBalance)}\n\nWe appreciate your support! 🙏`;

  return { type: 'installment_received', subject, body, smsBody, whatsappBody };
}

/**
 * Generate balance reminder notification (manual trigger only)
 */
function generateBalanceReminderTemplate(notification: PaymentPlanNotification): NotificationTemplate {
  const { studentName, guardianName, planDetails, schoolName, term, academicYear } = notification;
  
  const subject = `Friendly Reminder - Payment Plan Update`;
  
  // Supportive, non-threatening language
  const body = `Dear ${guardianName},

We hope this message finds you well. This is a gentle reminder about ${studentName}'s payment plan for Term ${term}, ${academicYear}.

Current Status:
• Installments Completed: ${planDetails.installmentsPaid} of ${planDetails.totalInstallments}
• Current Balance: ${formatAmount(planDetails.remainingBalance)}
${planDetails.nextDueDate ? `• Next Installment Due: ${formatDate(planDetails.nextDueDate)}` : ''}
${planDetails.nextDueAmount ? `• Next Amount: ${formatAmount(planDetails.nextDueAmount)}` : ''}

If you have any questions or need to discuss your payment arrangement, please don't hesitate to contact the school office. We are here to help and support you.

Thank you for your continued partnership.

Warm regards,
${schoolName}`;

  const smsBody = `${schoolName}: Gentle reminder - ${studentName}'s payment plan balance is ${formatAmount(planDetails.remainingBalance)} (${planDetails.installmentsPaid}/${planDetails.totalInstallments} complete). Questions? Contact the school office.`;

  const whatsappBody = `*${schoolName}*\n\n📝 *Friendly Reminder*\n\nDear ${guardianName},\n\nA quick update on ${studentName}'s payment plan:\n\n• Balance: ${formatAmount(planDetails.remainingBalance)}\n• Progress: ${planDetails.installmentsPaid}/${planDetails.totalInstallments} installments\n${planDetails.nextDueDate ? `• Next Due: ${formatDate(planDetails.nextDueDate)}` : ''}\n\nQuestions? We're here to help. Contact the school office anytime. 🤝`;

  return { type: 'balance_reminder', subject, body, smsBody, whatsappBody };
}

/**
 * Generate plan completed notification
 */
function generatePlanCompletedTemplate(notification: PaymentPlanNotification): NotificationTemplate {
  const { studentName, guardianName, planDetails, schoolName, term, academicYear } = notification;
  
  const subject = `Payment Plan Complete - Thank You!`;
  
  const body = `Dear ${guardianName},

Wonderful news! The payment plan for ${studentName}'s school fees for Term ${term}, ${academicYear} has been completed.

Summary:
• Total Paid: ${formatAmount(planDetails.totalAmount)}
• All ${planDetails.totalInstallments} installments complete

Thank you so much for your commitment to ${studentName}'s education. Your partnership means a great deal to us.

With gratitude,
${schoolName}`;

  const smsBody = `${schoolName}: Congratulations! ${studentName}'s payment plan for Term ${term} is now complete. Thank you for your commitment to their education!`;

  const whatsappBody = `*${schoolName}*\n\n🎉 *Payment Plan Complete!*\n\nDear ${guardianName},\n\nWonderful news! ${studentName}'s payment plan for Term ${term} is fully paid.\n\n✅ Total: ${formatAmount(planDetails.totalAmount)}\n✅ All ${planDetails.totalInstallments} installments complete\n\nThank you for your dedication to ${studentName}'s education! 🙏💚`;

  return { type: 'plan_completed', subject, body, smsBody, whatsappBody };
}

/**
 * Generate payment confirmation
 */
function generatePaymentConfirmationTemplate(notification: PaymentPlanNotification): NotificationTemplate {
  const { studentName, guardianName, paymentDetails, schoolName } = notification;
  
  if (!paymentDetails) {
    throw new Error('Payment details required for payment confirmation');
  }

  const subject = `Payment Confirmation - ${formatAmount(paymentDetails.amount)}`;
  
  const body = `Dear ${guardianName},

This confirms receipt of your payment.

Payment Details:
• Amount: ${formatAmount(paymentDetails.amount)}
• Date: ${formatDate(paymentDetails.date)}
${paymentDetails.reference ? `• Reference: ${paymentDetails.reference}` : ''}
• Student: ${studentName}

Thank you for your payment.

${schoolName}`;

  const smsBody = `${schoolName}: Payment of ${formatAmount(paymentDetails.amount)} received for ${studentName} on ${formatDate(paymentDetails.date)}. Thank you!`;

  const whatsappBody = `*${schoolName}*\n\n✅ *Payment Confirmed*\n\n• Amount: ${formatAmount(paymentDetails.amount)}\n• Date: ${formatDate(paymentDetails.date)}\n• Student: ${studentName}\n${paymentDetails.reference ? `• Ref: ${paymentDetails.reference}` : ''}\n\nThank you! 🙏`;

  return { type: 'payment_confirmation', subject, body, smsBody, whatsappBody };
}

// ==================== MAIN GENERATOR ====================

/**
 * Generate notification template based on type
 */
export function generateNotificationTemplate(
  notification: PaymentPlanNotification
): NotificationTemplate {
  switch (notification.type) {
    case 'plan_approved':
      return generatePlanApprovedTemplate(notification);
    case 'installment_received':
      return generateInstallmentReceivedTemplate(notification);
    case 'balance_reminder':
      return generateBalanceReminderTemplate(notification);
    case 'plan_completed':
      return generatePlanCompletedTemplate(notification);
    case 'payment_confirmation':
      return generatePaymentConfirmationTemplate(notification);
    default:
      throw new Error(`Unknown notification type: ${notification.type}`);
  }
}

/**
 * Generate and validate notification
 */
export function generateSafeNotification(
  notification: PaymentPlanNotification
): {
  template: NotificationTemplate | null;
  valid: boolean;
  violations: string[];
} {
  try {
    const template = generateNotificationTemplate(notification);
    
    // Validate all content
    const bodyValidation = validateMessageContent(template.body);
    const smsValidation = validateMessageContent(template.smsBody);
    const whatsappValidation = validateMessageContent(template.whatsappBody);
    
    const allViolations = [
      ...bodyValidation.violations.map(v => `Email: ${v}`),
      ...smsValidation.violations.map(v => `SMS: ${v}`),
      ...whatsappValidation.violations.map(v => `WhatsApp: ${v}`)
    ];
    
    return {
      template: allViolations.length === 0 ? template : null,
      valid: allViolations.length === 0,
      violations: allViolations
    };
  } catch (error) {
    return {
      template: null,
      valid: false,
      violations: [(error as Error).message]
    };
  }
}

/**
 * Check if notification can be sent automatically
 */
export function canSendAutomatically(type: PaymentPlanNotificationType): boolean {
  return TRIGGER_CONDITIONS[type].triggerMode === 'automatic';
}

/**
 * Check if notification requires approval
 */
export function requiresApproval(type: PaymentPlanNotificationType): boolean {
  return TRIGGER_CONDITIONS[type].requiresApproval;
}

/**
 * Get allowed actors for a notification type
 */
export function getAllowedActors(
  type: PaymentPlanNotificationType
): ('admin' | 'bursar' | 'finance_officer')[] {
  return TRIGGER_CONDITIONS[type].allowedActors;
}

// ==================== DISPLAY CONFIG ====================

export const NOTIFICATION_TYPE_DISPLAY: Record<PaymentPlanNotificationType, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  plan_approved: {
    label: 'Plan Approved',
    description: 'Confirms payment plan has been set up',
    icon: 'CheckCircle',
    color: 'text-green-600'
  },
  installment_received: {
    label: 'Payment Received',
    description: 'Thanks parent for installment payment',
    icon: 'Receipt',
    color: 'text-blue-600'
  },
  balance_reminder: {
    label: 'Balance Reminder',
    description: 'Gentle reminder about current balance (manual only)',
    icon: 'Bell',
    color: 'text-amber-600'
  },
  plan_completed: {
    label: 'Plan Complete',
    description: 'Celebrates completion of all payments',
    icon: 'PartyPopper',
    color: 'text-green-700'
  },
  payment_confirmation: {
    label: 'Payment Confirmation',
    description: 'Simple receipt confirmation',
    icon: 'FileCheck',
    color: 'text-muted-foreground'
  }
};

/**
 * Parent-Facing Fee Summary
 * Simple, read-only view with warm language and no internal details
 */

import { formatZMW } from './school-fees-system';
import type { FeeStatus, SimplifiedFeeStatus } from './student-fee-status';

// Parent-friendly fee summary (what parents see)
export interface ParentFeeSummary {
  studentName: string;
  academicYear: number;
  term: number;
  termLabel: string;
  
  // Simple totals (no breakdown by category unless requested)
  totalFees: number;
  amountPaid: number;
  balance: number;
  
  // Formatted for display
  totalFeesDisplay: string;
  amountPaidDisplay: string;
  balanceDisplay: string;
  
  // Simple status
  status: ParentFeeStatus;
  statusMessage: string;
  
  // Recent payments (sanitized)
  recentPayments: ParentPaymentRecord[];
  
  // Optional category breakdown (simple names only)
  categories?: ParentFeeCategory[];
  
  // Helpful info
  lastUpdated: string;
  nextDueDate?: string;
  nextDueDateMessage?: string;
  
  // Payment arrangement (if applicable)
  hasPaymentPlan?: boolean;
  paymentPlanMessage?: string;
}

// Parent-friendly status (simplified, warm language)
export type ParentFeeStatus = 
  | 'all_clear'      // Fully paid
  | 'balance_due'    // Has balance
  | 'payment_plan'   // On arrangement
  | 'credit';        // Overpaid

// Sanitized payment record for parents
export interface ParentPaymentRecord {
  date: string;
  dateDisplay: string;
  amount: number;
  amountDisplay: string;
  method: string;  // Friendly name only
  reference?: string;  // Receipt number if available
}

// Simple fee category for parents
export interface ParentFeeCategory {
  name: string;  // Friendly name
  amount: number;
  amountDisplay: string;
  paid: number;
  paidDisplay: string;
  remaining: number;
  remainingDisplay: string;
}

// Status configuration with parent-friendly messaging
export const PARENT_STATUS_CONFIG: Record<ParentFeeStatus, {
  label: string;
  message: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  all_clear: {
    label: 'Fees Cleared',
    message: 'Thank you! All school fees for this term have been received.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: 'CheckCircle'
  },
  balance_due: {
    label: 'Balance Due',
    message: 'There is an outstanding balance for this term.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: 'Clock'
  },
  payment_plan: {
    label: 'Payment Plan Active',
    message: 'A payment arrangement is in place for this term.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: 'Calendar'
  },
  credit: {
    label: 'Credit Balance',
    message: 'There is a credit balance on your account.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: 'Gift'
  }
};

// Friendly payment method names (hide internal codes)
const FRIENDLY_PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  mtn_money: 'Mobile Money',
  airtel_money: 'Mobile Money',
  zamtel_money: 'Mobile Money',
  cheque: 'Cheque',
  scholarship: 'Scholarship',
  bursary: 'Bursary',
  government_subsidy: 'Government Support'
};

// Fee category friendly names
const FRIENDLY_CATEGORY_NAMES: Record<string, string> = {
  TUITION: 'Tuition Fees',
  tuition: 'Tuition Fees',
  PTA: 'PTA Levy',
  pta: 'PTA Levy',
  EXAM: 'Examination Fees',
  exam: 'Examination Fees',
  TRANSPORT: 'Transport',
  transport: 'Transport',
  BOARDING: 'Boarding Fees',
  boarding: 'Boarding Fees',
  UNIFORM: 'Uniform',
  uniform: 'Uniform',
  BOOKS: 'Books & Materials',
  books: 'Books & Materials',
  ACTIVITY: 'Activities',
  activity: 'Activities',
  OTHER: 'Other Fees',
  other: 'Other Fees'
};

// Term labels
const TERM_LABELS: Record<number, string> = {
  1: 'Term 1',
  2: 'Term 2',
  3: 'Term 3'
};

/**
 * Convert internal fee status to parent-friendly status
 */
export function toParentFeeStatus(
  internalStatus: FeeStatus | SimplifiedFeeStatus,
  hasArrangement: boolean = false
): ParentFeeStatus {
  if (hasArrangement) return 'payment_plan';
  
  // Handle FeeStatus values
  if (internalStatus === 'paid') return 'all_clear';
  if (internalStatus === 'overpaid') return 'credit';
  if (internalStatus === 'on_arrangement') return 'payment_plan';
  if (internalStatus === 'partially_paid') return 'balance_due';
  if (internalStatus === 'outstanding') return 'balance_due';
  
  // Handle SimplifiedFeeStatus values
  if (internalStatus === 'cleared') return 'all_clear';
  if (internalStatus === 'arrangement') return 'payment_plan';
  if (internalStatus === 'owing') return 'balance_due';
  
  return 'balance_due';
}

/**
 * Get friendly payment method name
 */
export function getFriendlyPaymentMethod(method: string): string {
  return FRIENDLY_PAYMENT_METHODS[method.toLowerCase()] || 'Payment';
}

/**
 * Get friendly category name
 */
export function getFriendlyCategoryName(code: string): string {
  return FRIENDLY_CATEGORY_NAMES[code] || code;
}

/**
 * Format date for parent display
 */
export function formatDateForParent(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Build parent fee summary from internal data
 * Sanitizes and simplifies data for parent view
 */
export function buildParentFeeSummary(input: {
  studentName: string;
  academicYear: number;
  term: number;
  totalFees: number;
  amountPaid: number;
  internalStatus: FeeStatus;
  hasArrangement?: boolean;
  arrangementDetails?: {
    nextDueDate?: string;
    installmentAmount?: number;
    remainingInstallments?: number;
  };
  payments?: Array<{
    date: string;
    amount: number;
    method: string;
    receiptNumber?: string;
  }>;
  categories?: Array<{
    code: string;
    name?: string;
    amount: number;
    paid: number;
  }>;
  nextDueDate?: string;
}): ParentFeeSummary {
  const balance = input.totalFees - input.amountPaid;
  const status = toParentFeeStatus(input.internalStatus, input.hasArrangement);
  const statusConfig = PARENT_STATUS_CONFIG[status];
  
  // Build recent payments (sanitized - no staff names, no internal IDs)
  const recentPayments: ParentPaymentRecord[] = (input.payments || [])
    .slice(0, 5) // Show last 5 only
    .map(p => ({
      date: p.date,
      dateDisplay: formatDateForParent(p.date),
      amount: p.amount,
      amountDisplay: formatZMW(p.amount),
      method: getFriendlyPaymentMethod(p.method),
      reference: p.receiptNumber
    }));
  
  // Build category breakdown (simplified)
  const categories: ParentFeeCategory[] | undefined = input.categories?.map(c => ({
    name: c.name || getFriendlyCategoryName(c.code),
    amount: c.amount,
    amountDisplay: formatZMW(c.amount),
    paid: c.paid,
    paidDisplay: formatZMW(c.paid),
    remaining: c.amount - c.paid,
    remainingDisplay: formatZMW(Math.max(0, c.amount - c.paid))
  }));
  
  // Build due date message
  let nextDueDateMessage: string | undefined;
  if (input.nextDueDate && balance > 0) {
    const dueDate = new Date(input.nextDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      nextDueDateMessage = `Payment was due on ${formatDateForParent(input.nextDueDate)}`;
    } else if (daysUntilDue === 0) {
      nextDueDateMessage = 'Payment is due today';
    } else if (daysUntilDue <= 7) {
      nextDueDateMessage = `Payment due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;
    } else {
      nextDueDateMessage = `Payment due by ${formatDateForParent(input.nextDueDate)}`;
    }
  }
  
  // Build payment plan message
  let paymentPlanMessage: string | undefined;
  if (input.hasArrangement && input.arrangementDetails) {
    const { nextDueDate, installmentAmount, remainingInstallments } = input.arrangementDetails;
    if (nextDueDate && installmentAmount) {
      paymentPlanMessage = `Next payment of ${formatZMW(installmentAmount)} due ${formatDateForParent(nextDueDate)}`;
      if (remainingInstallments) {
        paymentPlanMessage += ` (${remainingInstallments} payment${remainingInstallments > 1 ? 's' : ''} remaining)`;
      }
    }
  }
  
  return {
    studentName: input.studentName,
    academicYear: input.academicYear,
    term: input.term,
    termLabel: TERM_LABELS[input.term] || `Term ${input.term}`,
    
    totalFees: input.totalFees,
    amountPaid: input.amountPaid,
    balance: Math.abs(balance),
    
    totalFeesDisplay: formatZMW(input.totalFees),
    amountPaidDisplay: formatZMW(input.amountPaid),
    balanceDisplay: formatZMW(Math.abs(balance)),
    
    status,
    statusMessage: statusConfig.message,
    
    recentPayments,
    categories,
    
    lastUpdated: new Date().toISOString(),
    nextDueDate: input.nextDueDate,
    nextDueDateMessage,
    
    hasPaymentPlan: input.hasArrangement,
    paymentPlanMessage
  };
}

/**
 * Get status display info for parent view
 */
export function getParentStatusDisplay(status: ParentFeeStatus): {
  label: string;
  message: string;
  className: string;
  icon: string;
} {
  const config = PARENT_STATUS_CONFIG[status];
  return {
    label: config.label,
    message: config.message,
    className: `${config.color} ${config.bgColor}`,
    icon: config.icon
  };
}

/**
 * Generate a simple text summary for SMS or low-data scenarios
 */
export function generateTextSummary(summary: ParentFeeSummary): string {
  let text = `${summary.studentName} - ${summary.termLabel} ${summary.academicYear}\n`;
  text += `Total: ${summary.totalFeesDisplay}\n`;
  text += `Paid: ${summary.amountPaidDisplay}\n`;
  
  if (summary.status === 'all_clear') {
    text += 'Status: Fees Cleared ✓';
  } else if (summary.status === 'credit') {
    text += `Credit: ${summary.balanceDisplay}`;
  } else {
    text += `Balance: ${summary.balanceDisplay}`;
    if (summary.nextDueDateMessage) {
      text += `\n${summary.nextDueDateMessage}`;
    }
  }
  
  if (summary.paymentPlanMessage) {
    text += `\n${summary.paymentPlanMessage}`;
  }
  
  return text;
}

/**
 * Check if summary should show balance as concerning
 * (used for visual emphasis, not negative language)
 */
export function shouldEmphasizeBalance(summary: ParentFeeSummary): boolean {
  if (summary.status === 'all_clear' || summary.status === 'credit') {
    return false;
  }
  
  // Don't emphasize if on payment plan and current
  if (summary.hasPaymentPlan) {
    return false;
  }
  
  // Emphasize if overdue
  if (summary.nextDueDate) {
    const dueDate = new Date(summary.nextDueDate);
    const today = new Date();
    return today > dueDate;
  }
  
  return false;
}

/**
 * Filter payments to exclude internal adjustments
 * Only show actual payments parents would recognize
 */
export function filterPaymentsForParent(payments: Array<{
  type: string;
  amount: number;
  date: string;
  method: string;
  receiptNumber?: string;
  isAdjustment?: boolean;
  isInternal?: boolean;
}>): Array<{
  date: string;
  amount: number;
  method: string;
  receiptNumber?: string;
}> {
  return payments
    .filter(p => {
      // Exclude internal adjustments
      if (p.isAdjustment || p.isInternal) return false;
      // Exclude reversals and corrections
      if (p.type === 'reversal' || p.type === 'correction') return false;
      // Only show credits (payments)
      if (p.amount <= 0) return false;
      return true;
    })
    .map(p => ({
      date: p.date,
      amount: p.amount,
      method: p.method,
      receiptNumber: p.receiptNumber
    }));
}

/**
 * Student Fee Status System
 * Auto-calculated from ledger with role-based visibility
 */

import type { LedgerBalance } from './student-fee-ledger';

// Fee status states
export type FeeStatus = 
  | 'paid'
  | 'partially_paid'
  | 'outstanding'
  | 'overpaid'
  | 'on_arrangement';

// Simplified status for teachers
export type SimplifiedFeeStatus = 
  | 'cleared'      // paid or overpaid
  | 'owing'        // partially_paid, outstanding, or on_arrangement
  | 'arrangement'; // on_arrangement (special case teachers should know)

// Role types for visibility
export type FeeViewerRole = 'teacher' | 'admin' | 'school_admin' | 'bursar' | 'parent';

// Payment arrangement details
export interface PaymentArrangement {
  id: string;
  studentId: string;
  schoolId: string;
  totalAmount: number;
  amountPaid: number;
  installmentAmount: number;
  installmentFrequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  nextDueDate: string;
  installmentsPaid: number;
  totalInstallments: number;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  createdAt: string;
  createdBy: string;
  notes?: string;
}

// Full fee status details (admin view)
export interface FullFeeStatus {
  status: FeeStatus;
  balance: number;
  totalCharged: number;
  totalPaid: number;
  totalCredits: number;
  percentagePaid: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  daysSinceLastPayment?: number;
  isOverdue: boolean;
  overdueAmount?: number;
  overdueDays?: number;
  arrangement?: PaymentArrangement;
  statusSince: string;
  academicYear: number;
  term?: number;
}

// Simplified fee status (teacher view)
export interface SimplifiedFeeStatusView {
  status: SimplifiedFeeStatus;
  displayLabel: string;
  colorClass: string;
  icon: string;
  canAccessDetails: false;
}

// Admin fee status view
export interface AdminFeeStatusView extends FullFeeStatus {
  displayLabel: string;
  colorClass: string;
  icon: string;
  canAccessDetails: true;
  breakdown: FeeBreakdownItem[];
  recentTransactions: RecentTransaction[];
}

export interface FeeBreakdownItem {
  categoryId: string;
  categoryName: string;
  charged: number;
  paid: number;
  balance: number;
  status: FeeStatus;
}

export interface RecentTransaction {
  id: string;
  date: string;
  type: 'charge' | 'payment' | 'credit' | 'adjustment';
  amount: number;
  description: string;
}

// Status configuration
export const FEE_STATUS_CONFIG: Record<FeeStatus, {
  label: string;
  simplifiedStatus: SimplifiedFeeStatus;
  color: string;
  bgColor: string;
  icon: string;
  priority: number; // for sorting/display
  description: string;
}> = {
  paid: {
    label: 'Fully Paid',
    simplifiedStatus: 'cleared',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
    priority: 1,
    description: 'All fees have been paid in full'
  },
  overpaid: {
    label: 'Overpaid',
    simplifiedStatus: 'cleared',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'ArrowUpCircle',
    priority: 2,
    description: 'Payment exceeds amount owed - credit balance exists'
  },
  on_arrangement: {
    label: 'On Payment Plan',
    simplifiedStatus: 'arrangement',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'Calendar',
    priority: 3,
    description: 'Active payment arrangement in place'
  },
  partially_paid: {
    label: 'Partially Paid',
    simplifiedStatus: 'owing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'Clock',
    priority: 4,
    description: 'Some payments made, balance remaining'
  },
  outstanding: {
    label: 'Outstanding',
    simplifiedStatus: 'owing',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'AlertCircle',
    priority: 5,
    description: 'No payments recorded against charges'
  }
};

export const SIMPLIFIED_STATUS_CONFIG: Record<SimplifiedFeeStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  cleared: {
    label: 'Fees Cleared',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle'
  },
  owing: {
    label: 'Fees Owing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'Clock'
  },
  arrangement: {
    label: 'Payment Plan',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'Calendar'
  }
};

// Visibility rules by role
export const VISIBILITY_RULES: Record<FeeViewerRole, {
  canSeeFullStatus: boolean;
  canSeeBalance: boolean;
  canSeeBreakdown: boolean;
  canSeeTransactions: boolean;
  canSeeArrangementDetails: boolean;
  canSeeOverdueInfo: boolean;
  canRecordPayments: boolean;
  canCreateArrangements: boolean;
  canExportData: boolean;
}> = {
  teacher: {
    canSeeFullStatus: false,
    canSeeBalance: false,
    canSeeBreakdown: false,
    canSeeTransactions: false,
    canSeeArrangementDetails: false,
    canSeeOverdueInfo: false,
    canRecordPayments: false,
    canCreateArrangements: false,
    canExportData: false
  },
  parent: {
    canSeeFullStatus: true,
    canSeeBalance: true,
    canSeeBreakdown: true,
    canSeeTransactions: true,
    canSeeArrangementDetails: true,
    canSeeOverdueInfo: true,
    canRecordPayments: false,
    canCreateArrangements: false,
    canExportData: false
  },
  admin: {
    canSeeFullStatus: true,
    canSeeBalance: true,
    canSeeBreakdown: true,
    canSeeTransactions: true,
    canSeeArrangementDetails: true,
    canSeeOverdueInfo: true,
    canRecordPayments: true,
    canCreateArrangements: true,
    canExportData: true
  },
  school_admin: {
    canSeeFullStatus: true,
    canSeeBalance: true,
    canSeeBreakdown: true,
    canSeeTransactions: true,
    canSeeArrangementDetails: true,
    canSeeOverdueInfo: true,
    canRecordPayments: true,
    canCreateArrangements: true,
    canExportData: true
  },
  bursar: {
    canSeeFullStatus: true,
    canSeeBalance: true,
    canSeeBreakdown: true,
    canSeeTransactions: true,
    canSeeArrangementDetails: true,
    canSeeOverdueInfo: true,
    canRecordPayments: true,
    canCreateArrangements: true,
    canExportData: true
  }
};

/**
 * Calculate fee status from ledger balance
 * Status Logic Table:
 * | Condition                          | Status          |
 * |------------------------------------|-----------------|
 * | balance == 0 && totalDebits > 0    | paid            |
 * | balance < 0                        | overpaid        |
 * | balance > 0 && totalCredits > 0    | partially_paid  |
 * | balance > 0 && totalCredits == 0   | outstanding     |
 * | hasActiveArrangement               | on_arrangement  |
 */
export function calculateFeeStatus(
  ledgerBalance: LedgerBalance,
  hasActiveArrangement: boolean = false
): FeeStatus {
  const { currentBalance, totalDebits, totalCredits } = ledgerBalance;
  
  // On arrangement takes precedence if active
  if (hasActiveArrangement && currentBalance > 0) {
    return 'on_arrangement';
  }
  
  // Overpaid: credit balance (negative balance means student is in credit)
  if (currentBalance < 0) {
    return 'overpaid';
  }
  
  // Fully paid: zero balance with some charges
  if (currentBalance === 0 && totalDebits > 0) {
    return 'paid';
  }
  
  // Fully paid: no charges at all (nothing owed)
  if (currentBalance === 0 && totalDebits === 0) {
    return 'paid';
  }
  
  // Partially paid: has some payments but still owes
  if (currentBalance > 0 && totalCredits > 0) {
    return 'partially_paid';
  }
  
  // Outstanding: has charges but no payments
  return 'outstanding';
}

/**
 * Get simplified status for teacher view
 */
export function getSimplifiedStatus(status: FeeStatus): SimplifiedFeeStatus {
  return FEE_STATUS_CONFIG[status].simplifiedStatus;
}

/**
 * Get status view based on role
 */
export function getStatusViewForRole(
  fullStatus: FullFeeStatus,
  role: FeeViewerRole
): SimplifiedFeeStatusView | AdminFeeStatusView {
  const rules = VISIBILITY_RULES[role];
  const config = FEE_STATUS_CONFIG[fullStatus.status];
  
  if (!rules.canSeeFullStatus) {
    // Teacher/simplified view
    const simplified = getSimplifiedStatus(fullStatus.status);
    const simplifiedConfig = SIMPLIFIED_STATUS_CONFIG[simplified];
    
    return {
      status: simplified,
      displayLabel: simplifiedConfig.label,
      colorClass: `${simplifiedConfig.color} ${simplifiedConfig.bgColor}`,
      icon: simplifiedConfig.icon,
      canAccessDetails: false
    };
  }
  
  // Full admin view
  return {
    ...fullStatus,
    displayLabel: config.label,
    colorClass: `${config.color} ${config.bgColor}`,
    icon: config.icon,
    canAccessDetails: true,
    breakdown: [], // Would be populated from actual data
    recentTransactions: [] // Would be populated from actual data
  };
}

/**
 * Calculate percentage paid
 */
export function calculatePercentagePaid(totalCharged: number, totalPaid: number): number {
  if (totalCharged === 0) return 100;
  return Math.min(100, Math.round((totalPaid / totalCharged) * 100));
}

/**
 * Check if payment is overdue based on term due date
 */
export function isPaymentOverdue(
  currentBalance: number,
  termDueDate?: string
): { isOverdue: boolean; overdueDays?: number } {
  if (currentBalance <= 0 || !termDueDate) {
    return { isOverdue: false };
  }
  
  const dueDate = new Date(termDueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  if (today > dueDate) {
    const diffTime = today.getTime() - dueDate.getTime();
    const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { isOverdue: true, overdueDays };
  }
  
  return { isOverdue: false };
}

/**
 * Build full fee status from ledger data
 */
export function buildFullFeeStatus(
  ledgerBalance: LedgerBalance,
  arrangement?: PaymentArrangement,
  lastPayment?: { date: string; amount: number },
  termDueDate?: string,
  academicYear: number = new Date().getFullYear(),
  term?: number
): FullFeeStatus {
  const hasActiveArrangement = arrangement?.status === 'active';
  const status = calculateFeeStatus(ledgerBalance, hasActiveArrangement);
  const { isOverdue, overdueDays } = isPaymentOverdue(ledgerBalance.currentBalance, termDueDate);
  
  let daysSinceLastPayment: number | undefined;
  if (lastPayment?.date) {
    const lastDate = new Date(lastPayment.date);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    daysSinceLastPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return {
    status,
    balance: ledgerBalance.currentBalance,
    totalCharged: ledgerBalance.totalDebits,
    totalPaid: ledgerBalance.totalCredits,
    totalCredits: ledgerBalance.totalCredits,
    percentagePaid: calculatePercentagePaid(ledgerBalance.totalDebits, ledgerBalance.totalCredits),
    lastPaymentDate: lastPayment?.date,
    lastPaymentAmount: lastPayment?.amount,
    daysSinceLastPayment,
    isOverdue,
    overdueAmount: isOverdue ? ledgerBalance.currentBalance : undefined,
    overdueDays,
    arrangement: hasActiveArrangement ? arrangement : undefined,
    statusSince: new Date().toISOString(),
    academicYear,
    term
  };
}

/**
 * Get status badge display info
 */
export function getStatusBadgeInfo(status: FeeStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  switch (status) {
    case 'paid':
      return { 
        label: 'Paid', 
        variant: 'default',
        className: 'bg-green-100 text-green-800 hover:bg-green-100'
      };
    case 'overpaid':
      return { 
        label: 'Credit', 
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      };
    case 'on_arrangement':
      return { 
        label: 'Plan', 
        variant: 'secondary',
        className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
      };
    case 'partially_paid':
      return { 
        label: 'Partial', 
        variant: 'secondary',
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
      };
    case 'outstanding':
      return { 
        label: 'Owing', 
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 hover:bg-red-100'
      };
  }
}

/**
 * Get simplified badge for teacher view
 */
export function getSimplifiedBadgeInfo(status: SimplifiedFeeStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'cleared':
      return { 
        label: 'Cleared', 
        className: 'bg-green-100 text-green-800'
      };
    case 'owing':
      return { 
        label: 'Owing', 
        className: 'bg-orange-100 text-orange-800'
      };
    case 'arrangement':
      return { 
        label: 'Plan', 
        className: 'bg-amber-100 text-amber-800'
      };
  }
}

/**
 * Sort students by fee status priority
 */
export function sortByFeeStatus<T extends { feeStatus: FeeStatus }>(
  students: T[],
  ascending: boolean = false
): T[] {
  return [...students].sort((a, b) => {
    const priorityA = FEE_STATUS_CONFIG[a.feeStatus].priority;
    const priorityB = FEE_STATUS_CONFIG[b.feeStatus].priority;
    return ascending ? priorityA - priorityB : priorityB - priorityA;
  });
}

/**
 * Filter students by fee status
 */
export function filterByFeeStatus<T extends { feeStatus: FeeStatus }>(
  students: T[],
  statuses: FeeStatus[]
): T[] {
  return students.filter(s => statuses.includes(s.feeStatus));
}

/**
 * Get status summary for a class/group
 */
export function getStatusSummary(statuses: FeeStatus[]): Record<FeeStatus, number> {
  const summary: Record<FeeStatus, number> = {
    paid: 0,
    overpaid: 0,
    on_arrangement: 0,
    partially_paid: 0,
    outstanding: 0
  };
  
  statuses.forEach(status => {
    summary[status]++;
  });
  
  return summary;
}

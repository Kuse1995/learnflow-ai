/**
 * Student Fee Ledger System
 * 
 * Append-only, immutable ledger for tracking all fee transactions.
 * Balance is computed from entries, never stored independently.
 * No deletions allowed - only reversals and adjustments.
 */

import { supabase } from '@/integrations/supabase/client';
import { formatZMW } from './school-fees-system';

// =============================================================================
// TYPES
// =============================================================================

export type LedgerEntryType = 
  | 'charge'            // Fee charged to student
  | 'payment'           // Payment received
  | 'credit'            // Credit applied (e.g., overpayment)
  | 'adjustment_debit'  // Increase balance (correction)
  | 'adjustment_credit' // Decrease balance (correction)
  | 'waiver'            // Fee waived
  | 'reversal'          // Reverse a previous entry
  | 'transfer_in'       // Balance transferred from another term/year
  | 'transfer_out';     // Balance transferred to another term/year

export interface LedgerEntry {
  id: string;
  schoolId: string;
  studentId: string;
  entryType: LedgerEntryType;
  entryDate: Date;
  effectiveDate: Date;
  academicYear: number;
  term: number | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  feeCategoryId?: string;
  feeStructureId?: string;
  paymentId?: string;
  relatedEntryId?: string;
  description: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  recordedByRole?: string;
  recordedAt: Date;
  entryHash: string;
  previousHash?: string;
  sequenceNumber: number;
}

export interface LedgerEntryInput {
  schoolId: string;
  studentId: string;
  entryType: LedgerEntryType;
  entryDate?: Date;
  effectiveDate?: Date;
  academicYear: number;
  term?: number | null;
  amount: number; // Will be assigned to debit or credit based on entry type
  feeCategoryId?: string;
  feeStructureId?: string;
  paymentId?: string;
  relatedEntryId?: string;
  description: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  recordedByRole?: string;
}

export interface LedgerBalance {
  studentId: string;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  entryCount: number;
  lastEntryDate?: Date;
}

export interface LedgerSummary {
  studentId: string;
  academicYear: number;
  term?: number;
  openingBalance: number;
  totalCharges: number;
  totalPayments: number;
  totalWaivers: number;
  totalAdjustments: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface BalanceByCategory {
  categoryId: string;
  categoryName: string;
  charged: number;
  paid: number;
  waived: number;
  balance: number;
}

// =============================================================================
// ENTRY TYPE CONFIGURATION
// =============================================================================

export const LEDGER_ENTRY_CONFIG: Record<LedgerEntryType, {
  label: string;
  isDebit: boolean; // true = increases balance, false = decreases
  color: string;
  icon: string;
  requiresRelatedEntry: boolean;
  requiresApproval: boolean;
}> = {
  charge: {
    label: 'Charge',
    isDebit: true,
    color: 'text-red-700',
    icon: 'plus-circle',
    requiresRelatedEntry: false,
    requiresApproval: false,
  },
  payment: {
    label: 'Payment',
    isDebit: false,
    color: 'text-emerald-700',
    icon: 'check-circle',
    requiresRelatedEntry: false,
    requiresApproval: false,
  },
  credit: {
    label: 'Credit',
    isDebit: false,
    color: 'text-blue-700',
    icon: 'arrow-down-circle',
    requiresRelatedEntry: false,
    requiresApproval: true,
  },
  adjustment_debit: {
    label: 'Adjustment (Debit)',
    isDebit: true,
    color: 'text-orange-700',
    icon: 'edit',
    requiresRelatedEntry: false,
    requiresApproval: true,
  },
  adjustment_credit: {
    label: 'Adjustment (Credit)',
    isDebit: false,
    color: 'text-purple-700',
    icon: 'edit',
    requiresRelatedEntry: false,
    requiresApproval: true,
  },
  waiver: {
    label: 'Waiver',
    isDebit: false,
    color: 'text-teal-700',
    icon: 'gift',
    requiresRelatedEntry: true,
    requiresApproval: true,
  },
  reversal: {
    label: 'Reversal',
    isDebit: false, // Depends on what's being reversed
    color: 'text-gray-700',
    icon: 'rotate-ccw',
    requiresRelatedEntry: true,
    requiresApproval: true,
  },
  transfer_in: {
    label: 'Transfer In',
    isDebit: true,
    color: 'text-indigo-700',
    icon: 'arrow-right-circle',
    requiresRelatedEntry: false,
    requiresApproval: true,
  },
  transfer_out: {
    label: 'Transfer Out',
    isDebit: false,
    color: 'text-indigo-700',
    icon: 'arrow-left-circle',
    requiresRelatedEntry: false,
    requiresApproval: true,
  },
};

// =============================================================================
// BALANCE CALCULATION (Pure Functions - No DB)
// =============================================================================

/**
 * Calculate balance from ledger entries
 * This is the source of truth - balance is NEVER stored
 */
export function calculateBalanceFromEntries(entries: LedgerEntry[]): LedgerBalance {
  if (entries.length === 0) {
    return {
      studentId: '',
      totalDebits: 0,
      totalCredits: 0,
      currentBalance: 0,
      entryCount: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  const totalDebits = sorted.reduce((sum, e) => sum + e.debitAmount, 0);
  const totalCredits = sorted.reduce((sum, e) => sum + e.creditAmount, 0);
  const lastEntry = sorted[sorted.length - 1];

  return {
    studentId: sorted[0].studentId,
    totalDebits,
    totalCredits,
    currentBalance: totalDebits - totalCredits,
    entryCount: sorted.length,
    lastEntryDate: lastEntry.entryDate,
  };
}

/**
 * Calculate balance at a specific point in time
 */
export function calculateBalanceAtDate(entries: LedgerEntry[], asOfDate: Date): number {
  const relevantEntries = entries.filter(e => e.effectiveDate <= asOfDate);
  const balance = calculateBalanceFromEntries(relevantEntries);
  return balance.currentBalance;
}

/**
 * Calculate balance for a specific term
 */
export function calculateTermBalance(
  entries: LedgerEntry[],
  academicYear: number,
  term: number
): number {
  const termEntries = entries.filter(e => 
    e.academicYear === academicYear && 
    (e.term === term || e.term === null) // Include annual entries
  );
  return calculateBalanceFromEntries(termEntries).currentBalance;
}

/**
 * Get balance breakdown by category
 */
export function getBalanceByCategory(
  entries: LedgerEntry[],
  categories: { id: string; name: string }[]
): BalanceByCategory[] {
  const categoryMap = new Map<string, BalanceByCategory>();

  // Initialize categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, {
      categoryId: cat.id,
      categoryName: cat.name,
      charged: 0,
      paid: 0,
      waived: 0,
      balance: 0,
    });
  });

  // Aggregate entries
  entries.forEach(entry => {
    if (!entry.feeCategoryId) return;
    
    const category = categoryMap.get(entry.feeCategoryId);
    if (!category) return;

    switch (entry.entryType) {
      case 'charge':
        category.charged += entry.debitAmount;
        break;
      case 'payment':
      case 'credit':
        category.paid += entry.creditAmount;
        break;
      case 'waiver':
        category.waived += entry.creditAmount;
        break;
      case 'adjustment_debit':
        category.charged += entry.debitAmount;
        break;
      case 'adjustment_credit':
        category.paid += entry.creditAmount;
        break;
    }
  });

  // Calculate balances
  categoryMap.forEach(cat => {
    cat.balance = cat.charged - cat.paid - cat.waived;
  });

  return Array.from(categoryMap.values()).filter(c => c.charged > 0 || c.paid > 0);
}

/**
 * Generate ledger summary for a period
 */
export function generateLedgerSummary(
  entries: LedgerEntry[],
  academicYear: number,
  term?: number
): LedgerSummary {
  const filtered = entries.filter(e => {
    if (e.academicYear !== academicYear) return false;
    if (term !== undefined && e.term !== null && e.term !== term) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  // Get opening balance (balance before first entry in period)
  const firstEntry = sorted[0];
  const openingBalance = firstEntry 
    ? firstEntry.runningBalance - firstEntry.debitAmount + firstEntry.creditAmount
    : 0;

  // Aggregate by type
  let totalCharges = 0;
  let totalPayments = 0;
  let totalWaivers = 0;
  let totalAdjustments = 0;

  sorted.forEach(entry => {
    switch (entry.entryType) {
      case 'charge':
        totalCharges += entry.debitAmount;
        break;
      case 'payment':
      case 'credit':
        totalPayments += entry.creditAmount;
        break;
      case 'waiver':
        totalWaivers += entry.creditAmount;
        break;
      case 'adjustment_debit':
        totalAdjustments += entry.debitAmount;
        break;
      case 'adjustment_credit':
        totalAdjustments -= entry.creditAmount;
        break;
    }
  });

  const closingBalance = openingBalance + totalCharges - totalPayments - totalWaivers + totalAdjustments;

  return {
    studentId: sorted[0]?.studentId || '',
    academicYear,
    term,
    openingBalance,
    totalCharges,
    totalPayments,
    totalWaivers,
    totalAdjustments,
    closingBalance,
    entries: sorted,
  };
}

// =============================================================================
// ENTRY CREATION HELPERS
// =============================================================================

/**
 * Prepare a ledger entry input for submission
 */
export function prepareLedgerEntry(input: LedgerEntryInput): {
  debitAmount: number;
  creditAmount: number;
} {
  const config = LEDGER_ENTRY_CONFIG[input.entryType];
  
  return {
    debitAmount: config.isDebit ? input.amount : 0,
    creditAmount: config.isDebit ? 0 : input.amount,
  };
}

/**
 * Create a charge entry
 */
export function createChargeEntry(
  schoolId: string,
  studentId: string,
  academicYear: number,
  term: number | null,
  amount: number,
  categoryId: string,
  structureId: string,
  description: string,
  recordedBy: string,
  recordedByRole: string
): LedgerEntryInput {
  return {
    schoolId,
    studentId,
    entryType: 'charge',
    academicYear,
    term,
    amount,
    feeCategoryId: categoryId,
    feeStructureId: structureId,
    description,
    recordedBy,
    recordedByRole,
  };
}

/**
 * Create a payment entry
 */
export function createPaymentEntry(
  schoolId: string,
  studentId: string,
  academicYear: number,
  term: number | null,
  amount: number,
  paymentId: string,
  referenceNumber: string,
  description: string,
  recordedBy: string,
  recordedByRole: string
): LedgerEntryInput {
  return {
    schoolId,
    studentId,
    entryType: 'payment',
    academicYear,
    term,
    amount,
    paymentId,
    referenceNumber,
    description,
    recordedBy,
    recordedByRole,
  };
}

/**
 * Create a reversal entry
 */
export function createReversalEntry(
  originalEntry: LedgerEntry,
  reason: string,
  recordedBy: string,
  recordedByRole: string
): LedgerEntryInput {
  // Reversal inverts the original entry
  const isOriginalDebit = originalEntry.debitAmount > 0;
  
  return {
    schoolId: originalEntry.schoolId,
    studentId: originalEntry.studentId,
    entryType: 'reversal',
    academicYear: originalEntry.academicYear,
    term: originalEntry.term,
    amount: isOriginalDebit ? originalEntry.debitAmount : originalEntry.creditAmount,
    relatedEntryId: originalEntry.id,
    feeCategoryId: originalEntry.feeCategoryId,
    description: `Reversal: ${originalEntry.description}`,
    notes: reason,
    recordedBy,
    recordedByRole,
  };
}

/**
 * Create a waiver entry
 */
export function createWaiverEntry(
  chargeEntry: LedgerEntry,
  waiverAmount: number,
  reason: string,
  approvedBy: string,
  recordedBy: string,
  recordedByRole: string
): LedgerEntryInput {
  return {
    schoolId: chargeEntry.schoolId,
    studentId: chargeEntry.studentId,
    entryType: 'waiver',
    academicYear: chargeEntry.academicYear,
    term: chargeEntry.term,
    amount: waiverAmount,
    relatedEntryId: chargeEntry.id,
    feeCategoryId: chargeEntry.feeCategoryId,
    description: `Waiver for: ${chargeEntry.description}`,
    notes: `Approved by: ${approvedBy}. Reason: ${reason}`,
    recordedBy,
    recordedByRole,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface LedgerValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a ledger entry before submission
 */
export function validateLedgerEntry(
  input: LedgerEntryInput,
  currentBalance: number
): LedgerValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = LEDGER_ENTRY_CONFIG[input.entryType];

  // Amount validation
  if (input.amount <= 0) {
    errors.push('Amount must be greater than zero');
  }

  if (input.amount > 1000000) {
    errors.push('Amount exceeds maximum allowed (K1,000,000)');
  }

  // Related entry validation
  if (config.requiresRelatedEntry && !input.relatedEntryId) {
    errors.push(`${config.label} requires a related entry reference`);
  }

  // Credit/payment validation
  if (!config.isDebit && input.amount > currentBalance) {
    warnings.push('Payment amount exceeds current balance - will create a credit');
  }

  // Description validation
  if (!input.description?.trim()) {
    errors.push('Description is required');
  }

  if (input.description && input.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verify ledger integrity using hash chain
 */
export function verifyLedgerIntegrity(entries: LedgerEntry[]): {
  isValid: boolean;
  brokenAt?: number;
  details?: string;
} {
  const sorted = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    
    if (current.previousHash !== previous.entryHash) {
      return {
        isValid: false,
        brokenAt: current.sequenceNumber,
        details: `Hash chain broken at sequence ${current.sequenceNumber}`,
      };
    }
  }

  return { isValid: true };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format ledger entry for display
 */
export function formatLedgerEntry(entry: LedgerEntry): {
  formattedAmount: string;
  amountClass: string;
  typeLabel: string;
  typeColor: string;
} {
  const config = LEDGER_ENTRY_CONFIG[entry.entryType];
  const amount = entry.debitAmount || entry.creditAmount;
  const isDebit = entry.debitAmount > 0;

  return {
    formattedAmount: `${isDebit ? '+' : '-'}${formatZMW(amount)}`,
    amountClass: isDebit ? 'text-red-600' : 'text-emerald-600',
    typeLabel: config.label,
    typeColor: config.color,
  };
}

/**
 * Get aging analysis for outstanding balance
 */
export function getAgingAnalysis(entries: LedgerEntry[]): {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
} {
  const now = new Date();
  const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  // Filter unpaid charges
  const charges = entries.filter(e => e.entryType === 'charge');
  const payments = entries.filter(e => 
    e.entryType === 'payment' || e.entryType === 'waiver' || e.entryType === 'credit'
  );

  // Simple FIFO matching
  let remainingPayments = payments.reduce((sum, p) => sum + p.creditAmount, 0);

  charges
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    .forEach(charge => {
      let outstandingAmount = charge.debitAmount;
      
      if (remainingPayments >= outstandingAmount) {
        remainingPayments -= outstandingAmount;
        return; // Fully paid
      }
      
      outstandingAmount -= remainingPayments;
      remainingPayments = 0;

      const daysPast = Math.floor(
        (now.getTime() - charge.effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysPast <= 0) aging.current += outstandingAmount;
      else if (daysPast <= 30) aging.days30 += outstandingAmount;
      else if (daysPast <= 60) aging.days60 += outstandingAmount;
      else if (daysPast <= 90) aging.days90 += outstandingAmount;
      else aging.over90 += outstandingAmount;
    });

  return aging;
}

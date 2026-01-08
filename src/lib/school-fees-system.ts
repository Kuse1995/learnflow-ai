/**
 * School Fees System
 * 
 * Offline-first fee structure management for Zambian schools.
 * Supports cash, bank deposit, and mobile money (manual entry).
 * Currency: ZMW (Zambian Kwacha)
 */

// =============================================================================
// TYPES
// =============================================================================

export type FeeFrequency = 'term' | 'annual' | 'once_off';
export type PaymentMethod = 'cash' | 'bank_deposit' | 'mobile_money' | 'cheque' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export interface FeeCategory {
  id: string;
  schoolId: string;
  name: string;
  code: FeeCategoryCode;
  description?: string;
  isMandatory: boolean;
  isActive: boolean;
  displayOrder: number;
}

export type FeeCategoryCode = 
  | 'TUITION'
  | 'PTA'
  | 'EXAM'
  | 'TRANSPORT'
  | 'BOARDING'
  | 'ADHOC'
  | 'PROJECT'
  | 'UNIFORM'
  | 'BOOKS'
  | 'OTHER';

export interface FeeStructure {
  id: string;
  schoolId: string;
  categoryId: string;
  academicYear: number;
  term: number | null; // null for annual
  grade: string | null; // null for all grades
  amount: number;
  currency: string;
  frequency: FeeFrequency;
  dueDate?: Date;
  lateFeeAmount?: number;
  lateFeeAfterDays?: number;
  notes?: string;
  isActive: boolean;
}

export interface StudentFeeAssignment {
  id: string;
  studentId: string;
  feeStructureId: string;
  assignedAmount: number;
  discountAmount: number;
  discountReason?: string;
  waived: boolean;
  waiverReason?: string;
  waiverApprovedBy?: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  studentId: string;
  assignmentId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  receiptNumber?: string;
  referenceNumber?: string;
  payerName?: string;
  payerPhone?: string;
  status: PaymentStatus;
  confirmedBy?: string;
  confirmedAt?: Date;
  notes?: string;
  // Offline sync
  recordedOffline: boolean;
  offlineId?: string;
  syncedAt?: Date;
}

export interface StudentFeeBalance {
  studentId: string;
  academicYear: number;
  term: number | null;
  totalFees: number;
  totalPaid: number;
  totalWaived: number;
  balance: number;
  lastPaymentDate?: Date;
}

export interface FeeBreakdown {
  category: FeeCategory;
  structure: FeeStructure;
  assigned: number;
  paid: number;
  waived: number;
  balance: number;
  isOverdue: boolean;
  daysOverdue: number;
}

// =============================================================================
// CATEGORY CONFIGURATION
// =============================================================================

export const FEE_CATEGORY_CONFIG: Record<FeeCategoryCode, {
  name: string;
  description: string;
  isMandatory: boolean;
  defaultFrequency: FeeFrequency;
  allowsWaiver: boolean;
  displayOrder: number;
}> = {
  TUITION: {
    name: 'Tuition Fees',
    description: 'Core school tuition and instruction fees',
    isMandatory: true,
    defaultFrequency: 'term',
    allowsWaiver: true,
    displayOrder: 1,
  },
  PTA: {
    name: 'PTA / Project Fees',
    description: 'Parent Teacher Association contributions',
    isMandatory: false,
    defaultFrequency: 'annual',
    allowsWaiver: true,
    displayOrder: 2,
  },
  EXAM: {
    name: 'Examination Fees',
    description: 'Fees for internal and external examinations',
    isMandatory: true,
    defaultFrequency: 'term',
    allowsWaiver: false,
    displayOrder: 3,
  },
  TRANSPORT: {
    name: 'Transport Fees',
    description: 'School bus or transport services',
    isMandatory: false,
    defaultFrequency: 'term',
    allowsWaiver: true,
    displayOrder: 4,
  },
  BOARDING: {
    name: 'Boarding Fees',
    description: 'Hostel and boarding accommodation',
    isMandatory: false,
    defaultFrequency: 'term',
    allowsWaiver: true,
    displayOrder: 5,
  },
  PROJECT: {
    name: 'Project Fees',
    description: 'Special projects and activities',
    isMandatory: false,
    defaultFrequency: 'once_off',
    allowsWaiver: true,
    displayOrder: 6,
  },
  UNIFORM: {
    name: 'Uniform',
    description: 'School uniform and sportswear',
    isMandatory: false,
    defaultFrequency: 'once_off',
    allowsWaiver: false,
    displayOrder: 7,
  },
  BOOKS: {
    name: 'Books & Stationery',
    description: 'Textbooks and learning materials',
    isMandatory: false,
    defaultFrequency: 'term',
    allowsWaiver: false,
    displayOrder: 8,
  },
  ADHOC: {
    name: 'Ad-hoc Charges',
    description: 'One-time or special charges',
    isMandatory: false,
    defaultFrequency: 'once_off',
    allowsWaiver: true,
    displayOrder: 9,
  },
  OTHER: {
    name: 'Other Fees',
    description: 'Miscellaneous fees and charges',
    isMandatory: false,
    defaultFrequency: 'once_off',
    allowsWaiver: true,
    displayOrder: 10,
  },
};

// =============================================================================
// FEE CALCULATION LOGIC
// =============================================================================

/**
 * Calculate student fee balance
 */
export function calculateStudentBalance(
  assignments: StudentFeeAssignment[],
  payments: FeePayment[]
): { totalFees: number; totalPaid: number; totalWaived: number; balance: number } {
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  
  const totalFees = assignments.reduce((sum, a) => sum + a.assignedAmount, 0);
  const totalDiscounts = assignments.reduce((sum, a) => sum + a.discountAmount, 0);
  const totalWaived = assignments
    .filter(a => a.waived)
    .reduce((sum, a) => sum + a.assignedAmount, 0);
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

  const effectiveFees = totalFees - totalDiscounts;
  const balance = effectiveFees - totalPaid - totalWaived;

  return {
    totalFees: effectiveFees,
    totalPaid,
    totalWaived,
    balance: Math.max(0, balance),
  };
}

/**
 * Get fee breakdown by category
 */
export function getFeeBreakdown(
  assignments: StudentFeeAssignment[],
  structures: FeeStructure[],
  categories: FeeCategory[],
  payments: FeePayment[]
): FeeBreakdown[] {
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  
  return assignments.map(assignment => {
    const structure = structures.find(s => s.id === assignment.feeStructureId);
    const category = categories.find(c => c.id === structure?.categoryId);
    
    if (!structure || !category) {
      return null;
    }

    const categoryPayments = confirmedPayments.filter(p => p.assignmentId === assignment.id);
    const paid = categoryPayments.reduce((sum, p) => sum + p.amount, 0);
    const assigned = assignment.assignedAmount - assignment.discountAmount;
    const waived = assignment.waived ? assigned : 0;
    const balance = Math.max(0, assigned - paid - waived);

    const isOverdue = structure.dueDate 
      ? new Date() > structure.dueDate && balance > 0
      : false;
    
    const daysOverdue = isOverdue && structure.dueDate
      ? Math.floor((Date.now() - structure.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      category,
      structure,
      assigned,
      paid,
      waived,
      balance,
      isOverdue,
      daysOverdue,
    };
  }).filter((b): b is FeeBreakdown => b !== null);
}

/**
 * Calculate late fee if applicable
 */
export function calculateLateFee(structure: FeeStructure, currentDate: Date = new Date()): number {
  if (!structure.dueDate || !structure.lateFeeAmount || !structure.lateFeeAfterDays) {
    return 0;
  }

  const dueDate = new Date(structure.dueDate);
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + structure.lateFeeAfterDays);

  if (currentDate > gracePeriodEnd) {
    return structure.lateFeeAmount;
  }

  return 0;
}

/**
 * Get applicable fee structures for a student
 */
export function getApplicableFeeStructures(
  allStructures: FeeStructure[],
  studentGrade: string,
  academicYear: number,
  term?: number
): FeeStructure[] {
  return allStructures.filter(structure => {
    if (!structure.isActive) return false;
    if (structure.academicYear !== academicYear) return false;
    
    // Check term (null matches annual fees)
    if (term !== undefined && structure.term !== null && structure.term !== term) {
      return false;
    }
    
    // Check grade (null means all grades)
    if (structure.grade !== null && structure.grade !== studentGrade) {
      return false;
    }
    
    return true;
  });
}

// =============================================================================
// PAYMENT HELPERS
// =============================================================================

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, {
  label: string;
  requiresReference: boolean;
  referenceLabel: string;
}> = {
  cash: {
    label: 'Cash',
    requiresReference: false,
    referenceLabel: 'Receipt Number',
  },
  bank_deposit: {
    label: 'Bank Deposit',
    requiresReference: true,
    referenceLabel: 'Bank Reference / Slip Number',
  },
  mobile_money: {
    label: 'Mobile Money',
    requiresReference: true,
    referenceLabel: 'Transaction ID',
  },
  cheque: {
    label: 'Cheque',
    requiresReference: true,
    referenceLabel: 'Cheque Number',
  },
  other: {
    label: 'Other',
    requiresReference: false,
    referenceLabel: 'Reference',
  },
};

/**
 * Generate receipt number
 */
export function generateReceiptNumber(schoolCode: string, sequence: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const paddedSeq = sequence.toString().padStart(6, '0');
  return `${schoolCode}-${year}-${paddedSeq}`;
}

/**
 * Format currency
 */
export function formatZMW(amount: number): string {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
}

// =============================================================================
// OFFLINE SYNC
// =============================================================================

const OFFLINE_PAYMENTS_KEY = 'offline_fee_payments';

export interface OfflineFeePayment extends Omit<FeePayment, 'id'> {
  offlineId: string;
  createdAt: Date;
}

/**
 * Save payment offline
 */
export function savePaymentOffline(payment: Omit<OfflineFeePayment, 'offlineId' | 'createdAt'>): OfflineFeePayment {
  const offlinePayment: OfflineFeePayment = {
    ...payment,
    offlineId: crypto.randomUUID(),
    createdAt: new Date(),
    recordedOffline: true,
  };

  const existing = getOfflinePayments();
  existing.push(offlinePayment);
  localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(existing));

  return offlinePayment;
}

/**
 * Get offline payments
 */
export function getOfflinePayments(): OfflineFeePayment[] {
  const stored = localStorage.getItem(OFFLINE_PAYMENTS_KEY);
  if (!stored) return [];
  
  return JSON.parse(stored, (key, value) => {
    if (key === 'paymentDate' || key === 'createdAt') {
      return new Date(value);
    }
    return value;
  });
}

/**
 * Get unsynced offline payments
 */
export function getUnsyncedPayments(): OfflineFeePayment[] {
  return getOfflinePayments().filter(p => !p.syncedAt);
}

/**
 * Mark payment as synced
 */
export function markPaymentSynced(offlineId: string, serverId: string): void {
  const payments = getOfflinePayments();
  const updated = payments.map(p => {
    if (p.offlineId === offlineId) {
      return { ...p, id: serverId, syncedAt: new Date() } as OfflineFeePayment;
    }
    return p;
  });
  localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(updated));
}

/**
 * Clear synced payments from local storage
 */
export function clearSyncedPayments(): void {
  const unsynced = getUnsyncedPayments();
  localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(unsynced));
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface PaymentValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate payment entry
 */
export function validatePayment(
  amount: number,
  method: PaymentMethod,
  referenceNumber?: string,
  payerName?: string
): PaymentValidation {
  const errors: string[] = [];

  if (amount <= 0) {
    errors.push('Amount must be greater than zero');
  }

  if (amount > 1000000) {
    errors.push('Amount exceeds maximum allowed (K1,000,000)');
  }

  const methodConfig = PAYMENT_METHOD_CONFIG[method];
  if (methodConfig.requiresReference && !referenceNumber?.trim()) {
    errors.push(`${methodConfig.referenceLabel} is required for ${methodConfig.label}`);
  }

  if (!payerName?.trim()) {
    errors.push('Payer name is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export function getPaymentStatusDisplay(status: PaymentStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  const config = {
    pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
    confirmed: { label: 'Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50' },
    refunded: { label: 'Refunded', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  };
  return config[status];
}

export function getBalanceStatus(balance: number, totalFees: number): {
  label: string;
  color: string;
} {
  if (balance === 0) {
    return { label: 'Paid in Full', color: 'text-emerald-700' };
  }
  
  const paidPercent = ((totalFees - balance) / totalFees) * 100;
  
  if (paidPercent >= 75) {
    return { label: 'Almost Complete', color: 'text-blue-700' };
  }
  if (paidPercent >= 50) {
    return { label: 'Partial Payment', color: 'text-amber-700' };
  }
  if (paidPercent > 0) {
    return { label: 'Payment Started', color: 'text-orange-700' };
  }
  
  return { label: 'Not Paid', color: 'text-red-700' };
}

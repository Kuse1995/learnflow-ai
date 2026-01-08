/**
 * Manual Payment Recording System
 * 
 * Handles manual entry of payments from various sources.
 * No reversals allowed - only correction entries.
 */

import { z } from 'zod';
import { formatZMW } from './school-fees-system';

// =============================================================================
// TYPES
// =============================================================================

export type ManualPaymentMethod = 
  | 'cash'
  | 'bank_deposit'
  | 'mobile_money'
  | 'scholarship'
  | 'bursary'
  | 'cheque'
  | 'other';

export interface PaymentRecordInput {
  studentId: string;
  schoolId: string;
  academicYear: number;
  term: number | null;
  amount: number;
  paymentDate: Date;
  paymentMethod: ManualPaymentMethod;
  referenceNumber?: string;
  receiptNumber?: string;
  payerName: string;
  payerPhone?: string;
  payerRelationship?: string;
  notes?: string;
  recordedBy: string;
  recordedByRole: 'admin' | 'bursar' | 'teacher';
  feeCategoryId?: string; // Optional - for targeted payments
}

export interface PaymentRecord extends PaymentRecordInput {
  id: string;
  status: 'pending' | 'confirmed';
  confirmedBy?: string;
  confirmedAt?: Date;
  createdAt: Date;
  ledgerEntryId?: string;
  offlineId?: string;
  syncedAt?: Date;
}

export interface PaymentCorrectionInput {
  originalPaymentId: string;
  correctionType: 'amount' | 'date' | 'method' | 'reference' | 'allocation';
  originalValue: string;
  correctedValue: string;
  reason: string;
  correctedBy: string;
  correctedByRole: string;
}

export interface PaymentCorrection {
  id: string;
  originalPaymentId: string;
  correctionType: PaymentCorrectionInput['correctionType'];
  originalValue: string;
  correctedValue: string;
  reason: string;
  correctedBy: string;
  correctedByRole: string;
  createdAt: Date;
  ledgerEntryId: string; // Correction creates a ledger entry
}

// =============================================================================
// PAYMENT METHOD CONFIGURATION
// =============================================================================

export const PAYMENT_METHOD_CONFIG: Record<ManualPaymentMethod, {
  label: string;
  description: string;
  requiresReference: boolean;
  referenceLabel: string;
  referencePlaceholder: string;
  requiresPayerPhone: boolean;
  icon: string;
  color: string;
}> = {
  cash: {
    label: 'Cash',
    description: 'Physical cash payment at school',
    requiresReference: false,
    referenceLabel: 'Receipt Number',
    referencePlaceholder: 'Optional',
    requiresPayerPhone: false,
    icon: 'banknote',
    color: 'text-emerald-600',
  },
  bank_deposit: {
    label: 'Bank Deposit',
    description: 'Direct bank deposit or transfer',
    requiresReference: true,
    referenceLabel: 'Bank Reference / Slip Number',
    referencePlaceholder: 'e.g., TRF-123456',
    requiresPayerPhone: false,
    icon: 'building-2',
    color: 'text-blue-600',
  },
  mobile_money: {
    label: 'Mobile Money',
    description: 'MTN, Airtel Money, or Zamtel Kwacha',
    requiresReference: true,
    referenceLabel: 'Transaction ID',
    referencePlaceholder: 'e.g., MP240101.1234.A12345',
    requiresPayerPhone: true,
    icon: 'smartphone',
    color: 'text-yellow-600',
  },
  scholarship: {
    label: 'Scholarship',
    description: 'Scholarship payment from organization',
    requiresReference: true,
    referenceLabel: 'Scholarship Reference',
    referencePlaceholder: 'Scholarship name / reference',
    requiresPayerPhone: false,
    icon: 'graduation-cap',
    color: 'text-purple-600',
  },
  bursary: {
    label: 'Bursary',
    description: 'Government or NGO bursary',
    requiresReference: true,
    referenceLabel: 'Bursary Reference',
    referencePlaceholder: 'Bursary program / reference',
    requiresPayerPhone: false,
    icon: 'hand-heart',
    color: 'text-teal-600',
  },
  cheque: {
    label: 'Cheque',
    description: 'Bank cheque payment',
    requiresReference: true,
    referenceLabel: 'Cheque Number',
    referencePlaceholder: 'e.g., 000123',
    requiresPayerPhone: false,
    icon: 'file-text',
    color: 'text-indigo-600',
  },
  other: {
    label: 'Other',
    description: 'Other payment method',
    requiresReference: false,
    referenceLabel: 'Reference',
    referencePlaceholder: 'Optional reference',
    requiresPayerPhone: false,
    icon: 'more-horizontal',
    color: 'text-gray-600',
  },
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Zambian phone number regex (supports 09x, 07x, 06x formats)
const zambianPhoneRegex = /^(?:\+260|0)(?:9[567]|7[567]|6[567])\d{7}$/;

export const paymentRecordSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  schoolId: z.string().uuid('Invalid school ID'),
  academicYear: z.number().int().min(2020).max(2100),
  term: z.number().int().min(1).max(3).nullable(),
  
  amount: z
    .number()
    .positive('Amount must be greater than zero')
    .max(1000000, 'Amount cannot exceed K1,000,000')
    .refine(val => Number.isFinite(val), 'Invalid amount'),
  
  paymentDate: z
    .date()
    .refine(date => date <= new Date(), 'Payment date cannot be in the future'),
  
  paymentMethod: z.enum([
    'cash', 'bank_deposit', 'mobile_money', 
    'scholarship', 'bursary', 'cheque', 'other'
  ]),
  
  referenceNumber: z
    .string()
    .max(100, 'Reference number too long')
    .optional()
    .transform(val => val?.trim()),
  
  receiptNumber: z
    .string()
    .max(50, 'Receipt number too long')
    .optional()
    .transform(val => val?.trim()),
  
  payerName: z
    .string()
    .trim()
    .min(2, 'Payer name is required')
    .max(100, 'Payer name too long')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Payer name contains invalid characters'),
  
  payerPhone: z
    .string()
    .optional()
    .refine(
      val => !val || zambianPhoneRegex.test(val.replace(/\s/g, '')),
      'Invalid Zambian phone number'
    ),
  
  payerRelationship: z
    .string()
    .max(50)
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Notes too long')
    .optional()
    .transform(val => val?.trim()),
  
  recordedBy: z.string().uuid('Invalid recorder ID'),
  recordedByRole: z.enum(['admin', 'bursar', 'teacher']),
  feeCategoryId: z.string().uuid().optional(),
});

export const paymentCorrectionSchema = z.object({
  originalPaymentId: z.string().uuid('Invalid payment ID'),
  correctionType: z.enum(['amount', 'date', 'method', 'reference', 'allocation']),
  originalValue: z.string().min(1, 'Original value required'),
  correctedValue: z.string().min(1, 'Corrected value required'),
  reason: z
    .string()
    .trim()
    .min(10, 'Please provide a detailed reason (minimum 10 characters)')
    .max(500, 'Reason too long'),
  correctedBy: z.string().uuid('Invalid corrector ID'),
  correctedByRole: z.string().min(1),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

/**
 * Validate payment record with method-specific rules
 */
export function validatePaymentRecord(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // Schema validation
  const result = paymentRecordSchema.safeParse(input);
  
  if (!result.success) {
    result.error.errors.forEach(err => {
      const field = err.path.join('.');
      errors[field] = err.message;
    });
    return { isValid: false, errors, warnings };
  }

  const data = result.data;
  const methodConfig = PAYMENT_METHOD_CONFIG[data.paymentMethod];

  // Method-specific validation
  if (methodConfig.requiresReference && !data.referenceNumber) {
    errors.referenceNumber = `${methodConfig.referenceLabel} is required for ${methodConfig.label}`;
  }

  if (methodConfig.requiresPayerPhone && !data.payerPhone) {
    errors.payerPhone = `Phone number is required for ${methodConfig.label}`;
  }

  // Business rule warnings
  if (data.amount > 50000) {
    warnings.push('Large payment amount - please verify before confirming');
  }

  const paymentAge = Math.floor(
    (Date.now() - data.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (paymentAge > 30) {
    warnings.push('Payment date is over 30 days ago - ensure this is correct');
  }

  // Mobile money reference format check
  if (data.paymentMethod === 'mobile_money' && data.referenceNumber) {
    const validMoMoFormat = /^[A-Z]{2}\d{6}\.\d{4}\.[A-Z0-9]+$/i;
    if (!validMoMoFormat.test(data.referenceNumber)) {
      warnings.push('Mobile money reference format may be incorrect');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate payment correction
 */
export function validatePaymentCorrection(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  const result = paymentCorrectionSchema.safeParse(input);
  
  if (!result.success) {
    result.error.errors.forEach(err => {
      const field = err.path.join('.');
      errors[field] = err.message;
    });
    return { isValid: false, errors, warnings };
  }

  const data = result.data;

  // Type-specific validation
  if (data.correctionType === 'amount') {
    const original = parseFloat(data.originalValue);
    const corrected = parseFloat(data.correctedValue);
    
    if (isNaN(original) || isNaN(corrected)) {
      errors.correctedValue = 'Invalid amount format';
    } else if (Math.abs(corrected - original) > 10000) {
      warnings.push('Large correction amount - requires additional approval');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// PAYMENT PROCESSING
// =============================================================================

/**
 * Generate a temporary receipt number
 */
export function generateTempReceiptNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TMP-${dateStr}-${random}`;
}

/**
 * Format payment for display
 */
export function formatPaymentDisplay(payment: PaymentRecord): {
  formattedAmount: string;
  formattedDate: string;
  methodLabel: string;
  methodIcon: string;
  statusLabel: string;
  statusColor: string;
} {
  const methodConfig = PAYMENT_METHOD_CONFIG[payment.paymentMethod];
  
  return {
    formattedAmount: formatZMW(payment.amount),
    formattedDate: payment.paymentDate.toLocaleDateString('en-ZM', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    methodLabel: methodConfig.label,
    methodIcon: methodConfig.icon,
    statusLabel: payment.status === 'confirmed' ? 'Confirmed' : 'Pending',
    statusColor: payment.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700',
  };
}

/**
 * Create correction entry description
 */
export function buildCorrectionDescription(correction: PaymentCorrectionInput): string {
  const typeLabels: Record<string, string> = {
    amount: 'Amount correction',
    date: 'Date correction',
    method: 'Payment method correction',
    reference: 'Reference number correction',
    allocation: 'Fee allocation correction',
  };

  return `${typeLabels[correction.correctionType]}: ${correction.originalValue} → ${correction.correctedValue}`;
}

/**
 * Calculate net effect of correction on balance
 */
export function calculateCorrectionEffect(
  correctionType: PaymentCorrectionInput['correctionType'],
  originalValue: string,
  correctedValue: string
): { debitAmount: number; creditAmount: number } {
  if (correctionType !== 'amount') {
    // Non-amount corrections don't affect balance
    return { debitAmount: 0, creditAmount: 0 };
  }

  const original = parseFloat(originalValue);
  const corrected = parseFloat(correctedValue);
  const difference = corrected - original;

  if (difference > 0) {
    // Corrected amount is higher - additional credit
    return { debitAmount: 0, creditAmount: difference };
  } else {
    // Corrected amount is lower - need to debit back
    return { debitAmount: Math.abs(difference), creditAmount: 0 };
  }
}

// =============================================================================
// OFFLINE SUPPORT
// =============================================================================

const OFFLINE_PAYMENTS_KEY = 'offline_manual_payments';

export interface OfflinePaymentRecord extends Omit<PaymentRecordInput, 'recordedBy'> {
  offlineId: string;
  createdAt: Date;
  recordedBy: string;
}

/**
 * Save payment offline
 */
export function savePaymentOffline(
  input: PaymentRecordInput
): OfflinePaymentRecord {
  const offlinePayment: OfflinePaymentRecord = {
    ...input,
    offlineId: crypto.randomUUID(),
    createdAt: new Date(),
  };

  const existing = getOfflinePayments();
  existing.push(offlinePayment);
  localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(existing));

  return offlinePayment;
}

/**
 * Get offline payments
 */
export function getOfflinePayments(): OfflinePaymentRecord[] {
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
 * Remove synced payment from offline storage
 */
export function removeOfflinePayment(offlineId: string): void {
  const payments = getOfflinePayments();
  const filtered = payments.filter(p => p.offlineId !== offlineId);
  localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(filtered));
}

// =============================================================================
// PAYER RELATIONSHIP OPTIONS
// =============================================================================

export const PAYER_RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'relative', label: 'Relative' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'organization', label: 'Organization' },
  { value: 'self', label: 'Self (Student)' },
  { value: 'other', label: 'Other' },
] as const;

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

export function getCorrectionTypeLabel(type: PaymentCorrectionInput['correctionType']): string {
  const labels: Record<string, string> = {
    amount: 'Amount',
    date: 'Payment Date',
    method: 'Payment Method',
    reference: 'Reference Number',
    allocation: 'Fee Allocation',
  };
  return labels[type] || type;
}

export function getPaymentMethodOptions(): Array<{
  value: ManualPaymentMethod;
  label: string;
  description: string;
}> {
  return Object.entries(PAYMENT_METHOD_CONFIG).map(([value, config]) => ({
    value: value as ManualPaymentMethod,
    label: config.label,
    description: config.description,
  }));
}

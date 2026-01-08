/**
 * Payment Plan Visibility Rules
 * Role-based access control for payment plan data
 */

// ==================== ROLE DEFINITIONS ====================

export type PaymentPlanRole = 
  | 'admin'
  | 'bursar'
  | 'finance_officer'
  | 'teacher'
  | 'parent';

// ==================== ACCESS MATRIX ====================

export interface FieldAccess {
  canView: boolean;
  canEdit: boolean;
}

export interface PlanAccessMatrix {
  // Core plan fields
  planId: FieldAccess;
  studentId: FieldAccess;
  studentName: FieldAccess;
  totalAmount: FieldAccess;
  remainingBalance: FieldAccess;
  status: FieldAccess;
  
  // Installment fields
  installments: FieldAccess;
  installmentAmounts: FieldAccess;
  installmentDueDates: FieldAccess;
  installmentStatus: FieldAccess;
  
  // Progress fields
  progressSummary: FieldAccess;
  nextDueDate: FieldAccess;
  nextDueAmount: FieldAccess;
  
  // Internal fields (hidden from parents/teachers)
  internalNotes: FieldAccess;
  approvalMetadata: FieldAccess;
  approvedBy: FieldAccess;
  approvedAt: FieldAccess;
  approvalNotes: FieldAccess;
  
  // Allocation fields (hidden from parents)
  allocationDetails: FieldAccess;
  paymentAllocations: FieldAccess;
  allocationHistory: FieldAccess;
  
  // Workflow fields (hidden from parents/teachers)
  workflowHistory: FieldAccess;
  createdBy: FieldAccess;
  createdByRole: FieldAccess;
  
  // Actions
  canCreate: boolean;
  canApprove: boolean;
  canCancel: boolean;
  canAllocatePayments: boolean;
  canSendNotifications: boolean;
}

// View-only access
const VIEW_ONLY: FieldAccess = { canView: true, canEdit: false };
// Full access
const FULL_ACCESS: FieldAccess = { canView: true, canEdit: true };
// No access
const NO_ACCESS: FieldAccess = { canView: false, canEdit: false };

// ==================== ROLE ACCESS MATRICES ====================

const ADMIN_ACCESS: PlanAccessMatrix = {
  // Core plan fields
  planId: VIEW_ONLY,
  studentId: VIEW_ONLY,
  studentName: VIEW_ONLY,
  totalAmount: FULL_ACCESS,
  remainingBalance: VIEW_ONLY,
  status: VIEW_ONLY,
  
  // Installment fields
  installments: FULL_ACCESS,
  installmentAmounts: FULL_ACCESS,
  installmentDueDates: FULL_ACCESS,
  installmentStatus: VIEW_ONLY,
  
  // Progress fields
  progressSummary: VIEW_ONLY,
  nextDueDate: VIEW_ONLY,
  nextDueAmount: VIEW_ONLY,
  
  // Internal fields
  internalNotes: FULL_ACCESS,
  approvalMetadata: VIEW_ONLY,
  approvedBy: VIEW_ONLY,
  approvedAt: VIEW_ONLY,
  approvalNotes: VIEW_ONLY,
  
  // Allocation fields
  allocationDetails: FULL_ACCESS,
  paymentAllocations: FULL_ACCESS,
  allocationHistory: VIEW_ONLY,
  
  // Workflow fields
  workflowHistory: VIEW_ONLY,
  createdBy: VIEW_ONLY,
  createdByRole: VIEW_ONLY,
  
  // Actions
  canCreate: true,
  canApprove: true,
  canCancel: true,
  canAllocatePayments: true,
  canSendNotifications: true
};

const FINANCE_ACCESS: PlanAccessMatrix = {
  // Core plan fields
  planId: VIEW_ONLY,
  studentId: VIEW_ONLY,
  studentName: VIEW_ONLY,
  totalAmount: FULL_ACCESS,
  remainingBalance: VIEW_ONLY,
  status: VIEW_ONLY,
  
  // Installment fields
  installments: FULL_ACCESS,
  installmentAmounts: FULL_ACCESS,
  installmentDueDates: FULL_ACCESS,
  installmentStatus: VIEW_ONLY,
  
  // Progress fields
  progressSummary: VIEW_ONLY,
  nextDueDate: VIEW_ONLY,
  nextDueAmount: VIEW_ONLY,
  
  // Internal fields
  internalNotes: FULL_ACCESS,
  approvalMetadata: VIEW_ONLY,
  approvedBy: VIEW_ONLY,
  approvedAt: VIEW_ONLY,
  approvalNotes: VIEW_ONLY,
  
  // Allocation fields
  allocationDetails: FULL_ACCESS,
  paymentAllocations: FULL_ACCESS,
  allocationHistory: VIEW_ONLY,
  
  // Workflow fields
  workflowHistory: VIEW_ONLY,
  createdBy: VIEW_ONLY,
  createdByRole: VIEW_ONLY,
  
  // Actions
  canCreate: true,
  canApprove: true,
  canCancel: false, // Only admin/bursar can cancel
  canAllocatePayments: true,
  canSendNotifications: true
};

const TEACHER_ACCESS: PlanAccessMatrix = {
  // Core plan fields - read-only status only
  planId: NO_ACCESS,
  studentId: VIEW_ONLY,
  studentName: VIEW_ONLY,
  totalAmount: NO_ACCESS, // Teachers don't see amounts
  remainingBalance: NO_ACCESS,
  status: VIEW_ONLY, // Can only see status (has plan / no plan)
  
  // Installment fields - hidden
  installments: NO_ACCESS,
  installmentAmounts: NO_ACCESS,
  installmentDueDates: NO_ACCESS,
  installmentStatus: NO_ACCESS,
  
  // Progress fields - minimal
  progressSummary: NO_ACCESS,
  nextDueDate: NO_ACCESS,
  nextDueAmount: NO_ACCESS,
  
  // Internal fields - hidden
  internalNotes: NO_ACCESS,
  approvalMetadata: NO_ACCESS,
  approvedBy: NO_ACCESS,
  approvedAt: NO_ACCESS,
  approvalNotes: NO_ACCESS,
  
  // Allocation fields - hidden
  allocationDetails: NO_ACCESS,
  paymentAllocations: NO_ACCESS,
  allocationHistory: NO_ACCESS,
  
  // Workflow fields - hidden
  workflowHistory: NO_ACCESS,
  createdBy: NO_ACCESS,
  createdByRole: NO_ACCESS,
  
  // Actions - none
  canCreate: false,
  canApprove: false,
  canCancel: false,
  canAllocatePayments: false,
  canSendNotifications: false
};

const PARENT_ACCESS: PlanAccessMatrix = {
  // Core plan fields - summary only
  planId: NO_ACCESS, // Internal ID hidden
  studentId: NO_ACCESS,
  studentName: VIEW_ONLY,
  totalAmount: VIEW_ONLY, // Can see total
  remainingBalance: VIEW_ONLY, // Can see balance
  status: VIEW_ONLY, // Simplified status
  
  // Installment fields - basic view
  installments: VIEW_ONLY,
  installmentAmounts: VIEW_ONLY,
  installmentDueDates: VIEW_ONLY,
  installmentStatus: VIEW_ONLY, // Simplified
  
  // Progress fields - visible
  progressSummary: VIEW_ONLY,
  nextDueDate: VIEW_ONLY,
  nextDueAmount: VIEW_ONLY,
  
  // Internal fields - ALL HIDDEN
  internalNotes: NO_ACCESS,
  approvalMetadata: NO_ACCESS,
  approvedBy: NO_ACCESS,
  approvedAt: NO_ACCESS,
  approvalNotes: NO_ACCESS,
  
  // Allocation fields - ALL HIDDEN
  allocationDetails: NO_ACCESS,
  paymentAllocations: NO_ACCESS,
  allocationHistory: NO_ACCESS,
  
  // Workflow fields - ALL HIDDEN
  workflowHistory: NO_ACCESS,
  createdBy: NO_ACCESS,
  createdByRole: NO_ACCESS,
  
  // Actions - none
  canCreate: false,
  canApprove: false,
  canCancel: false,
  canAllocatePayments: false,
  canSendNotifications: false
};

// ==================== ACCESS MATRIX LOOKUP ====================

export const ACCESS_MATRICES: Record<PaymentPlanRole, PlanAccessMatrix> = {
  admin: ADMIN_ACCESS,
  bursar: ADMIN_ACCESS, // Bursar has same access as admin
  finance_officer: FINANCE_ACCESS,
  teacher: TEACHER_ACCESS,
  parent: PARENT_ACCESS
};

/**
 * Get access matrix for a role
 */
export function getAccessMatrix(role: PaymentPlanRole): PlanAccessMatrix {
  return ACCESS_MATRICES[role];
}

/**
 * Check if a role can view a specific field
 */
export function canViewField(
  role: PaymentPlanRole,
  field: keyof Omit<PlanAccessMatrix, 'canCreate' | 'canApprove' | 'canCancel' | 'canAllocatePayments' | 'canSendNotifications'>
): boolean {
  const matrix = ACCESS_MATRICES[role];
  const fieldAccess = matrix[field] as FieldAccess;
  return fieldAccess?.canView ?? false;
}

/**
 * Check if a role can edit a specific field
 */
export function canEditField(
  role: PaymentPlanRole,
  field: keyof Omit<PlanAccessMatrix, 'canCreate' | 'canApprove' | 'canCancel' | 'canAllocatePayments' | 'canSendNotifications'>
): boolean {
  const matrix = ACCESS_MATRICES[role];
  const fieldAccess = matrix[field] as FieldAccess;
  return fieldAccess?.canEdit ?? false;
}

// ==================== DATA FILTERING ====================

export interface FullPaymentPlanData {
  id: string;
  studentId: string;
  studentName: string;
  totalAmount: number;
  remainingBalance: number;
  status: string;
  installments: Array<{
    id: string;
    number: number;
    amount: number;
    dueDate: string;
    status: string;
    amountPaid: number;
    notes?: string;
  }>;
  progressPercent: number;
  nextDueDate?: string;
  nextDueAmount?: number;
  internalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  allocations?: unknown[];
  workflowHistory?: unknown[];
  createdBy?: string;
  createdByRole?: string;
}

export interface ParentPaymentPlanView {
  studentName: string;
  totalAmount: number;
  remainingBalance: number;
  status: 'active' | 'completed' | 'in_progress';
  installments: Array<{
    number: number;
    amount: number;
    dueDate: string;
    status: 'upcoming' | 'paid' | 'due_soon';
  }>;
  progressPercent: number;
  nextDueDate?: string;
  nextDueAmount?: number;
  // Note: NO internal notes, approval metadata, allocations, or workflow history
}

export interface TeacherPaymentPlanView {
  studentName: string;
  hasPaymentPlan: boolean;
  planStatus: 'active' | 'none';
  // Note: NO amounts, installments, or any financial details
}

/**
 * Filter payment plan data for parent view
 * Removes all internal, approval, and allocation data
 */
export function filterForParent(data: FullPaymentPlanData): ParentPaymentPlanView {
  // Simplify status for parent
  let status: ParentPaymentPlanView['status'] = 'in_progress';
  if (data.status === 'completed') {
    status = 'completed';
  } else if (data.status === 'active' || data.status === 'approved') {
    status = 'active';
  }

  // Simplify installment status for parent
  const today = new Date();
  const installments = data.installments.map(inst => {
    const dueDate = new Date(inst.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let instStatus: 'upcoming' | 'paid' | 'due_soon' = 'upcoming';
    if (inst.status === 'paid') {
      instStatus = 'paid';
    } else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
      instStatus = 'due_soon';
    }

    return {
      number: inst.number,
      amount: inst.amount,
      dueDate: inst.dueDate,
      status: instStatus
      // Note: NO id, amountPaid, or notes
    };
  });

  return {
    studentName: data.studentName,
    totalAmount: data.totalAmount,
    remainingBalance: data.remainingBalance,
    status,
    installments,
    progressPercent: data.progressPercent,
    nextDueDate: data.nextDueDate,
    nextDueAmount: data.nextDueAmount
    // Explicitly excludes: internalNotes, approvedBy, approvedAt, 
    // approvalNotes, allocations, workflowHistory, createdBy, createdByRole
  };
}

/**
 * Filter payment plan data for teacher view
 * Only shows if student has a plan and basic status
 */
export function filterForTeacher(data: FullPaymentPlanData | null): TeacherPaymentPlanView {
  if (!data) {
    return {
      studentName: '',
      hasPaymentPlan: false,
      planStatus: 'none'
    };
  }

  return {
    studentName: data.studentName,
    hasPaymentPlan: true,
    planStatus: ['active', 'approved', 'completed'].includes(data.status) ? 'active' : 'none'
    // Note: NO amounts, installments, dates, or any financial details
  };
}

// ==================== FIELD VISIBILITY CONFIG ====================

/**
 * Fields that are ALWAYS hidden from parents
 */
export const PARENT_HIDDEN_FIELDS: string[] = [
  'id',
  'planId',
  'studentId',
  'internalNotes',
  'notes',
  'approvedBy',
  'approvedAt',
  'approvalNotes',
  'approvalMetadata',
  'allocations',
  'allocationDetails',
  'paymentAllocations',
  'allocationHistory',
  'workflowHistory',
  'createdBy',
  'createdByRole',
  'createdAt',
  'updatedAt',
  'offlineId',
  'syncedAt',
  'ledgerEntryIds',
  'paymentReference',
  'cancelledBy',
  'cancelledAt',
  'cancellationReason',
  'rejectedBy',
  'rejectedAt',
  'rejectionReason'
];

/**
 * Fields that are ALWAYS hidden from teachers
 */
export const TEACHER_HIDDEN_FIELDS: string[] = [
  ...PARENT_HIDDEN_FIELDS,
  'totalAmount',
  'remainingBalance',
  'balanceAtCreation',
  'installments',
  'installmentAmounts',
  'installmentDueDates',
  'amount',
  'amountPaid',
  'dueDate',
  'nextDueDate',
  'nextDueAmount',
  'progressPercent',
  'currency'
];

/**
 * Check if a field should be hidden for a role
 */
export function isFieldHidden(role: PaymentPlanRole, fieldName: string): boolean {
  if (role === 'parent') {
    return PARENT_HIDDEN_FIELDS.includes(fieldName);
  }
  if (role === 'teacher') {
    return TEACHER_HIDDEN_FIELDS.includes(fieldName);
  }
  return false;
}

/**
 * Strip hidden fields from an object
 */
export function stripHiddenFields<T extends Record<string, unknown>>(
  data: T,
  role: PaymentPlanRole
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!isFieldHidden(role, key)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  
  return result;
}

// ==================== ACCESS SUMMARY FOR UI ====================

export interface RoleAccessSummary {
  role: PaymentPlanRole;
  label: string;
  description: string;
  accessLevel: 'full' | 'limited' | 'minimal' | 'none';
  canViewAmounts: boolean;
  canViewInstallments: boolean;
  canViewInternalNotes: boolean;
  canViewAllocations: boolean;
  canModify: boolean;
}

export const ROLE_ACCESS_SUMMARIES: Record<PaymentPlanRole, RoleAccessSummary> = {
  admin: {
    role: 'admin',
    label: 'Administrator',
    description: 'Full access to all payment plan data and actions',
    accessLevel: 'full',
    canViewAmounts: true,
    canViewInstallments: true,
    canViewInternalNotes: true,
    canViewAllocations: true,
    canModify: true
  },
  bursar: {
    role: 'bursar',
    label: 'Bursar',
    description: 'Full access to all payment plan data and actions',
    accessLevel: 'full',
    canViewAmounts: true,
    canViewInstallments: true,
    canViewInternalNotes: true,
    canViewAllocations: true,
    canModify: true
  },
  finance_officer: {
    role: 'finance_officer',
    label: 'Finance Officer',
    description: 'Full view access, can create and approve plans',
    accessLevel: 'full',
    canViewAmounts: true,
    canViewInstallments: true,
    canViewInternalNotes: true,
    canViewAllocations: true,
    canModify: true
  },
  teacher: {
    role: 'teacher',
    label: 'Teacher',
    description: 'Can only see if student has an active payment plan',
    accessLevel: 'minimal',
    canViewAmounts: false,
    canViewInstallments: false,
    canViewInternalNotes: false,
    canViewAllocations: false,
    canModify: false
  },
  parent: {
    role: 'parent',
    label: 'Parent/Guardian',
    description: 'Read-only access to plan summary and payment schedule',
    accessLevel: 'limited',
    canViewAmounts: true,
    canViewInstallments: true,
    canViewInternalNotes: false,
    canViewAllocations: false,
    canModify: false
  }
};

/**
 * Get access summary for a role
 */
export function getRoleAccessSummary(role: PaymentPlanRole): RoleAccessSummary {
  return ROLE_ACCESS_SUMMARIES[role];
}

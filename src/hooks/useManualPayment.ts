import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  validatePaymentRecord,
  validatePaymentCorrection,
  savePaymentOffline,
  getOfflinePayments,
  removeOfflinePayment,
  generateTempReceiptNumber,
  formatPaymentDisplay,
  buildCorrectionDescription,
  calculateCorrectionEffect,
  PAYMENT_METHOD_CONFIG,
  PAYER_RELATIONSHIPS,
  getPaymentMethodOptions,
  getCorrectionTypeLabel,
  type PaymentRecordInput,
  type PaymentRecord,
  type PaymentCorrectionInput,
  type ManualPaymentMethod,
  type ValidationResult,
} from '@/lib/manual-payment-recording';

// =============================================================================
// PAYMENT RECORDING HOOK
// =============================================================================

export function useRecordPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: PaymentRecordInput) => {
      // Validate
      const validation = validatePaymentRecord(input);
      setValidationResult(validation);

      if (!validation.isValid) {
        throw new Error('Validation failed');
      }

      // Show warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast({
            title: 'Warning',
            description: warning,
            variant: 'default',
          });
        });
      }

      // Check online status
      const isOnline = navigator.onLine;

      if (!isOnline) {
        // Save offline
        const offlinePayment = savePaymentOffline(input);
        return { 
          id: offlinePayment.offlineId, 
          offline: true,
          receiptNumber: generateTempReceiptNumber(),
        };
      }

      // Insert via RPC to create ledger entry atomically
      const { data, error } = await supabase.rpc('insert_ledger_entry', {
        p_school_id: input.schoolId,
        p_student_id: input.studentId,
        p_entry_type: 'payment',
        p_entry_date: input.paymentDate.toISOString().split('T')[0],
        p_effective_date: input.paymentDate.toISOString().split('T')[0],
        p_academic_year: input.academicYear,
        p_term: input.term,
        p_debit_amount: 0,
        p_credit_amount: input.amount,
        p_fee_category_id: input.feeCategoryId || null,
        p_fee_structure_id: null,
        p_payment_id: null,
        p_related_entry_id: null,
        p_description: `Payment received: ${PAYMENT_METHOD_CONFIG[input.paymentMethod].label}`,
        p_reference_number: input.referenceNumber || null,
        p_notes: input.notes || null,
        p_recorded_by: input.recordedBy,
        p_recorded_by_role: input.recordedByRole,
      });

      if (error) throw error;

      return { 
        id: data, 
        offline: false,
        receiptNumber: input.receiptNumber || generateTempReceiptNumber(),
      };
    },
    onSuccess: (result) => {
      toast({
        title: result.offline ? 'Payment Saved Offline' : 'Payment Recorded',
        description: result.offline 
          ? 'Payment will be synced when you\'re back online'
          : `Receipt: ${result.receiptNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
    },
    onError: (error) => {
      if (error.message !== 'Validation failed') {
        toast({
          title: 'Error Recording Payment',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  return {
    recordPayment: mutation.mutateAsync,
    isRecording: mutation.isPending,
    validationResult,
    clearValidation: () => setValidationResult(null),
  };
}

// =============================================================================
// PAYMENT CORRECTION HOOK
// =============================================================================

export function useRecordCorrection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PaymentCorrectionInput) => {
      const validation = validatePaymentCorrection(input);

      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Get original payment to find student/school IDs
      const { data: originalEntry, error: fetchError } = await supabase
        .from('student_fee_ledger')
        .select('student_id, school_id, academic_year, term, fee_category_id')
        .eq('id', input.originalPaymentId)
        .single();

      if (fetchError || !originalEntry) {
        throw new Error('Original payment not found');
      }

      // Calculate balance effect
      const effect = calculateCorrectionEffect(
        input.correctionType,
        input.originalValue,
        input.correctedValue
      );

      // Only create ledger entry if there's a balance effect
      if (effect.debitAmount > 0 || effect.creditAmount > 0) {
        const { data, error } = await supabase.rpc('insert_ledger_entry', {
          p_school_id: originalEntry.school_id,
          p_student_id: originalEntry.student_id,
          p_entry_type: effect.debitAmount > 0 ? 'adjustment_debit' : 'adjustment_credit',
          p_entry_date: new Date().toISOString().split('T')[0],
          p_effective_date: new Date().toISOString().split('T')[0],
          p_academic_year: originalEntry.academic_year,
          p_term: originalEntry.term,
          p_debit_amount: effect.debitAmount,
          p_credit_amount: effect.creditAmount,
          p_fee_category_id: originalEntry.fee_category_id,
          p_fee_structure_id: null,
          p_payment_id: null,
          p_related_entry_id: input.originalPaymentId,
          p_description: buildCorrectionDescription(input),
          p_reference_number: null,
          p_notes: `Reason: ${input.reason}`,
          p_recorded_by: input.correctedBy,
          p_recorded_by_role: input.correctedByRole,
        });

        if (error) throw error;
        return { ledgerEntryId: data };
      }

      return { ledgerEntryId: null };
    },
    onSuccess: () => {
      toast({
        title: 'Correction Recorded',
        description: 'Payment correction has been logged',
      });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
    },
    onError: (error) => {
      toast({
        title: 'Correction Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// OFFLINE SYNC HOOK
// =============================================================================

export function useOfflinePaymentSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingPayments = useMemo(() => getOfflinePayments(), []);

  const syncPayments = useCallback(async () => {
    if (!navigator.onLine || pendingPayments.length === 0) return;

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const payment of pendingPayments) {
      try {
        const { error } = await supabase.rpc('insert_ledger_entry', {
          p_school_id: payment.schoolId,
          p_student_id: payment.studentId,
          p_entry_type: 'payment',
          p_entry_date: payment.paymentDate.toISOString().split('T')[0],
          p_effective_date: payment.paymentDate.toISOString().split('T')[0],
          p_academic_year: payment.academicYear,
          p_term: payment.term,
          p_debit_amount: 0,
          p_credit_amount: payment.amount,
          p_fee_category_id: payment.feeCategoryId || null,
          p_fee_structure_id: null,
          p_payment_id: null,
          p_related_entry_id: null,
          p_description: `Payment received: ${PAYMENT_METHOD_CONFIG[payment.paymentMethod].label} (synced from offline)`,
          p_reference_number: payment.referenceNumber || null,
          p_notes: payment.notes || null,
          p_recorded_by: payment.recordedBy,
          p_recorded_by_role: payment.recordedByRole,
        });

        if (!error) {
          removeOfflinePayment(payment.offlineId);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setIsSyncing(false);

    if (synced > 0) {
      toast({
        title: 'Payments Synced',
        description: `${synced} payment(s) synced successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    }

    if (failed > 0) {
      toast({
        title: 'Sync Incomplete',
        description: `${failed} payment(s) failed to sync`,
        variant: 'destructive',
      });
    }
  }, [pendingPayments, toast, queryClient]);

  return {
    pendingCount: pendingPayments.length,
    isSyncing,
    syncPayments,
  };
}

// =============================================================================
// FORM STATE HOOK
// =============================================================================

export function usePaymentFormState(studentId: string, schoolId: string) {
  const [formData, setFormData] = useState<Partial<PaymentRecordInput>>({
    studentId,
    schoolId,
    paymentDate: new Date(),
    paymentMethod: 'cash',
  });

  const updateField = useCallback(<K extends keyof PaymentRecordInput>(
    field: K,
    value: PaymentRecordInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setFormData({
      studentId,
      schoolId,
      paymentDate: new Date(),
      paymentMethod: 'cash',
    });
  }, [studentId, schoolId]);

  const selectedMethod = formData.paymentMethod || 'cash';
  const methodConfig = PAYMENT_METHOD_CONFIG[selectedMethod];

  return {
    formData,
    updateField,
    reset,
    methodConfig,
    requiresReference: methodConfig.requiresReference,
    requiresPayerPhone: methodConfig.requiresPayerPhone,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

export function usePaymentMethodOptions() {
  return useMemo(() => getPaymentMethodOptions(), []);
}

export function usePayerRelationships() {
  return PAYER_RELATIONSHIPS;
}

export function useFormatPayment() {
  return useCallback((payment: PaymentRecord) => {
    return formatPaymentDisplay(payment);
  }, []);
}

export function useCorrectionTypeLabel() {
  return useCallback((type: PaymentCorrectionInput['correctionType']) => {
    return getCorrectionTypeLabel(type);
  }, []);
}

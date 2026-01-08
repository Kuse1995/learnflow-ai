/**
 * Consent Audit Hooks
 * 
 * Provides hooks for capturing and viewing consent audit history
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  captureConsentFromAdmin,
  captureConsentFromTeacher,
  captureVerbalConsent,
  recordConsentWithdrawal,
  recordConsentCorrection,
  validateConsentCapture,
  getCaptureMethodDisplay,
  getChangeTypeDisplay,
  type ConsentCaptureMethod,
  type ConsentChangeType,
  type ConsentAuditEntry,
} from '@/lib/consent-audit';
import { 
  type ConsentCategory, 
  type ConsentStatus,
  CONSENT_CATEGORIES,
} from '@/lib/parent-consent-system';

// =============================================================================
// CONSENT HISTORY HOOK
// =============================================================================

/**
 * Get consent audit history for a guardian-student pair
 */
export function useConsentAuditHistory(
  guardianId: string | undefined,
  studentId: string | undefined,
  category?: ConsentCategory
) {
  return useQuery({
    queryKey: ['consent-audit-history', guardianId, studentId, category],
    queryFn: async () => {
      if (!guardianId || !studentId) return [];

      // Query audit_logs for consent-related entries
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'consent_record')
        .like('entity_id', `consent_${guardianId}_${studentId}%`)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.like('entity_id', `%_${category}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to ConsentAuditEntry format
      return (data || []).map(log => ({
        id: log.id,
        consentRecordId: log.entity_id || '',
        guardianId,
        studentId,
        category: extractCategoryFromEntityId(log.entity_id || ''),
        previousStatus: (log.metadata as Record<string, unknown>)?.previous_status as ConsentStatus | null,
        newStatus: (log.metadata as Record<string, unknown>)?.new_status as ConsentStatus,
        changeType: log.action.replace('consent_', '') as ConsentChangeType,
        captureMethod: (log.metadata as Record<string, unknown>)?.capture_method as ConsentCaptureMethod,
        capturedBy: log.actor_id || '',
        capturedByRole: log.actor_type as 'admin' | 'teacher' | 'system',
        witnessName: (log.metadata as Record<string, unknown>)?.witness_name as string | undefined,
        paperFormReference: (log.metadata as Record<string, unknown>)?.paper_form_reference as string | undefined,
        notes: (log.metadata as Record<string, unknown>)?.notes as string | undefined,
        capturedAt: new Date(log.created_at),
        effectiveFrom: new Date((log.metadata as Record<string, unknown>)?.effective_from as string || log.created_at),
        expiresAt: (log.metadata as Record<string, unknown>)?.expires_at 
          ? new Date((log.metadata as Record<string, unknown>)?.expires_at as string) 
          : undefined,
        auditLogId: log.id,
        entryHash: log.entry_hash,
      }));
    },
    enabled: !!guardianId && !!studentId,
  });
}

function extractCategoryFromEntityId(entityId: string): ConsentCategory {
  const parts = entityId.split('_');
  const category = parts[parts.length - 1] as ConsentCategory;
  return category in CONSENT_CATEGORIES ? category : 'school_announcements';
}

// =============================================================================
// CAPTURE MUTATIONS
// =============================================================================

/**
 * Capture consent from admin (paper form entry)
 */
export function useCaptureAdminConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guardianId: string;
      studentId: string;
      category: ConsentCategory;
      status: ConsentStatus;
      paperFormReference: string;
      notes?: string;
      effectiveFrom?: Date;
      expiresAt?: Date;
    }) => {
      // Validate
      const validation = validateConsentCapture({
        category: params.category,
        captureMethod: 'admin_manual_entry',
        paperFormReference: params.paperFormReference,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await captureConsentFromAdmin({
        ...params,
        adminId: user.id,
        adminName: user.email || 'Unknown Admin',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to capture consent');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['consent-audit-history', variables.guardianId, variables.studentId] 
      });
      toast.success('Consent recorded from paper form');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record consent');
    },
  });
}

/**
 * Capture consent from teacher confirmation
 */
export function useCaptureTeacherConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guardianId: string;
      studentId: string;
      category: ConsentCategory;
      status: ConsentStatus;
      witnessName?: string;
      notes?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await captureConsentFromTeacher({
        ...params,
        teacherId: user.id,
        teacherName: user.email || 'Unknown Teacher',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to capture consent');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['consent-audit-history', variables.guardianId, variables.studentId] 
      });
      toast.success('Consent confirmed by teacher');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm consent');
    },
  });
}

/**
 * Capture verbal consent with witness
 */
export function useCaptureVerbalConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guardianId: string;
      studentId: string;
      category: ConsentCategory;
      status: ConsentStatus;
      witnessName: string;
      notes?: string;
      recordedByRole: 'admin' | 'teacher';
    }) => {
      // Validate
      const validation = validateConsentCapture({
        category: params.category,
        captureMethod: 'verbal_witnessed',
        witnessName: params.witnessName,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await captureVerbalConsent({
        guardianId: params.guardianId,
        studentId: params.studentId,
        category: params.category,
        status: params.status,
        recordedById: user.id,
        recordedByName: user.email || 'Unknown',
        recordedByRole: params.recordedByRole,
        witnessName: params.witnessName,
        notes: params.notes,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to capture consent');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['consent-audit-history', variables.guardianId, variables.studentId] 
      });
      toast.success('Verbal consent recorded with witness');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record consent');
    },
  });
}

/**
 * Record consent withdrawal
 */
export function useRecordWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guardianId: string;
      studentId: string;
      category: ConsentCategory;
      previousStatus: ConsentStatus;
      reason: string;
      recordedByRole: 'admin' | 'teacher';
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await recordConsentWithdrawal({
        guardianId: params.guardianId,
        studentId: params.studentId,
        category: params.category,
        previousStatus: params.previousStatus,
        recordedById: user.id,
        recordedByName: user.email || 'Unknown',
        recordedByRole: params.recordedByRole,
        reason: params.reason,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to record withdrawal');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['consent-audit-history', variables.guardianId, variables.studentId] 
      });
      toast.success('Consent withdrawal recorded');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record withdrawal');
    },
  });
}

/**
 * Record consent correction (admin only)
 */
export function useRecordCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guardianId: string;
      studentId: string;
      category: ConsentCategory;
      previousStatus: ConsentStatus;
      newStatus: ConsentStatus;
      correctionReason: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await recordConsentCorrection({
        guardianId: params.guardianId,
        studentId: params.studentId,
        category: params.category,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        adminId: user.id,
        adminName: user.email || 'Unknown Admin',
        correctionReason: params.correctionReason,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to record correction');
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['consent-audit-history', variables.guardianId, variables.studentId] 
      });
      toast.success('Consent correction recorded');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record correction');
    },
  });
}

// =============================================================================
// DISPLAY HOOKS
// =============================================================================

/**
 * Get display info for capture methods
 */
export function useCaptureMethodOptions() {
  return useMemo(() => {
    const methods: ConsentCaptureMethod[] = [
      'admin_manual_entry',
      'teacher_confirmation',
      'verbal_witnessed',
      'phone_recorded',
      'sms_opt_in',
      'whatsapp_opt_in',
      'enrollment_default',
    ];

    return methods.map(method => ({
      value: method,
      ...getCaptureMethodDisplay(method),
    }));
  }, []);
}

/**
 * Format audit entry for display
 */
export function useFormatAuditEntry() {
  return useCallback((entry: ConsentAuditEntry) => {
    const methodDisplay = getCaptureMethodDisplay(entry.captureMethod);
    const changeDisplay = getChangeTypeDisplay(entry.changeType);
    const categoryLabel = CONSENT_CATEGORIES[entry.category]?.label || entry.category;

    return {
      ...entry,
      categoryLabel,
      methodLabel: methodDisplay.label,
      methodIcon: methodDisplay.icon,
      changeLabel: changeDisplay.label,
      changeColor: changeDisplay.color,
      formattedDate: entry.capturedAt.toLocaleDateString(),
      formattedTime: entry.capturedAt.toLocaleTimeString(),
    };
  }, []);
}

/**
 * Get audit statistics
 */
export function useConsentAuditStats(
  guardianId: string | undefined,
  studentId: string | undefined
) {
  const { data: history } = useConsentAuditHistory(guardianId, studentId);

  return useMemo(() => {
    if (!history || history.length === 0) {
      return {
        totalChanges: 0,
        grants: 0,
        withdrawals: 0,
        corrections: 0,
        lastChange: null,
        categoriesWithConsent: [],
      };
    }

    const grants = history.filter(h => 
      ['initial_grant', 'renewal', 'restoration'].includes(h.changeType)
    ).length;

    const withdrawals = history.filter(h => h.changeType === 'withdrawal').length;
    const corrections = history.filter(h => h.changeType === 'correction').length;

    const categoriesWithConsent = [...new Set(
      history
        .filter(h => h.newStatus === 'granted')
        .map(h => h.category)
    )];

    return {
      totalChanges: history.length,
      grants,
      withdrawals,
      corrections,
      lastChange: history[0] || null,
      categoriesWithConsent,
    };
  }, [history]);
}

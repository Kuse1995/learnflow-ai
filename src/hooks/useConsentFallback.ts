import { useMemo, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  evaluateConsentFallback,
  assessConsentClarity,
  processOverrideRequest,
  createConsentFollowUp,
  canSendMessage,
  getOverrideReasonDisplay,
  type ConsentFallbackResult,
  type ConsentClarity,
  type OverrideRequest,
  type OverrideReason,
  type FollowUpTask,
} from '@/lib/consent-fallback-system';
import type { ConsentStatus, ConsentCategory } from '@/lib/parent-consent-system';

// =============================================================================
// FALLBACK EVALUATION HOOKS
// =============================================================================

/**
 * Evaluate consent fallback for a specific context
 */
export function useConsentFallback(
  category: ConsentCategory,
  status: ConsentStatus | null,
  expiresAt?: Date | null,
  hasConflictingRecords?: boolean
) {
  const result = useMemo(() => {
    return evaluateConsentFallback(category, status, expiresAt, hasConflictingRecords);
  }, [category, status, expiresAt, hasConflictingRecords]);

  return result;
}

/**
 * Assess consent clarity
 */
export function useConsentClarity(
  status: ConsentStatus | null,
  expiresAt?: Date | null,
  hasConflictingRecords?: boolean
): ConsentClarity {
  return useMemo(() => {
    return assessConsentClarity(status, expiresAt, hasConflictingRecords);
  }, [status, expiresAt, hasConflictingRecords]);
}

/**
 * Check if message can be sent
 */
export function useCanSendMessage(
  category: ConsentCategory,
  status: ConsentStatus | null,
  isEmergency: boolean = false,
  hasOverride: boolean = false
) {
  return useMemo(() => {
    return canSendMessage(category, status, isEmergency, hasOverride);
  }, [category, status, isEmergency, hasOverride]);
}

// =============================================================================
// OVERRIDE HOOKS
// =============================================================================

/**
 * Process consent override with logging
 */
export function useProcessOverride() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      originalStatus,
      originalClarity,
    }: {
      request: OverrideRequest;
      originalStatus: ConsentStatus | null;
      originalClarity: ConsentClarity;
    }) => {
      return processOverrideRequest(request, originalStatus, originalClarity);
    },
    onSuccess: (result) => {
      toast({
        title: 'Override Applied',
        description: 'Consent override has been logged and applied.',
      });
      queryClient.invalidateQueries({ queryKey: ['consent'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      toast({
        title: 'Override Failed',
        description: error instanceof Error ? error.message : 'Could not apply override',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get available override reasons for a role
 */
export function useAvailableOverrideReasons(role: 'teacher' | 'admin'): OverrideReason[] {
  return useMemo(() => {
    const teacherReasons: OverrideReason[] = [
      'verbal_confirmation',
      'paper_consent_pending',
      'parent_requested',
    ];

    const adminReasons: OverrideReason[] = [
      ...teacherReasons,
      'admin_discretion',
      'time_sensitive',
      'correction_to_prior',
    ];

    return role === 'admin' ? adminReasons : teacherReasons;
  }, [role]);
}

/**
 * Get display info for override reasons
 */
export function useOverrideReasonDisplay() {
  return useCallback((reason: OverrideReason) => {
    return getOverrideReasonDisplay(reason);
  }, []);
}

// =============================================================================
// FOLLOW-UP HOOKS
// =============================================================================

/**
 * Create follow-up task from fallback result
 */
export function useCreateFollowUp() {
  const { toast } = useToast();

  return useCallback((
    guardianId: string,
    studentId: string,
    category: ConsentCategory,
    fallbackResult: ConsentFallbackResult
  ): FollowUpTask | null => {
    const task = createConsentFollowUp(guardianId, studentId, category, fallbackResult);
    
    if (task) {
      // In production, this would save to database
      // For now, store in localStorage for demo
      const existing = JSON.parse(localStorage.getItem('consent_follow_ups') || '[]');
      existing.push(task);
      localStorage.setItem('consent_follow_ups', JSON.stringify(existing));

      toast({
        title: 'Follow-up Created',
        description: `Task created to ${task.taskType.replace(/_/g, ' ')}`,
      });
    }

    return task;
  }, [toast]);
}

/**
 * Get pending follow-up tasks
 */
export function usePendingFollowUps(guardianId?: string, studentId?: string) {
  return useMemo(() => {
    const stored = localStorage.getItem('consent_follow_ups');
    if (!stored) return [];

    const tasks: FollowUpTask[] = JSON.parse(stored);
    
    return tasks.filter(task => {
      if (task.resolvedAt) return false;
      if (guardianId && task.guardianId !== guardianId) return false;
      if (studentId && task.studentId !== studentId) return false;
      return true;
    });
  }, [guardianId, studentId]);
}

// =============================================================================
// UI HELPER HOOKS
// =============================================================================

/**
 * Get fallback action display info
 */
export function useFallbackActionDisplay() {
  return useCallback((action: ConsentFallbackResult['action']) => {
    const displays = {
      allow: {
        label: 'Allowed',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        icon: 'check',
      },
      block: {
        label: 'Blocked',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        icon: 'x',
      },
      flag_for_review: {
        label: 'Review Required',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        icon: 'flag',
      },
      require_override: {
        label: 'Override Required',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        icon: 'shield',
      },
    };
    return displays[action];
  }, []);
}

/**
 * Get clarity status display
 */
export function useClarityDisplay() {
  return useCallback((clarity: ConsentClarity) => {
    const displays = {
      clear: { label: 'Clear', color: 'text-emerald-700' },
      unclear: { label: 'Unclear', color: 'text-amber-700' },
      missing: { label: 'Missing', color: 'text-red-700' },
      expired: { label: 'Expired', color: 'text-orange-700' },
      conflicting: { label: 'Conflicting', color: 'text-purple-700' },
    };
    return displays[clarity];
  }, []);
}

/**
 * Interactive override state management
 */
export function useOverrideFlow(
  category: ConsentCategory,
  fallbackResult: ConsentFallbackResult
) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<OverrideReason | null>(null);
  const [notes, setNotes] = useState('');
  const [witnessName, setWitnessName] = useState('');

  const processOverride = useProcessOverride();

  const requiresWitness = useMemo(() => {
    if (!selectedReason) return false;
    return getOverrideReasonDisplay(selectedReason).requiresWitness;
  }, [selectedReason]);

  const canSubmit = useMemo(() => {
    if (!selectedReason) return false;
    if (requiresWitness && !witnessName.trim()) return false;
    return true;
  }, [selectedReason, requiresWitness, witnessName]);

  const reset = useCallback(() => {
    setSelectedReason(null);
    setNotes('');
    setWitnessName('');
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    setIsOpen,
    selectedReason,
    setSelectedReason,
    notes,
    setNotes,
    witnessName,
    setWitnessName,
    requiresWitness,
    canSubmit,
    reset,
    processOverride,
    canOverride: fallbackResult.canOverride,
    overrideRequiresRole: fallbackResult.overrideRequiresRole,
  };
}

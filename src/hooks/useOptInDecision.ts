/**
 * Opt-In Decision Hooks
 * 
 * Provides hooks for evaluating and managing opt-in/opt-out decisions
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import {
  evaluateOptInDecision,
  validateOptOutRequest,
  getEffectiveOptOut,
  getMultiChildOptOutStatus,
  getPartialConsentSummary,
  OPT_OUT_RULES,
  type OptOutRecord,
  type OptInDecision,
  type ConflictStrategy,
} from '@/lib/opt-in-decision-flow';
import {
  type ConsentCategory,
  type ConsentRecord,
  CONSENT_CATEGORIES,
  MESSAGE_TO_CONSENT_CATEGORY,
  getLocalConsentRecords,
} from '@/lib/parent-consent-system';

type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// OPT-OUT RECORDS HOOK (Local Storage)
// =============================================================================

const OPT_OUT_STORAGE_KEY = 'stitch_opt_out_records';

function getLocalOptOutRecords(): OptOutRecord[] {
  try {
    const stored = localStorage.getItem(OPT_OUT_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveLocalOptOutRecord(record: OptOutRecord): void {
  const records = getLocalOptOutRecords();
  const existingIndex = records.findIndex(
    r => r.guardianId === record.guardianId &&
         r.studentId === record.studentId &&
         r.category === record.category
  );

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  localStorage.setItem(OPT_OUT_STORAGE_KEY, JSON.stringify(records));
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get opt-out records for a guardian
 */
export function useGuardianOptOuts(guardianId: string | undefined) {
  return useQuery({
    queryKey: ['guardian-opt-outs', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];
      // Use local storage for now (no DB table yet)
      return getLocalOptOutRecords().filter(r => r.guardianId === guardianId);
    },
    enabled: !!guardianId,
  });
}

/**
 * Evaluate opt-in decision for a message
 */
export function useOptInDecision(
  category: MessageCategory | undefined,
  studentId: string | undefined,
  options: {
    isManualTeacherMessage?: boolean;
    isEmergency?: boolean;
  } = {}
) {
  const { data: guardians } = useQuery({
    queryKey: ['student-guardians', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('guardian_student_links')
        .select(`
          guardian_id,
          role,
          guardians (
            id,
            display_name
          )
        `)
        .eq('student_id', studentId)
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  return useMemo(() => {
    if (!category || !guardians || guardians.length === 0) {
      return null;
    }

    const consentRecords = getLocalConsentRecords();
    const optOutRecords = getLocalOptOutRecords();
    const consentCategory = MESSAGE_TO_CONSENT_CATEGORY[category];

    const guardianPreferences = guardians.map(link => {
      const guardianId = link.guardian_id;
      const guardian = link.guardians as { id: string; display_name: string } | null;

      // Get consent records for this guardian
      const guardianConsents = consentRecords.filter(
        r => r.guardianId === guardianId && r.studentId === studentId
      );

      // Check opt-outs
      const effectiveOptOut = getEffectiveOptOut(
        guardianId,
        studentId!,
        category,
        optOutRecords
      );

      return {
        guardianId,
        guardianName: guardian?.display_name || 'Unknown Guardian',
        isPrimary: link.role === 'primary_guardian',
        consentRecords: guardianConsents,
        globalOptOut: effectiveOptOut.isOptedOut && effectiveOptOut.scope === 'all_automated',
        categoryOptOut: effectiveOptOut.isOptedOut && 
          (effectiveOptOut.scope === 'category' || effectiveOptOut.scope === 'student_specific'),
      };
    });

    return evaluateOptInDecision(category, guardianPreferences, {
      ...options,
      forStudentId: studentId,
    });
  }, [category, studentId, guardians, options]);
}

/**
 * Record opt-out
 */
export function useRecordOptOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      category,
      reason,
      expiresAt,
      recordedBy,
      recordedByRole,
    }: {
      guardianId: string;
      studentId?: string;
      category: ConsentCategory | 'all_automated';
      reason?: string;
      expiresAt?: Date;
      recordedBy: string;
      recordedByRole: string;
    }) => {
      // Validate if specific category
      if (category !== 'all_automated') {
        const validation = validateOptOutRequest(category, reason);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      const record: OptOutRecord = {
        guardianId,
        studentId: studentId || null,
        category,
        scope: studentId ? 'student_specific' : 
               category === 'all_automated' ? 'all_automated' : 'category',
        isActive: true,
        reason,
        createdAt: new Date(),
        expiresAt,
        recordedBy,
        recordedByRole,
      };

      saveLocalOptOutRecord(record);
      return record;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['guardian-opt-outs', variables.guardianId] 
      });
      toast.success('Opt-out recorded');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not record opt-out');
    },
  });
}

/**
 * Remove opt-out (opt back in)
 */
export function useRemoveOptOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      category,
    }: {
      guardianId: string;
      studentId?: string;
      category: ConsentCategory | 'all_automated';
    }) => {
      const records = getLocalOptOutRecords();
      const updatedRecords = records.map(r => {
        if (r.guardianId === guardianId &&
            r.studentId === (studentId || null) &&
            r.category === category) {
          return { ...r, isActive: false };
        }
        return r;
      });

      localStorage.setItem(OPT_OUT_STORAGE_KEY, JSON.stringify(updatedRecords));
      return { guardianId, category };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['guardian-opt-outs', variables.guardianId] 
      });
      toast.success('Opted back in');
    },
    onError: () => {
      toast.error('Could not update preference');
    },
  });
}

/**
 * Get multi-child opt-out status
 */
export function useMultiChildOptOutStatus(
  guardianId: string | undefined,
  childrenIds: string[]
) {
  const { data: optOutRecords } = useGuardianOptOuts(guardianId);

  return useMemo(() => {
    if (!guardianId || !optOutRecords) return {};
    return getMultiChildOptOutStatus(guardianId, optOutRecords, childrenIds);
  }, [guardianId, optOutRecords, childrenIds]);
}

/**
 * Get consent summary for a guardian-student pair
 */
export function useConsentSummary(
  guardianId: string | undefined,
  studentId: string | undefined
) {
  return useMemo(() => {
    if (!guardianId || !studentId) return null;

    const consentRecords = getLocalConsentRecords().filter(
      r => r.guardianId === guardianId && r.studentId === studentId
    );

    return getPartialConsentSummary(consentRecords);
  }, [guardianId, studentId]);
}

/**
 * Get available opt-out categories
 */
export function useOptOutCategories() {
  return useMemo(() => {
    return (Object.entries(OPT_OUT_RULES) as [ConsentCategory, typeof OPT_OUT_RULES[ConsentCategory]][])
      .filter(([_, rules]) => rules.canOptOut)
      .map(([category, rules]) => ({
        category,
        label: CONSENT_CATEGORIES[category].label,
        description: CONSENT_CATEGORIES[category].description,
        requiresReason: rules.requiresReason,
        conflictStrategy: rules.conflictStrategy,
      }));
  }, []);
}

/**
 * Check if opt-out is allowed for category
 */
export function useCanOptOut(category: ConsentCategory) {
  return useMemo(() => {
    const rules = OPT_OUT_RULES[category];
    return {
      canOptOut: rules.canOptOut,
      requiresReason: rules.requiresReason,
      minimumNotice: rules.minimumNotice,
    };
  }, [category]);
}

/**
 * Get conflict resolution info for UI display
 */
export function useConflictResolutionInfo(category: MessageCategory) {
  return useMemo(() => {
    const consentCategory = MESSAGE_TO_CONSENT_CATEGORY[category];
    const rules = OPT_OUT_RULES[consentCategory];

    const strategyDescriptions: Record<ConflictStrategy, string> = {
      any_guardian_allows: 'Notification sent if any guardian allows',
      all_guardians_allow: 'All guardians must allow for notification to be sent',
      primary_guardian_decides: 'Primary guardian\'s preference is used',
      most_permissive: 'Most permissive option is applied',
      most_restrictive: 'Most restrictive option is applied',
    };

    return {
      strategy: rules.conflictStrategy,
      description: strategyDescriptions[rules.conflictStrategy],
      categoryLabel: CONSENT_CATEGORIES[consentCategory].label,
    };
  }, [category]);
}

/**
 * Get decision summary for documentation
 */
export function useDecisionFlowDocs() {
  return useMemo(() => ({
    decisionOrder: [
      { step: 1, check: 'Emergency Override', result: 'Always allow emergency alerts' },
      { step: 2, check: 'Manual Teacher Bypass', result: 'Allow teacher-initiated messages' },
      { step: 3, check: 'Global Opt-Out', result: 'Block if parent opted out of all' },
      { step: 4, check: 'Category Opt-Out', result: 'Block if opted out of category' },
      { step: 5, check: 'Consent Status', result: 'Check explicit consent' },
      { step: 6, check: 'Conflict Resolution', result: 'Apply strategy if multiple guardians' },
    ],
    bypassRules: [
      { type: 'Emergency', description: 'Emergency alerts always bypass opt-out' },
      { type: 'Teacher Manual', description: 'Direct teacher messages bypass automated opt-out' },
    ],
    conflictStrategies: [
      { name: 'any_guardian_allows', usedFor: 'Attendance, Academic, Announcements, Events' },
      { name: 'primary_guardian_decides', usedFor: 'Fee Communications' },
    ],
  }), []);
}

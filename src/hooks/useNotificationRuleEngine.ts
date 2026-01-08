import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  NotificationRule,
  RuleEvaluationContext,
  RuleEvaluationResult,
  QueuedNotification,
  MessageTemplate,
  TriggerEvent,
  DEFAULT_RULES,
  DEFAULT_TEMPLATES,
  evaluateAllRules,
  getMatchingRules,
  storeRulesLocally,
  getLocalRules,
  queueNotificationLocally,
  getLocalQueue,
  removeFromLocalQueue,
  getPendingSyncNotifications,
  markAsSynced,
} from '@/lib/notification-rule-engine';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// RULES MANAGEMENT (Local-only for now - no DB tables)
// ============================================================================

/**
 * Fetches and caches notification rules with offline fallback
 */
export function useNotificationRules(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['notification-rules', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Return local rules first
      const localRules = getLocalRules();
      if (localRules.length > 0) {
        return localRules;
      }

      // Fall back to defaults if nothing stored
      const defaultRules = DEFAULT_RULES.map((rule, index) => ({
        ...rule,
        id: `default_${index}`,
        schoolId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
      })) as NotificationRule[];

      storeRulesLocally(defaultRules);
      return defaultRules;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get message templates
 */
export function useMessageTemplates(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['notification-templates', schoolId],
    queryFn: async () => DEFAULT_TEMPLATES,
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// RULE EVALUATION
// ============================================================================

/**
 * Hook to evaluate rules against a context
 */
export function useRuleEvaluation(schoolId: string | undefined) {
  const { data: rules = [] } = useNotificationRules(schoolId);
  const { data: templates = DEFAULT_TEMPLATES } = useMessageTemplates(schoolId);

  const evaluate = useCallback(
    (context: RuleEvaluationContext): RuleEvaluationResult[] => {
      return evaluateAllRules(rules, context, templates);
    },
    [rules, templates]
  );

  const getMatching = useCallback(
    (context: RuleEvaluationContext): RuleEvaluationResult[] => {
      return getMatchingRules(rules, context, templates);
    },
    [rules, templates]
  );

  return { evaluate, getMatching, rules, templates };
}

/**
 * Hook to trigger a notification event and queue matching notifications
 */
export function useTriggerNotificationEvent(schoolId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getMatching } = useRuleEvaluation(schoolId);

  return useMutation({
    mutationFn: async (context: Omit<RuleEvaluationContext, 'schoolId'>) => {
      if (!schoolId) throw new Error('School ID required');

      const fullContext: RuleEvaluationContext = { ...context, schoolId };
      const matchingResults = getMatching(fullContext);
      const queuedNotifications: QueuedNotification[] = [];
      
      for (const result of matchingResults) {
        if (result.notification) {
          queueNotificationLocally(result.notification);
          queuedNotifications.push(result.notification);
        }
      }

      return { matchingResults, queuedNotifications, wasOffline: !navigator.onLine };
    },
    onSuccess: (data) => {
      if (data.queuedNotifications.length > 0) {
        toast({ title: 'Notifications queued', description: `${data.queuedNotifications.length} notification(s) scheduled` });
      }
      queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
    },
  });
}

// ============================================================================
// QUEUE MANAGEMENT (Local-only)
// ============================================================================

export function useNotificationQueue(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['notification-queue', schoolId],
    queryFn: async () => getLocalQueue(),
    enabled: !!schoolId,
    refetchInterval: 30000,
  });
}

export function useCancelNotification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ localId, reason }: { notificationId?: string; localId?: string; reason: string }) => {
      if (localId) removeFromLocalQueue(localId);
      return { localId };
    },
    onSuccess: () => {
      toast({ title: 'Notification cancelled' });
      queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
    },
  });
}

export function useSyncPendingNotifications(schoolId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const sync = useCallback(async () => {
    if (!schoolId || isSyncing) return;
    setIsSyncing(true);
    const pending = getPendingSyncNotifications();
    pending.forEach(n => markAsSynced(n.localId));
    setIsSyncing(false);
  }, [schoolId, isSyncing]);

  return { sync, isSyncing };
}

export function useHumanOverride(schoolId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ localId, action }: { notificationId?: string; localId?: string; action: 'suppress' | 'force_send'; reason: string; overriddenBy: string }) => {
      if (localId && action === 'suppress') removeFromLocalQueue(localId);
      return { action };
    },
    onSuccess: (data) => {
      toast({ title: data.action === 'suppress' ? 'Notification suppressed' : 'Notification sent' });
      queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
    },
  });
}

// ============================================================================
// CONVENIENCE TRIGGERS
// ============================================================================

export function useTriggerAbsenceNotification(schoolId: string | undefined) {
  const trigger = useTriggerNotificationEvent(schoolId);
  return useCallback(
    (studentId: string, studentName: string, date: string, consecutiveDays?: number) => {
      const eventType: TriggerEvent = consecutiveDays && consecutiveDays >= 3 ? 'consecutive_absence_threshold' : 'student_marked_absent';
      return trigger.mutateAsync({ eventType, studentId, eventData: { student_name: studentName, date, consecutive_days: consecutiveDays || 1 }, timestamp: new Date().toISOString() });
    },
    [trigger]
  );
}

export function useTriggerLateArrivalNotification(schoolId: string | undefined) {
  const trigger = useTriggerNotificationEvent(schoolId);
  return useCallback(
    (studentId: string, studentName: string, arrivalTime: string) => trigger.mutateAsync({ eventType: 'student_marked_late', studentId, eventData: { student_name: studentName, arrival_time: arrivalTime }, timestamp: new Date().toISOString() }),
    [trigger]
  );
}

export function useTriggerEmergencyNotification(schoolId: string | undefined) {
  const trigger = useTriggerNotificationEvent(schoolId);
  return useCallback(
    (emergencyType: string, emergencyMessage: string) => trigger.mutateAsync({ eventType: 'emergency_declared', eventData: { emergency_type: emergencyType, emergency_message: emergencyMessage }, timestamp: new Date().toISOString() }),
    [trigger]
  );
}

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AttendanceEvent,
  AttendanceNotificationResult,
  processAttendanceEvent,
  markNotificationSent,
  clearOldSuppressionRecords,
  validateMessageTone,
  ATTENDANCE_TEMPLATES,
  TRIGGER_TO_MESSAGE_MAP,
} from '@/lib/attendance-notification-rules';
import { queueNotificationLocally, QueuedNotification } from '@/lib/notification-rule-engine';

// ============================================================================
// ATTENDANCE NOTIFICATION HOOKS
// ============================================================================

/**
 * Hook to trigger attendance notifications with duplicate suppression
 */
export function useTriggerAttendanceNotification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: AttendanceEvent): Promise<AttendanceNotificationResult & { notificationId?: string }> => {
      // Clean up old suppression records periodically
      clearOldSuppressionRecords();

      // Process the event
      const result = processAttendanceEvent(event);

      if (!result.shouldSend) {
        return result;
      }

      // Find the template
      const template = ATTENDANCE_TEMPLATES.find(t => t.id === result.templateId);
      if (!template) {
        return { ...result, shouldSend: false, reason: 'Template not found' };
      }

      // Validate message tone before sending
      const renderedBody = renderTemplate(template.body, result.templateVariables || {});
      const toneCheck = validateMessageTone(renderedBody);
      
      if (!toneCheck.isValid) {
        console.error('Message tone violation:', toneCheck.violations);
        return { 
          ...result, 
          shouldSend: false, 
          reason: `Tone violation: ${toneCheck.violations.join(', ')}` 
        };
      }

      // Create the queued notification
      const notification: QueuedNotification = {
        id: crypto.randomUUID(),
        ruleId: `attendance_${result.templateId}`,
        category: template.category,
        templateId: result.templateId!,
        templateVariables: result.templateVariables || {},
        targetAudience: 'primary_guardian',
        targetGuardianIds: [],
        scheduledFor: result.scheduledFor!,
        cancellableUntil: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        currentEscalationLevel: 'none',
        status: 'pending',
        syncedToServer: false,
        localId: `local_attendance_${Date.now()}`,
        createdAt: new Date().toISOString(),
        context: {
          schoolId: '',
          studentId: event.studentId,
          classId: event.classId,
          eventType: 'student_marked_absent',
          eventData: event as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        },
      };

      // Queue locally
      queueNotificationLocally(notification);

      // Mark as sent for suppression
      const triggerType = event.newStatus === 'absent' 
        ? 'student_marked_absent' 
        : event.newStatus === 'late' 
          ? 'student_marked_late' 
          : 'attendance_corrected_to_present';
      
      markNotificationSent(event.studentId, event.date, triggerType);

      return { ...result, notificationId: notification.id };
    },
    onSuccess: (result) => {
      if (result.shouldSend) {
        toast({
          title: 'Notification scheduled',
          description: 'Parent will be notified shortly',
        });
        queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Notification failed',
        description: error instanceof Error ? error.message : 'Could not schedule notification',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to check if a notification would be sent (preview mode)
 */
export function usePreviewAttendanceNotification() {
  return useCallback((event: AttendanceEvent): AttendanceNotificationResult & { renderedMessage?: string } => {
    const result = processAttendanceEvent(event);

    if (!result.shouldSend || !result.templateId) {
      return result;
    }

    const template = ATTENDANCE_TEMPLATES.find(t => t.id === result.templateId);
    if (!template) {
      return result;
    }

    const renderedMessage = renderTemplate(template.body, result.templateVariables || {});

    return { ...result, renderedMessage };
  }, []);
}

/**
 * Hook to get trigger-to-message mappings for documentation
 */
export function useAttendanceTriggerMappings() {
  return TRIGGER_TO_MESSAGE_MAP;
}

/**
 * Hook to validate custom message text against tone rules
 */
export function useValidateMessageTone() {
  return useCallback((message: string) => {
    return validateMessageTone(message);
  }, []);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Renders a template with variables
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Hook to batch process multiple attendance events
 */
export function useBatchAttendanceNotifications() {
  const triggerMutation = useTriggerAttendanceNotification();

  return useMutation({
    mutationFn: async (events: AttendanceEvent[]) => {
      const results: (AttendanceNotificationResult & { studentId: string })[] = [];

      for (const event of events) {
        const result = await triggerMutation.mutateAsync(event);
        results.push({ ...result, studentId: event.studentId });
      }

      return results;
    },
  });
}

/**
 * Integration hook for attendance marking
 * Call this after marking attendance to automatically trigger notifications
 */
export function useAttendanceWithNotifications() {
  const triggerNotification = useTriggerAttendanceNotification();

  const markAbsent = useCallback(
    async (params: {
      studentId: string;
      studentName: string;
      classId: string;
      className: string;
      schoolName: string;
      date?: string;
      markedBy: string;
    }) => {
      const event: AttendanceEvent = {
        ...params,
        date: params.date || new Date().toISOString().split('T')[0],
        newStatus: 'absent',
      };

      return triggerNotification.mutateAsync(event);
    },
    [triggerNotification]
  );

  const markLate = useCallback(
    async (params: {
      studentId: string;
      studentName: string;
      classId: string;
      className: string;
      schoolName: string;
      arrivalTime: string;
      date?: string;
      markedBy: string;
    }) => {
      const event: AttendanceEvent = {
        studentId: params.studentId,
        studentName: params.studentName,
        classId: params.classId,
        className: params.className,
        schoolName: params.schoolName,
        date: params.date || new Date().toISOString().split('T')[0],
        time: params.arrivalTime,
        newStatus: 'late',
        markedBy: params.markedBy,
      };

      return triggerNotification.mutateAsync(event);
    },
    [triggerNotification]
  );

  const correctToPresent = useCallback(
    async (params: {
      studentId: string;
      studentName: string;
      classId: string;
      className: string;
      schoolName: string;
      date?: string;
      markedBy: string;
    }) => {
      const event: AttendanceEvent = {
        ...params,
        date: params.date || new Date().toISOString().split('T')[0],
        previousStatus: 'absent',
        newStatus: 'present',
      };

      return triggerNotification.mutateAsync(event);
    },
    [triggerNotification]
  );

  return {
    markAbsent,
    markLate,
    correctToPresent,
    isProcessing: triggerNotification.isPending,
  };
}

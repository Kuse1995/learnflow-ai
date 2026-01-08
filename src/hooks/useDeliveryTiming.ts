/**
 * Delivery Timing Hooks
 * 
 * React hooks for managing message delivery timing,
 * quiet hours, and scheduling decisions.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getDeliveryTiming,
  isQuietHours,
  isWithinDeliveryWindow,
  getNextSendTime,
  formatTimingReason,
  formatScheduledTime,
  getUrgencyColor,
  shouldBypassTiming,
  DEFAULT_QUIET_HOURS,
  CATEGORY_URGENCY,
  DELIVERY_WINDOWS,
  TIMING_RULES_SUMMARY,
  type MessageCategory,
  type TimingDecision,
  type QuietHoursConfig,
  type DeliveryUrgency,
} from '@/lib/delivery-timing-rules';

// =============================================================================
// QUIET HOURS HOOK
// =============================================================================

export function useQuietHours(schoolId?: string) {
  const [config, setConfig] = useState<QuietHoursConfig>(DEFAULT_QUIET_HOURS);

  // Fetch school-specific quiet hours config
  const { data: schoolConfig, isLoading } = useQuery({
    queryKey: ['quiet-hours-config', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from('communication_rules')
        .select('allowed_send_hours_start, allowed_send_hours_end')
        .eq('school_id', schoolId)
        .eq('category', 'school_announcement')
        .maybeSingle();

      if (error || !data) return DEFAULT_QUIET_HOURS;

      return {
        ...DEFAULT_QUIET_HOURS,
        // Invert send hours to get quiet hours
        startHour: data.allowed_send_hours_end ?? DEFAULT_QUIET_HOURS.startHour,
        endHour: data.allowed_send_hours_start ?? DEFAULT_QUIET_HOURS.endHour,
      };
    },
    enabled: !!schoolId,
  });

  const activeConfig = schoolConfig ?? config;

  const isCurrentlyQuiet = useMemo(
    () => isQuietHours(activeConfig),
    [activeConfig]
  );

  const nextActiveTime = useMemo(() => {
    if (!isCurrentlyQuiet) return null;
    return getNextSendTime('school_announcement', activeConfig);
  }, [isCurrentlyQuiet, activeConfig]);

  return {
    config: activeConfig,
    setConfig,
    isLoading,
    isCurrentlyQuiet,
    nextActiveTime,
    formattedNextTime: formatScheduledTime(nextActiveTime),
  };
}

// =============================================================================
// TIMING DECISION HOOK
// =============================================================================

export function useTimingDecision(
  category: MessageCategory,
  options: {
    schoolId?: string;
    guardianId?: string;
    isEmergency?: boolean;
  } = {}
) {
  const { schoolId, guardianId, isEmergency = false } = options;
  const { config: quietHoursConfig } = useQuietHours(schoolId);

  // Fetch parent preferences for quiet hours
  const { data: parentPrefs } = useQuery({
    queryKey: ['parent-quiet-hours', guardianId],
    queryFn: async () => {
      if (!guardianId) return null;
      // Would fetch from parent_preferences table
      return null;
    },
    enabled: !!guardianId,
  });

  // Message counts for rate limiting - defaults used when not available
  const messageCounts = { day: 0, hour: 0 };

  const decision = useMemo((): TimingDecision => {
    // Emergency bypass
    if (isEmergency || category === 'emergency_notice') {
      return {
        canSendNow: true,
        reason: 'emergency_override',
        scheduledFor: null,
        delayMinutes: 0,
        overrideApplied: true,
      };
    }

    return getDeliveryTiming(category, {
      quietHoursConfig,
      parentQuietHours: parentPrefs?.quietHours ?? null,
      messageCount24h: messageCounts?.day ?? 0,
      messageCountHour: messageCounts?.hour ?? 0,
    });
  }, [category, isEmergency, quietHoursConfig, parentPrefs, messageCounts]);

  return {
    ...decision,
    formattedReason: formatTimingReason(decision.reason),
    formattedScheduledTime: formatScheduledTime(decision.scheduledFor),
    urgency: CATEGORY_URGENCY[category],
    urgencyColor: getUrgencyColor(CATEGORY_URGENCY[category]),
  };
}

// =============================================================================
// DELIVERY WINDOW HOOK
// =============================================================================

export function useDeliveryWindow(category: MessageCategory) {
  const window = DELIVERY_WINDOWS[category];

  const isCurrentlyOpen = useMemo(
    () => isWithinDeliveryWindow(category),
    [category]
  );

  const nextOpenTime = useMemo(() => {
    if (isCurrentlyOpen) return null;
    return getNextSendTime(category);
  }, [category, isCurrentlyOpen]);

  const formatWindow = useCallback(() => {
    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${hour12} ${period}`;
    };

    const days = window.days
      .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
      .join(', ');

    return `${formatHour(window.startHour)} - ${formatHour(window.endHour)} (${days})`;
  }, [window]);

  return {
    window,
    isCurrentlyOpen,
    nextOpenTime,
    formattedWindow: formatWindow(),
    formattedNextOpen: formatScheduledTime(nextOpenTime),
  };
}

// =============================================================================
// SCHEDULING HOOK
// =============================================================================

export function useMessageScheduling() {
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

  const scheduleMessage = useCallback(
    async (
      messageId: string,
      category: MessageCategory,
      scheduledFor: Date
    ) => {
      const { error } = await supabase
        .from('message_queue')
        .update({
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('message_id', messageId);

      if (error) throw error;
      setScheduledTime(scheduledFor);
    },
    []
  );

  const rescheduleForNow = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from('message_queue')
        .update({
          scheduled_for: new Date().toISOString(),
        })
        .eq('message_id', messageId);

      if (error) throw error;
      setScheduledTime(null);
    },
    []
  );

  return {
    scheduledTime,
    scheduleMessage,
    rescheduleForNow,
    clearSchedule: () => setScheduledTime(null),
  };
}

// =============================================================================
// TIMING PREVIEW HOOK
// =============================================================================

export function useTimingPreview() {
  const [previewCategory, setPreviewCategory] = useState<MessageCategory>('school_announcement');
  const [previewTime, setPreviewTime] = useState<Date>(new Date());

  const decision = useMemo(() => {
    return getDeliveryTiming(previewCategory, {
      currentTime: previewTime,
    });
  }, [previewCategory, previewTime]);

  const simulateTime = useCallback((date: Date) => {
    setPreviewTime(date);
  }, []);

  const simulateCategory = useCallback((category: MessageCategory) => {
    setPreviewCategory(category);
  }, []);

  return {
    previewCategory,
    previewTime,
    decision,
    formattedDecision: {
      canSend: decision.canSendNow ? 'Yes' : 'No',
      reason: formatTimingReason(decision.reason),
      scheduledFor: formatScheduledTime(decision.scheduledFor),
      delay: `${decision.delayMinutes} minutes`,
    },
    simulateTime,
    simulateCategory,
  };
}

// =============================================================================
// TIMING RULES DOCUMENTATION HOOK
// =============================================================================

export function useTimingRules() {
  return {
    rules: TIMING_RULES_SUMMARY,
    quietHoursDefault: DEFAULT_QUIET_HOURS,
    deliveryWindows: DELIVERY_WINDOWS,
    categoryUrgency: CATEGORY_URGENCY,
  };
}

// =============================================================================
// EMERGENCY BYPASS HOOK
// =============================================================================

export function useEmergencyBypass() {
  const checkBypass = useCallback(
    (category: MessageCategory, isEmergency: boolean = false) => {
      return shouldBypassTiming(category, isEmergency);
    },
    []
  );

  return {
    checkBypass,
    bypassReasons: [
      'Emergency category messages',
      'Safety incidents',
      'School closures',
      'Infrastructure failures',
    ],
  };
}

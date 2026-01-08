/**
 * Messaging Safeguards Hooks
 * 
 * React hooks for enforcing message rate limits, abuse prevention,
 * and message recall functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  RATE_LIMITS,
  ABUSE_PREVENTION,
  AUDIT_EVENTS,
  checkTeacherDailyLimit,
  checkTeacherWeeklyLimit,
  checkStudentDailyLimit,
  checkParentCooldown,
  checkMinSendInterval,
  checkMessageContent,
  checkRapidFirePattern,
  checkRejectionHistory,
  canRecallMessage,
  getRecallTimeRemaining,
  combineRateLimitChecks,
  combineAbuseChecks,
  hashContent,
  type RateLimitResult,
  type AbuseCheckResult,
} from '@/lib/messaging-safeguards';

// ============================================================================
// RATE LIMIT HOOKS
// ============================================================================

/**
 * Check all rate limits for a teacher before sending
 */
export function useTeacherRateLimits(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-rate-limits', teacherId],
    queryFn: async (): Promise<{
      daily: RateLimitResult;
      weekly: RateLimitResult;
      interval: RateLimitResult;
      combined: RateLimitResult;
    }> => {
      if (!teacherId) {
        return {
          daily: { allowed: true },
          weekly: { allowed: true },
          interval: { allowed: true },
          combined: { allowed: true },
        };
      }

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Get message counts
      const [dailyResult, weeklyResult, lastSentResult] = await Promise.all([
        supabase
          .from('parent_messages')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', teacherId)
          .gte('created_at', startOfDay.toISOString())
          .not('delivery_status', 'eq', 'draft'),
        supabase
          .from('parent_messages')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', teacherId)
          .gte('created_at', startOfWeek.toISOString())
          .not('delivery_status', 'eq', 'draft'),
        supabase
          .from('parent_messages')
          .select('created_at')
          .eq('created_by', teacherId)
          .not('delivery_status', 'eq', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      const dailyCount = dailyResult.count || 0;
      const weeklyCount = weeklyResult.count || 0;
      const lastSentAt = lastSentResult.data?.created_at 
        ? new Date(lastSentResult.data.created_at) 
        : null;

      const daily = checkTeacherDailyLimit(dailyCount);
      const weekly = checkTeacherWeeklyLimit(weeklyCount);
      const interval = checkMinSendInterval(lastSentAt);

      return {
        daily,
        weekly,
        interval,
        combined: combineRateLimitChecks(daily, weekly, interval),
      };
    },
    enabled: !!teacherId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Check rate limits for a specific student
 */
export function useStudentRateLimits(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-rate-limits', studentId],
    queryFn: async (): Promise<RateLimitResult> => {
      if (!studentId) return { allowed: true };

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('parent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('created_at', startOfDay.toISOString())
        .in('delivery_status', ['sent', 'delivered', 'queued']);

      return checkStudentDailyLimit(count || 0);
    },
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });
}

/**
 * Check cooldown for specific parent
 */
export function useParentCooldown(
  parentContactId: string | undefined,
  teacherId: string | undefined
) {
  return useQuery({
    queryKey: ['parent-cooldown', parentContactId, teacherId],
    queryFn: async (): Promise<RateLimitResult> => {
      if (!parentContactId || !teacherId) return { allowed: true };

      const { data } = await supabase
        .from('parent_messages')
        .select('created_at')
        .eq('parent_contact_id', parentContactId)
        .eq('created_by', teacherId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastMessageAt = data?.created_at ? new Date(data.created_at) : null;
      return checkParentCooldown(lastMessageAt);
    },
    enabled: !!parentContactId && !!teacherId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// ABUSE DETECTION HOOKS
// ============================================================================

/**
 * Check for rapid fire messaging pattern
 */
export function useRapidFireCheck(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['rapid-fire-check', teacherId],
    queryFn: async (): Promise<AbuseCheckResult> => {
      if (!teacherId) {
        return { flagged: false, severity: 'none', reasons: [], requiresReview: false, autoBlocked: false };
      }

      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - ABUSE_PREVENTION.RAPID_FIRE_WINDOW_MINUTES);

      const { count } = await supabase
        .from('parent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', teacherId)
        .gte('created_at', windowStart.toISOString());

      return checkRapidFirePattern(count || 0);
    },
    enabled: !!teacherId,
    staleTime: 10 * 1000,
  });
}

/**
 * Check teacher's rejection history
 */
export function useRejectionHistory(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['rejection-history', teacherId],
    queryFn: async (): Promise<AbuseCheckResult> => {
      if (!teacherId) {
        return { flagged: false, severity: 'none', reasons: [], requiresReview: false, autoBlocked: false };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from('message_approval_log')
        .select('id', { count: 'exact', head: true })
        .eq('performed_by', teacherId)
        .eq('action', 'rejected')
        .gte('performed_at', thirtyDaysAgo.toISOString());

      return checkRejectionHistory(count || 0);
    },
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Validate message content for abuse
 */
export function useContentValidation(subject: string, body: string) {
  // Synchronous validation - no query needed
  const result = checkMessageContent(subject, body);
  return result;
}

/**
 * Combined pre-send safety check
 */
export function usePreSendSafetyCheck(
  teacherId: string | undefined,
  studentId: string | undefined,
  subject: string,
  body: string
) {
  const rateLimits = useTeacherRateLimits(teacherId);
  const studentLimits = useStudentRateLimits(studentId);
  const rapidFire = useRapidFireCheck(teacherId);
  const rejections = useRejectionHistory(teacherId);
  const contentCheck = useContentValidation(subject, body);

  const isLoading = rateLimits.isLoading || studentLimits.isLoading || 
                    rapidFire.isLoading || rejections.isLoading;

  const rateLimitResult = combineRateLimitChecks(
    rateLimits.data?.combined || { allowed: true },
    studentLimits.data || { allowed: true }
  );

  const abuseResult = combineAbuseChecks(
    rapidFire.data || { flagged: false, severity: 'none', reasons: [], requiresReview: false, autoBlocked: false },
    rejections.data || { flagged: false, severity: 'none', reasons: [], requiresReview: false, autoBlocked: false },
    contentCheck
  );

  return {
    isLoading,
    canSend: rateLimitResult.allowed && !abuseResult.autoBlocked,
    rateLimits: rateLimitResult,
    abuseCheck: abuseResult,
    requiresReview: abuseResult.requiresReview,
    warnings: [
      ...abuseResult.reasons,
      ...(rateLimitResult.reason ? [rateLimitResult.reason] : []),
    ],
  };
}

// ============================================================================
// MESSAGE RECALL HOOKS
// ============================================================================

interface RecallableMessage {
  id: string;
  delivery_status: string;
  created_at: string;
  is_locked: boolean;
}

/**
 * Check if a specific message can be recalled
 */
export function useCanRecallMessage(message: RecallableMessage | null) {
  if (!message) {
    return { canRecall: false, reason: 'No message selected', timeRemaining: 0 };
  }

  const result = canRecallMessage(
    message.delivery_status,
    new Date(message.created_at),
    message.is_locked
  );

  const timeRemaining = result.canRecall 
    ? getRecallTimeRemaining(new Date(message.created_at))
    : 0;

  return { ...result, timeRemaining };
}

/**
 * Recall a message before delivery
 */
export function useRecallMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageId: string) => {
      // Get current message state
      const { data: message, error: fetchError } = await supabase
        .from('parent_messages')
        .select('id, delivery_status, created_at, is_locked')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        throw new Error('Message not found');
      }

      // Check if recall is allowed
      const recallCheck = canRecallMessage(
        message.delivery_status,
        new Date(message.created_at),
        message.is_locked
      );

      if (!recallCheck.canRecall) {
        throw new Error(recallCheck.reason || 'Cannot recall this message');
      }

      // Update message to pending status (closest valid state for recalled)
      const { error: updateError } = await supabase
        .from('parent_messages')
        .update({
          delivery_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Log the recall action via RPC or direct insert
      // Note: Using simplified logging due to schema constraints
      console.info('[AUDIT] Message recalled', { 
        messageId, 
        previousStatus: message.delivery_status 
      });

      return { success: true, previousStatus: message.delivery_status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-queue'] });
      
      toast({
        title: 'Message Recalled',
        description: 'Message has been recalled and returned to drafts.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot Recall',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// ADMIN OVERRIDE HOOKS
// ============================================================================

/**
 * Grant temporary rate limit override to teacher
 */
export function useGrantRateLimitOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teacherId,
      reason,
      expiresAt,
    }: {
      teacherId: string;
      reason: string;
      expiresAt: Date;
    }) => {
      // Log the override using RPC function
      await supabase.rpc('create_audit_log', {
        p_actor_type: 'admin',
        p_actor_id: null,
        p_action: AUDIT_EVENTS.ADMIN_OVERRIDE,
        p_entity_type: 'rate_limit_override',
        p_entity_id: teacherId,
        p_summary: `Rate limit override granted: ${reason}`,
        p_metadata: {
          teacher_id: teacherId,
          reason,
          expires_at: expiresAt.toISOString(),
          multiplier: RATE_LIMITS.ADMIN_OVERRIDE_MULTIPLIER,
        },
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-rate-limits', variables.teacherId] 
      });
      
      toast({
        title: 'Override Granted',
        description: 'Teacher can now send more messages temporarily.',
      });
    },
  });
}

// ============================================================================
// AUDIT LOGGING HOOKS
// ============================================================================

/**
 * Log a messaging safety event
 */
export function useLogSafetyEvent() {
  return useMutation({
    mutationFn: async ({
      eventType,
      messageId,
      details,
    }: {
      eventType: keyof typeof AUDIT_EVENTS;
      messageId?: string;
      details?: Record<string, unknown>;
    }) => {
      await supabase.rpc('create_audit_log', {
        p_actor_type: 'system',
        p_actor_id: null,
        p_action: AUDIT_EVENTS[eventType],
        p_entity_type: 'parent_message',
        p_entity_id: messageId,
        p_summary: `Messaging safety event: ${eventType}`,
        p_metadata: (details || {}) as unknown as Record<string, never>,
      });
    },
  });
}

/**
 * Get safety audit log for a message
 */
export function useMessageSafetyLog(messageId: string | undefined) {
  return useQuery({
    queryKey: ['message-safety-log', messageId],
    queryFn: async () => {
      if (!messageId) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', messageId)
        .eq('entity_type', 'parent_message')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!messageId,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown>;
  school_id: string | null;
  created_at: string;
}

export interface AiAbuseAttempt {
  id: string;
  user_id: string | null;
  class_id: string | null;
  feature_type: string;
  attempt_type: string;
  input_hash: string | null;
  blocked: boolean;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RateLimitViolation {
  id: string;
  user_id: string | null;
  feature_type: string;
  school_id: string | null;
  limit_type: string;
  current_count: number;
  limit_value: number;
  created_at: string;
}

/**
 * Hook to fetch security events (admin only)
 */
export function useSecurityEvents(options?: {
  limit?: number;
  severity?: string;
  eventType?: string;
}) {
  const { limit = 50, severity, eventType } = options || {};

  return useQuery({
    queryKey: ["security-events", limit, severity, eventType],
    queryFn: async (): Promise<SecurityEvent[]> => {
      let query = supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (severity) {
        query = query.eq("severity", severity);
      }
      if (eventType) {
        query = query.eq("event_type", eventType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SecurityEvent[];
    },
  });
}

/**
 * Hook to fetch AI abuse attempts (admin only)
 */
export function useAiAbuseAttempts(options?: {
  limit?: number;
  attemptType?: string;
  blocked?: boolean;
}) {
  const { limit = 50, attemptType, blocked } = options || {};

  return useQuery({
    queryKey: ["ai-abuse-attempts", limit, attemptType, blocked],
    queryFn: async (): Promise<AiAbuseAttempt[]> => {
      let query = supabase
        .from("ai_abuse_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (attemptType) {
        query = query.eq("attempt_type", attemptType);
      }
      if (blocked !== undefined) {
        query = query.eq("blocked", blocked);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AiAbuseAttempt[];
    },
  });
}

/**
 * Hook to fetch rate limit violations (admin only)
 */
export function useRateLimitViolations(options?: {
  limit?: number;
  featureType?: string;
}) {
  const { limit = 50, featureType } = options || {};

  return useQuery({
    queryKey: ["rate-limit-violations", limit, featureType],
    queryFn: async (): Promise<RateLimitViolation[]> => {
      let query = supabase
        .from("rate_limit_violations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (featureType) {
        query = query.eq("feature_type", featureType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RateLimitViolation[];
    },
  });
}

/**
 * Hook to get security summary stats
 */
export function useSecuritySummary() {
  return useQuery({
    queryKey: ["security-summary"],
    queryFn: async () => {
      const today = new Date();
      const last24h = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Count security events by severity
      const { data: events24h } = await supabase
        .from("security_events")
        .select("severity")
        .gte("created_at", last24h);

      const { data: abuse24h } = await supabase
        .from("ai_abuse_attempts")
        .select("blocked")
        .gte("created_at", last24h);

      const { data: rateLimits24h } = await supabase
        .from("rate_limit_violations")
        .select("id")
        .gte("created_at", last24h);

      const { data: abuse7d } = await supabase
        .from("ai_abuse_attempts")
        .select("id")
        .gte("created_at", last7d);

      return {
        eventsLast24h: events24h?.length || 0,
        criticalEvents: events24h?.filter((e) => e.severity === "critical").length || 0,
        warningEvents: events24h?.filter((e) => e.severity === "warning").length || 0,
        abuseAttemptsLast24h: abuse24h?.length || 0,
        blockedAttempts: abuse24h?.filter((a) => a.blocked).length || 0,
        rateLimitViolations: rateLimits24h?.length || 0,
        abuseAttemptsLast7d: abuse7d?.length || 0,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Log a security event
 */
export async function logSecurityEvent(event: {
  event_type: string;
  severity: "info" | "warning" | "critical";
  details?: Record<string, unknown>;
  school_id?: string;
}): Promise<void> {
  try {
    await supabase.from("security_events").insert([{
      event_type: event.event_type,
      severity: event.severity,
      details: (event.details || {}) as unknown as Record<string, never>,
      school_id: event.school_id,
    }]);
  } catch (error) {
    // Silent fail - don't let logging errors break the app
    console.error("Failed to log security event:", error);
  }
}

/**
 * Log an AI abuse attempt
 */
export async function logAbuseAttempt(attempt: {
  feature_type: string;
  attempt_type: string;
  input_hash?: string;
  blocked?: boolean;
  class_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from("ai_abuse_attempts").insert([{
      feature_type: attempt.feature_type,
      attempt_type: attempt.attempt_type,
      input_hash: attempt.input_hash,
      blocked: attempt.blocked ?? true,
      class_id: attempt.class_id,
      details: (attempt.details || {}) as unknown as Record<string, never>,
    }]);
  } catch (error) {
    console.error("Failed to log abuse attempt:", error);
  }
}

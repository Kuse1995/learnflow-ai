import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export type AuditActorType = 'system' | 'admin' | 'teacher' | 'ai_agent';

export interface AuditLog {
  id: string;
  actor_type: AuditActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Json;
  environment: string;
  previous_hash: string | null;
  entry_hash: string;
  created_at: string;
}

export interface AiActionTrace {
  id: string;
  audit_log_id: string;
  agent_name: string;
  purpose: string;
  data_sources: string[];
  class_id: string | null;
  student_id: string | null;
  teacher_response: 'approved' | 'ignored' | 'pending' | null;
  teacher_responded_at: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  actorType?: AuditActorType;
  action?: string;
  entityType?: string;
  environment?: string;
}

export interface CreateAuditLogInput {
  actor_type: AuditActorType;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  metadata?: Json;
  environment?: string;
}

// Fetch audit logs with filters
export function useAuditLogs(filters: AuditLogFilters = {}, limit = 100) {
  return useQuery({
    queryKey: ["audit-logs", filters, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters.actorType) {
        query = query.eq("actor_type", filters.actorType);
      }
      if (filters.action) {
        query = query.ilike("action", `%${filters.action}%`);
      }
      if (filters.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters.environment) {
        query = query.eq("environment", filters.environment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Fetch AI action traces
export function useAiActionTraces(classId?: string) {
  return useQuery({
    queryKey: ["ai-action-traces", classId],
    queryFn: async () => {
      let query = supabase
        .from("ai_action_traces")
        .select("*")
        .order("created_at", { ascending: false });

      if (classId) {
        query = query.eq("class_id", classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AiActionTrace[];
    },
  });
}

// Create audit log using RPC function
export function useCreateAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAuditLogInput) => {
      const { data, error } = await supabase.rpc("create_audit_log", {
        p_actor_type: input.actor_type,
        p_actor_id: input.actor_id || null,
        p_action: input.action,
        p_entity_type: input.entity_type,
        p_entity_id: input.entity_id || null,
        p_summary: input.summary,
        p_metadata: input.metadata || {},
        p_environment: input.environment || "development",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

// Create AI action trace
export function useCreateAiActionTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      audit_log_id: string;
      agent_name: string;
      purpose: string;
      data_sources?: string[];
      class_id?: string | null;
      student_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("ai_action_traces")
        .insert({
          audit_log_id: input.audit_log_id,
          agent_name: input.agent_name,
          purpose: input.purpose,
          data_sources: input.data_sources || [],
          class_id: input.class_id || null,
          student_id: input.student_id || null,
          teacher_response: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-action-traces"] });
    },
  });
}

// Update AI action trace teacher response
export function useUpdateAiTraceResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      teacher_response: 'approved' | 'ignored';
    }) => {
      const { data, error } = await supabase
        .from("ai_action_traces")
        .update({
          teacher_response: input.teacher_response,
          teacher_responded_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-action-traces"] });
    },
  });
}

// Verify audit chain integrity
export function useVerifyAuditChain(environment: string) {
  return useQuery({
    queryKey: ["audit-chain-verify", environment],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_audit_chain", {
        p_environment: environment,
      });
      if (error) throw error;
      return data as { is_valid: boolean; broken_at: string | null; expected_hash: string | null; actual_hash: string | null }[];
    },
    refetchInterval: 60000, // Check every minute
  });
}

// Get unique action types for filtering
export function useAuditActionTypes() {
  return useQuery({
    queryKey: ["audit-action-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("action")
        .limit(1000);
      if (error) throw error;
      const unique = [...new Set((data || []).map((d) => d.action))];
      return unique.sort();
    },
  });
}

// Get unique entity types for filtering
export function useAuditEntityTypes() {
  return useQuery({
    queryKey: ["audit-entity-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("entity_type")
        .limit(1000);
      if (error) throw error;
      const unique = [...new Set((data || []).map((d) => d.entity_type))];
      return unique.sort();
    },
  });
}

// Export audit logs to CSV
export function exportAuditLogsToCSV(logs: AuditLog[]): string {
  const headers = [
    "Date",
    "Actor Type",
    "Action",
    "Entity Type",
    "Summary",
    "Environment",
  ];
  
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.actor_type,
    log.action,
    log.entity_type,
    `"${log.summary.replace(/"/g, '""')}"`,
    log.environment,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

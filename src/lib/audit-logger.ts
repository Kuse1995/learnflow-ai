import { supabase } from "@/integrations/supabase/client";
import type { AuditActorType } from "@/hooks/useAuditLogs";
import { Json } from "@/integrations/supabase/types";

interface LogOptions {
  actor_type: AuditActorType;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  environment?: string;
}

interface AiLogOptions extends LogOptions {
  agent_name: string;
  purpose: string;
  data_sources?: string[];
  class_id?: string | null;
  student_id?: string | null;
}

// Get current environment
function getEnvironment(): string {
  const env = import.meta.env.MODE || 'development';
  return env;
}

// Get current user ID if authenticated
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Main logging function
export async function logAuditEvent(options: LogOptions): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("create_audit_log", {
      p_actor_type: options.actor_type,
      p_actor_id: options.actor_id || null,
      p_action: options.action,
      p_entity_type: options.entity_type,
      p_entity_id: options.entity_id || null,
      p_summary: options.summary,
      p_metadata: (options.metadata || {}) as Json,
      p_environment: options.environment || getEnvironment(),
    });

    if (error) {
      console.error("Failed to log audit event:", error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error("Audit logging error:", err);
    return null;
  }
}

// Log AI action with traceability
export async function logAiAction(options: AiLogOptions): Promise<{ auditLogId: string; traceId: string } | null> {
  try {
    // First create the audit log
    const auditLogId = await logAuditEvent({
      ...options,
      actor_type: 'ai_agent',
      metadata: {
        ...options.metadata,
        agent_name: options.agent_name,
        purpose: options.purpose,
      },
    });

    if (!auditLogId) return null;

    // Then create the AI action trace
    const { data: trace, error: traceError } = await supabase
      .from("ai_action_traces")
      .insert({
        audit_log_id: auditLogId,
        agent_name: options.agent_name,
        purpose: options.purpose,
        data_sources: options.data_sources || [],
        class_id: options.class_id || null,
        student_id: options.student_id || null,
        teacher_response: "pending",
      })
      .select()
      .single();

    if (traceError) {
      console.error("Failed to create AI trace:", traceError);
      return null;
    }

    return { auditLogId, traceId: trace.id };
  } catch (err) {
    console.error("AI action logging error:", err);
    return null;
  }
}

// Convenience functions for common events

export async function logPlanActivation(schoolId: string, planName: string, activatedBy?: string) {
  const userId = activatedBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: userId ? 'admin' : 'system',
    actor_id: userId,
    action: 'plan_activated',
    entity_type: 'school',
    entity_id: schoolId,
    summary: `Plan "${planName}" was activated for the school`,
    metadata: { plan_name: planName },
  });
}

export async function logFeatureFlagChange(flagKey: string, enabled: boolean, changedBy?: string) {
  const userId = changedBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: 'admin',
    actor_id: userId,
    action: 'feature_flag_changed',
    entity_type: 'feature_flag',
    entity_id: null,
    summary: `Feature "${flagKey}" was ${enabled ? 'enabled' : 'disabled'}`,
    metadata: { flag_key: flagKey, enabled },
  });
}

export async function logTeacherApproval(
  entityType: string,
  entityId: string,
  approved: boolean,
  teacherId?: string
) {
  const userId = teacherId || await getCurrentUserId();
  return logAuditEvent({
    actor_type: 'teacher',
    actor_id: userId,
    action: approved ? 'teacher_approved' : 'teacher_rejected',
    entity_type: entityType,
    entity_id: entityId,
    summary: `Teacher ${approved ? 'approved' : 'rejected'} the ${entityType.replace(/_/g, ' ')}`,
  });
}

export async function logStudentDataChange(
  studentId: string,
  changeType: string,
  changedBy?: string
) {
  const userId = changedBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: userId ? 'teacher' : 'system',
    actor_id: userId,
    action: `student_${changeType}`,
    entity_type: 'student',
    entity_id: studentId,
    summary: `Student record was ${changeType}`,
    metadata: { change_type: changeType },
  });
}

export async function logAiGeneration(
  agentName: string,
  purpose: string,
  entityType: string,
  entityId: string | null,
  dataSources: string[],
  classId?: string | null,
  studentId?: string | null
) {
  return logAiAction({
    actor_type: 'ai_agent',
    action: 'ai_generation',
    entity_type: entityType,
    entity_id: entityId,
    summary: `AI agent "${agentName}" generated ${purpose}`,
    agent_name: agentName,
    purpose,
    data_sources: dataSources,
    class_id: classId,
    student_id: studentId,
  });
}

export async function logDeployment(version: string, deployedBy?: string) {
  const userId = deployedBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: 'admin',
    actor_id: userId,
    action: 'deployment',
    entity_type: 'app_version',
    entity_id: null,
    summary: `Version ${version} was deployed`,
    metadata: { version },
  });
}

export async function logRollback(fromVersion: string, toVersion: string, rolledBackBy?: string) {
  const userId = rolledBackBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: 'admin',
    actor_id: userId,
    action: 'rollback',
    entity_type: 'app_version',
    entity_id: null,
    summary: `Rolled back from ${fromVersion} to ${toVersion}`,
    metadata: { from_version: fromVersion, to_version: toVersion },
  });
}

export async function logManualOverride(
  entityType: string,
  entityId: string,
  reason: string,
  overriddenBy?: string
) {
  const userId = overriddenBy || await getCurrentUserId();
  return logAuditEvent({
    actor_type: 'admin',
    actor_id: userId,
    action: 'manual_override',
    entity_type: entityType,
    entity_id: entityId,
    summary: `Manual override applied: ${reason}`,
    metadata: { reason },
  });
}

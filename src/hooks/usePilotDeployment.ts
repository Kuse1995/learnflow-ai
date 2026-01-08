import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export type RolloutPhase = 
  | 'phase_0_setup'
  | 'phase_1_teachers'
  | 'phase_2_students'
  | 'phase_3_ai_suggestions'
  | 'phase_4_parent_insights'
  | 'completed';

export interface SchoolRolloutStatus {
  id: string;
  school_id: string;
  current_phase: RolloutPhase;
  phase_started_at: string;
  advanced_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolloutPhaseHistory {
  id: string;
  school_id: string;
  from_phase: RolloutPhase | null;
  to_phase: RolloutPhase;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface SchoolChangeLog {
  id: string;
  school_id: string;
  change_type: string;
  change_description: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by: string | null;
  rollout_phase: RolloutPhase | null;
  created_at: string;
}

export interface TeacherFeedback {
  id: string;
  school_id: string;
  teacher_account_id: string | null;
  feedback_type: 'bug' | 'suggestion' | 'praise' | 'concern' | 'question';
  feature_area: string | null;
  message: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'wont_fix';
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotIncidentControls {
  id: string;
  school_id: string;
  ai_paused: boolean;
  ai_paused_at: string | null;
  ai_paused_by: string | null;
  ai_pause_reason: string | null;
  read_only_mode: boolean;
  read_only_started_at: string | null;
  read_only_reason: string | null;
  active_banner_message: string | null;
  banner_severity: 'info' | 'warning' | 'error' | null;
  banner_expires_at: string | null;
  updated_at: string;
}

export interface PilotExitCriteria {
  id: string;
  school_id: string;
  uptime_target_percent: number;
  current_uptime_percent: number | null;
  uptime_met: boolean;
  min_active_teachers: number;
  current_active_teachers: number;
  teacher_usage_met: boolean;
  max_error_rate_percent: number;
  current_error_rate_percent: number | null;
  error_rate_met: boolean;
  parent_features_tested: boolean;
  parent_satisfaction_score: number | null;
  parent_readiness_met: boolean;
  all_criteria_met: boolean;
  last_evaluated_at: string | null;
  marked_complete_at: string | null;
  marked_complete_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotMetricsDaily {
  id: string;
  school_id: string;
  metric_date: string;
  upload_count: number;
  analysis_success_count: number;
  analysis_failure_count: number;
  ai_generation_count: number;
  teacher_action_count: number;
  error_count: number;
  active_teacher_count: number;
  created_at: string;
}

export interface PilotSchool {
  id: string;
  name: string;
  is_pilot: boolean;
  pilot_started_at: string | null;
  pilot_completed_at: string | null;
  pilot_notes: string | null;
}

// Phase labels for display
export const PHASE_LABELS: Record<RolloutPhase, string> = {
  phase_0_setup: 'Phase 0: Admin Setup',
  phase_1_teachers: 'Phase 1: Teachers Only',
  phase_2_students: 'Phase 2: Students (No AI)',
  phase_3_ai_suggestions: 'Phase 3: AI Suggestions',
  phase_4_parent_insights: 'Phase 4: Parent Insights',
  completed: 'Pilot Complete',
};

export const PHASE_DESCRIPTIONS: Record<RolloutPhase, string> = {
  phase_0_setup: 'System setup and configuration. Admin access only.',
  phase_1_teachers: 'Teachers can access the system. No parent or student features.',
  phase_2_students: 'Students can be added and tracked. AI automation disabled.',
  phase_3_ai_suggestions: 'AI features enabled for suggestions only.',
  phase_4_parent_insights: 'Full features including parent insights.',
  completed: 'Pilot has been completed successfully.',
};

// Hooks

/**
 * Get all pilot schools
 */
export function usePilotSchools() {
  return useQuery({
    queryKey: ['pilot-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, is_pilot, pilot_started_at, pilot_completed_at, pilot_notes')
        .eq('is_pilot', true)
        .eq('is_archived', false)
        .order('pilot_started_at', { ascending: false });

      if (error) throw error;
      return data as PilotSchool[];
    },
  });
}

/**
 * Get rollout status for a school
 */
export function useSchoolRolloutStatus(schoolId?: string) {
  return useQuery({
    queryKey: ['school-rollout-status', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from('school_rollout_status')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;
      return data as SchoolRolloutStatus | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Get rollout phase history for a school
 */
export function useRolloutPhaseHistory(schoolId?: string) {
  return useQuery({
    queryKey: ['rollout-phase-history', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('rollout_phase_history')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RolloutPhaseHistory[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Get change logs for a school
 */
export function useSchoolChangeLogs(schoolId?: string, limit = 50) {
  return useQuery({
    queryKey: ['school-change-logs', schoolId, limit],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_change_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SchoolChangeLog[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Get incident controls for a school
 */
export function usePilotIncidentControls(schoolId?: string) {
  return useQuery({
    queryKey: ['pilot-incident-controls', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from('pilot_incident_controls')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;
      return data as PilotIncidentControls | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Get exit criteria for a school
 */
export function usePilotExitCriteria(schoolId?: string) {
  return useQuery({
    queryKey: ['pilot-exit-criteria', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from('pilot_exit_criteria')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;
      return data as PilotExitCriteria | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Get daily metrics for a school
 */
export function usePilotMetrics(schoolId?: string, days = 30) {
  return useQuery({
    queryKey: ['pilot-metrics', schoolId, days],
    queryFn: async () => {
      if (!schoolId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('pilot_metrics_daily')
        .select('*')
        .eq('school_id', schoolId)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data as PilotMetricsDaily[];
    },
    enabled: !!schoolId,
  });
}

/**
 * Get teacher feedback
 */
export function useTeacherFeedback(schoolId?: string, status?: string) {
  return useQuery({
    queryKey: ['teacher-feedback', schoolId, status],
    queryFn: async () => {
      let query = supabase
        .from('teacher_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TeacherFeedback[];
    },
  });
}

/**
 * Initialize a school as a pilot school
 */
export function useInitializePilotSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, notes }: { schoolId: string; notes?: string }) => {
      // Mark school as pilot
      const { error: schoolError } = await supabase
        .from('schools')
        .update({
          is_pilot: true,
          pilot_started_at: new Date().toISOString(),
          pilot_notes: notes,
        })
        .eq('id', schoolId);

      if (schoolError) throw schoolError;

      // Create rollout status
      const { error: rolloutError } = await supabase
        .from('school_rollout_status')
        .insert({
          school_id: schoolId,
          current_phase: 'phase_0_setup',
          notes,
        });

      if (rolloutError) throw rolloutError;

      // Initialize incident controls
      const { error: incidentError } = await supabase
        .from('pilot_incident_controls')
        .insert({ school_id: schoolId });

      if (incidentError) throw incidentError;

      // Initialize exit criteria
      const { error: exitError } = await supabase
        .from('pilot_exit_criteria')
        .insert({ school_id: schoolId });

      if (exitError) throw exitError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pilot-schools'] });
      queryClient.invalidateQueries({ queryKey: ['school-rollout-status'] });
    },
  });
}

/**
 * Advance rollout phase
 */
export function useAdvanceRolloutPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, reason }: { schoolId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('advance_rollout_phase', {
        p_school_id: schoolId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-rollout-status', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['rollout-phase-history', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-change-logs', variables.schoolId] });
    },
  });
}

/**
 * Pause AI for a pilot school (emergency)
 */
export function usePauseSchoolAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, reason }: { schoolId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('pause_pilot_school_ai', {
        p_school_id: schoolId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pilot-incident-controls', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-change-logs', variables.schoolId] });
    },
  });
}

/**
 * Resume AI for a pilot school
 */
export function useResumeSchoolAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { data, error } = await supabase.rpc('resume_pilot_school_ai', {
        p_school_id: schoolId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, schoolId) => {
      queryClient.invalidateQueries({ queryKey: ['pilot-incident-controls', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-change-logs', schoolId] });
    },
  });
}

/**
 * Update incident controls
 */
export function useUpdateIncidentControls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schoolId,
      controls,
    }: {
      schoolId: string;
      controls: Partial<Omit<PilotIncidentControls, 'id' | 'school_id' | 'updated_at'>>;
    }) => {
      const { error } = await supabase
        .from('pilot_incident_controls')
        .update({ ...controls, updated_at: new Date().toISOString() })
        .eq('school_id', schoolId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pilot-incident-controls', variables.schoolId] });
    },
  });
}

/**
 * Submit teacher feedback
 */
export function useSubmitTeacherFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: {
      school_id: string;
      teacher_account_id?: string;
      feedback_type: TeacherFeedback['feedback_type'];
      feature_area?: string;
      message: string;
      urgency?: TeacherFeedback['urgency'];
    }) => {
      const { error } = await supabase.from('teacher_feedback').insert(feedback);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feedback'] });
    },
  });
}

/**
 * Update feedback status
 */
export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: TeacherFeedback['status'];
      admin_notes?: string;
    }) => {
      const updates: Partial<TeacherFeedback> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (admin_notes !== undefined) {
        updates.admin_notes = admin_notes;
      }

      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase.from('teacher_feedback').update(updates).eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feedback'] });
    },
  });
}

/**
 * Mark school as pilot complete
 */
export function useMarkPilotComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      // Update school
      const { error: schoolError } = await supabase
        .from('schools')
        .update({ pilot_completed_at: new Date().toISOString() })
        .eq('id', schoolId);

      if (schoolError) throw schoolError;

      // Update rollout status
      const { error: rolloutError } = await supabase
        .from('school_rollout_status')
        .update({
          current_phase: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('school_id', schoolId);

      if (rolloutError) throw rolloutError;

      // Update exit criteria
      const { error: exitError } = await supabase
        .from('pilot_exit_criteria')
        .update({
          all_criteria_met: true,
          marked_complete_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('school_id', schoolId);

      if (exitError) throw exitError;
    },
    onSuccess: (_, schoolId) => {
      queryClient.invalidateQueries({ queryKey: ['pilot-schools'] });
      queryClient.invalidateQueries({ queryKey: ['school-rollout-status', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['pilot-exit-criteria', schoolId] });
    },
  });
}

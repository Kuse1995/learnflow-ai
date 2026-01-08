import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface TeacherOnboarding {
  id: string;
  teacher_id: string;
  school_id: string | null;
  started_at: string;
  completed_at: string | null;
  current_step: number;
  total_steps: number;
  skipped: boolean;
}

export interface TrainingModuleStep {
  title: string;
  content: string;
}

export interface TrainingModuleContent {
  steps?: TrainingModuleStep[];
}

export interface TrainingModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
  content: TrainingModuleContent;
}

export interface TrainingProgress {
  id: string;
  teacher_id: string;
  module_id: string;
  started_at: string;
  completed_at: string | null;
  progress_percent: number;
}

export interface HelpDismissal {
  id: string;
  teacher_id: string;
  help_key: string;
  dismissed_at: string;
  never_show_again: boolean;
}

export interface QuickFeedback {
  school_id?: string;
  teacher_id?: string;
  feedback_type: 'confused' | 'suggestion' | 'issue' | 'praise';
  feature_area?: string;
  message: string;
}

// Onboarding steps content
export const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Welcome to Your Teaching Assistant",
    content: "This system is here to support you—not replace your expertise. You are always in control.",
    icon: "heart",
  },
  {
    step: 2,
    title: "What This System Does",
    content: "It helps you track student progress, spot patterns in their work, and save time on paperwork. All insights are suggestions—you decide what's useful.",
    icon: "lightbulb",
  },
  {
    step: 3,
    title: "Your Privacy Matters",
    content: "Nothing is shared with parents or others without your approval. You review and control all communications.",
    icon: "shield",
  },
  {
    step: 4,
    title: "AI Suggestions Are Optional",
    content: "The system may offer teaching ideas based on student data. These are always optional—ignore, use, or adapt them as you see fit.",
    icon: "sparkles",
  },
  {
    step: 5,
    title: "You're Ready!",
    content: "Start by exploring your classes. Short training guides are available anytime you need help. Welcome aboard!",
    icon: "rocket",
  },
];

// Helper to get a demo teacher ID (in production, this would come from auth)
const getTeacherId = () => "demo-teacher-1";

// Hooks

export function useTeacherOnboarding() {
  const teacherId = getTeacherId();

  return useQuery({
    queryKey: ['teacher-onboarding', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_onboarding')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (error) throw error;
      return data as TeacherOnboarding | null;
    },
  });
}

export function useStartOnboarding() {
  const queryClient = useQueryClient();
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('teacher_onboarding')
        .insert({
          teacher_id: teacherId,
          current_step: 1,
          total_steps: ONBOARDING_STEPS.length,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-onboarding', teacherId] });
    },
  });
}

export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async ({ step, completed, skipped }: { step?: number; completed?: boolean; skipped?: boolean }) => {
      const updates: Record<string, unknown> = {};

      if (step !== undefined) updates.current_step = step;
      if (completed) updates.completed_at = new Date().toISOString();
      if (skipped !== undefined) updates.skipped = skipped;

      const { error } = await supabase
        .from('teacher_onboarding')
        .update(updates)
        .eq('teacher_id', teacherId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-onboarding', teacherId] });
    },
  });
}

export function useTrainingModules() {
  return useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      // Parse the content JSON properly
      return (data || []).map((m) => ({
        ...m,
        content: (m.content as TrainingModuleContent) || { steps: [] },
      })) as TrainingModule[];
    },
  });
}

export function useTrainingProgress() {
  const teacherId = getTeacherId();

  return useQuery({
    queryKey: ['training-progress', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_training_progress')
        .select('*')
        .eq('teacher_id', teacherId);

      if (error) throw error;
      return data as TrainingProgress[];
    },
  });
}

export function useStartTrainingModule() {
  const queryClient = useQueryClient();
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('teacher_training_progress')
        .upsert({
          teacher_id: teacherId,
          module_id: moduleId,
          progress_percent: 0,
          started_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id,module_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-progress', teacherId] });
    },
  });
}

export function useCompleteTrainingModule() {
  const queryClient = useQueryClient();
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('teacher_training_progress')
        .update({
          completed_at: new Date().toISOString(),
          progress_percent: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('teacher_id', teacherId)
        .eq('module_id', moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-progress', teacherId] });
    },
  });
}

export function useHelpDismissals() {
  const teacherId = getTeacherId();

  return useQuery({
    queryKey: ['help-dismissals', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_dismissals')
        .select('*')
        .eq('teacher_id', teacherId);

      if (error) throw error;
      return data as HelpDismissal[];
    },
  });
}

export function useDismissHelp() {
  const queryClient = useQueryClient();
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async ({ helpKey, neverShowAgain = false }: { helpKey: string; neverShowAgain?: boolean }) => {
      const { error } = await supabase
        .from('help_dismissals')
        .upsert({
          teacher_id: teacherId,
          help_key: helpKey,
          never_show_again: neverShowAgain,
          dismissed_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id,help_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-dismissals', teacherId] });
    },
  });
}

export function useSubmitQuickFeedback() {
  return useMutation({
    mutationFn: async (feedback: QuickFeedback) => {
      const { error } = await supabase
        .from('teacher_quick_feedback')
        .insert(feedback);

      if (error) throw error;
    },
  });
}

export function useTrackFeatureUse() {
  const teacherId = getTeacherId();

  return useMutation({
    mutationFn: async ({ featureKey, schoolId }: { featureKey: string; schoolId?: string }) => {
      // Check if this is first use
      const { data: existing } = await supabase
        .from('teacher_feature_first_use')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('feature_key', featureKey)
        .maybeSingle();

      if (!existing) {
        // Record first use
        await supabase
          .from('teacher_feature_first_use')
          .insert({
            teacher_id: teacherId,
            feature_key: featureKey,
          });
      }

      // Record aggregated event
      if (schoolId) {
        const today = new Date().toISOString().split('T')[0];
        const eventType = existing ? 'regular_use' : 'first_use';

        const { data: existingEvent } = await supabase
          .from('feature_adoption_events')
          .select('id, count')
          .eq('school_id', schoolId)
          .eq('feature_key', featureKey)
          .eq('event_type', eventType)
          .eq('event_date', today)
          .maybeSingle();

        if (existingEvent) {
          await supabase
            .from('feature_adoption_events')
            .update({ count: (existingEvent.count || 0) + 1 })
            .eq('id', existingEvent.id);
        } else {
          await supabase
            .from('feature_adoption_events')
            .insert({
              school_id: schoolId,
              feature_key: featureKey,
              event_type: eventType,
              event_date: today,
              count: 1,
            });
        }
      }
    },
  });
}

// Admin hooks for adoption analytics

export function useFeatureAdoptionMetrics(schoolId?: string) {
  return useQuery({
    queryKey: ['feature-adoption-metrics', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('feature_adoption_events')
        .select('*')
        .order('event_date', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data;
    },
  });
}

export function useQuickFeedbackList(schoolId?: string) {
  return useQuery({
    queryKey: ['quick-feedback-list', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('teacher_quick_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

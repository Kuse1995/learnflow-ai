import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LessonDifferentiationSuggestion {
  id: string;
  class_id: string;
  lesson_topic: string;
  lesson_objective: string;
  lesson_duration_minutes: number | null;
  core_lesson_flow: string[];
  optional_variations: string[];
  extension_opportunities: string[];
  support_strategies: string[];
  materials_needed: string[] | null;
  teacher_accepted: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  type: "youtube" | "pdf" | "slides" | "link";
  url: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Fetch lesson differentiation suggestions for a class
 */
export function useLessonSuggestions(classId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-suggestions", classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from("lesson_differentiation_suggestions")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LessonDifferentiationSuggestion[];
    },
    enabled: !!classId,
  });
}

/**
 * Fetch a single lesson suggestion with resources
 */
export function useLessonSuggestion(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-suggestion", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data, error } = await supabase
        .from("lesson_differentiation_suggestions")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (error) throw error;
      return data as LessonDifferentiationSuggestion;
    },
    enabled: !!lessonId,
  });
}

/**
 * Fetch resources for a lesson
 */
export function useLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      
      const { data, error } = await supabase
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LessonResource[];
    },
    enabled: !!lessonId,
  });
}

/**
 * Generate a new differentiated lesson
 */
export function useGenerateLessonSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      classId: string;
      lessonTopic: string;
      lessonObjective: string;
      lessonDurationMinutes?: number;
    }) => {
      const response = await supabase.functions.invoke("generate-differentiated-lesson", {
        body: input,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate lesson");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to generate lesson");
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-suggestions", variables.classId] });
    },
  });
}

/**
 * Mark a lesson as reviewed
 */
export function useMarkLessonReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, classId }: { lessonId: string; classId: string }) => {
      const { error } = await supabase
        .from("lesson_differentiation_suggestions")
        .update({ teacher_accepted: true })
        .eq("id", lessonId);

      if (error) throw error;
      return { lessonId, classId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-suggestions", result.classId] });
      queryClient.invalidateQueries({ queryKey: ["lesson-suggestion", result.lessonId] });
    },
  });
}

/**
 * Add a resource to a lesson
 */
export function useAddLessonResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      lessonId: string;
      type: "youtube" | "pdf" | "slides" | "link";
      url: string;
      title?: string;
    }) => {
      const { data, error } = await supabase
        .from("lesson_resources")
        .insert({
          lesson_id: input.lessonId,
          type: input.type,
          url: input.url,
          title: input.title || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LessonResource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-resources", data.lesson_id] });
    },
  });
}

/**
 * Delete a lesson resource
 */
export function useDeleteLessonResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, lessonId }: { resourceId: string; lessonId: string }) => {
      const { error } = await supabase
        .from("lesson_resources")
        .delete()
        .eq("id", resourceId);

      if (error) throw error;
      return { lessonId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-resources", result.lessonId] });
    },
  });
}

/**
 * Duplicate a lesson suggestion (creates a new unreviewed copy)
 */
export function useDuplicateLessonSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lesson: LessonDifferentiationSuggestion) => {
      const { data, error } = await supabase
        .from("lesson_differentiation_suggestions")
        .insert({
          class_id: lesson.class_id,
          lesson_topic: `${lesson.lesson_topic} (Copy)`,
          lesson_objective: lesson.lesson_objective,
          lesson_duration_minutes: lesson.lesson_duration_minutes,
          core_lesson_flow: lesson.core_lesson_flow,
          optional_variations: lesson.optional_variations,
          extension_opportunities: lesson.extension_opportunities,
          support_strategies: lesson.support_strategies,
          materials_needed: lesson.materials_needed,
          teacher_accepted: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LessonDifferentiationSuggestion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-suggestions", data.class_id] });
    },
  });
}

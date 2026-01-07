import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherActionLog {
  id: string;
  class_id: string;
  upload_id: string | null;
  topic: string | null;
  action_taken: string;
  reflection_notes: string | null;
  created_at: string;
}

interface CreateActionLogInput {
  classId: string;
  uploadId?: string;
  topic?: string;
  actionTaken: string;
  reflectionNotes?: string;
}

/**
 * Hook to create a new teacher action log
 * Silently appends a timeline entry after creation
 */
export function useCreateActionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActionLogInput) => {
      const { data, error } = await supabase
        .from("teacher_action_logs")
        .insert({
          class_id: input.classId,
          upload_id: input.uploadId || null,
          topic: input.topic || null,
          action_taken: input.actionTaken,
          reflection_notes: input.reflectionNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Silently append timeline entries for students in the class (no notifications)
      // Note: Teaching actions apply to the class, so we append for all students
      try {
        const { data: students } = await supabase
          .from("students")
          .select("id")
          .eq("class_id", input.classId);

        if (students && students.length > 0) {
          const timelineEntries = students.map((student) => ({
            student_id: student.id,
            class_id: input.classId,
            event_type: "teaching_action" as const,
            event_summary: `Teaching action recorded${input.topic ? `: ${input.topic}` : ""}`,
            source_id: data.id,
            occurred_at: new Date().toISOString(),
          }));

          await supabase.from("student_learning_timeline").insert(timelineEntries);
        }
      } catch (timelineError) {
        // Silent failure - don't block main flow
        console.error("Timeline append failed:", timelineError);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-action-logs", "class", variables.classId] });
      if (variables.uploadId) {
        queryClient.invalidateQueries({ queryKey: ["teacher-action-logs", "upload", variables.uploadId] });
      }
    },
  });
}

interface UpdateActionLogInput {
  logId: string;
  classId: string;
  updates: {
    topic?: string | null;
    action_taken?: string;
    reflection_notes?: string | null;
  };
}

/**
 * Hook to update a teacher action log
 */
export function useUpdateActionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, updates }: UpdateActionLogInput) => {
      const { data, error } = await supabase
        .from("teacher_action_logs")
        .update(updates)
        .eq("id", logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-action-logs", "class", variables.classId] });
    },
  });
}

interface DeleteActionLogInput {
  logId: string;
  classId: string;
}

/**
 * Hook to delete a teacher action log
 */
export function useDeleteActionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId }: DeleteActionLogInput) => {
      const { error } = await supabase
        .from("teacher_action_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-action-logs", "class", variables.classId] });
    },
  });
}

/**
 * Hook to fetch action logs for a class
 */
export function useClassActionLogs(classId: string | undefined) {
  return useQuery({
    queryKey: ["teacher-action-logs", "class", classId],
    queryFn: async (): Promise<TeacherActionLog[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("teacher_action_logs")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as TeacherActionLog[];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch action logs for a specific upload/analysis
 */
export function useUploadActionLogs(uploadId: string | undefined) {
  return useQuery({
    queryKey: ["teacher-action-logs", "upload", uploadId],
    queryFn: async (): Promise<TeacherActionLog[]> => {
      if (!uploadId) return [];

      const { data, error } = await supabase
        .from("teacher_action_logs")
        .select("*")
        .eq("upload_id", uploadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as TeacherActionLog[];
    },
    enabled: !!uploadId,
  });
}

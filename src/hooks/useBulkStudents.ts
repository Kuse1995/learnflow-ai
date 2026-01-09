/**
 * Bulk Student Import Hook
 * Handles batch processing of student imports with progress tracking
 */

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ParsedStudent } from "@/lib/csv-student-parser";

export interface BulkImportResult {
  created: number;
  failed: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

interface StudentInsert {
  name: string;
  student_id: string;
  grade: string | null;
  class_id: string | null;
  school_id: string;
}

const BATCH_SIZE = 50;

/**
 * Fetch existing student IDs for a school
 */
export function useExistingStudentIds(schoolId?: string) {
  return useQuery({
    queryKey: ['existing-student-ids', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('student_id')
        .eq('school_id', schoolId);

      if (error) throw error;
      return data.map(s => s.student_id);
    },
    enabled: !!schoolId,
  });
}

/**
 * Bulk import students with progress tracking
 */
export function useBulkImportStudents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      students,
      schoolId,
      onProgress,
    }: {
      students: ParsedStudent[];
      schoolId: string;
      onProgress?: (progress: number) => void;
    }): Promise<BulkImportResult> => {
      // Filter to only valid students
      const validStudents = students.filter(s => s.errors.length === 0);
      
      if (validStudents.length === 0) {
        return { created: 0, failed: 0, skipped: students.length, errors: [] };
      }

      const result: BulkImportResult = {
        created: 0,
        failed: 0,
        skipped: students.length - validStudents.length,
        errors: [],
      };

      // Process in batches
      for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
        const batch = validStudents.slice(i, i + BATCH_SIZE);
        
        const studentsToInsert: StudentInsert[] = batch.map(s => ({
          name: s.name,
          student_id: s.studentId,
          grade: s.grade,
          class_id: s.classId,
          school_id: schoolId,
        }));

        try {
          const { data, error } = await supabase
            .from('students')
            .insert(studentsToInsert)
            .select();

          if (error) {
            // Handle batch failure
            batch.forEach(s => {
              result.failed++;
              result.errors.push({ row: s.rowNumber, error: error.message });
            });
          } else {
            result.created += data.length;
          }
        } catch (err) {
          batch.forEach(s => {
            result.failed++;
            result.errors.push({ 
              row: s.rowNumber, 
              error: err instanceof Error ? err.message : 'Unknown error' 
            });
          });
        }

        // Report progress
        if (onProgress) {
          const progress = Math.min(100, Math.round(((i + batch.length) / validStudents.length) * 100));
          onProgress(progress);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
      queryClient.invalidateQueries({ queryKey: ['existing-student-ids'] });
      
      if (result.created > 0) {
        toast.success(`Imported ${result.created} students successfully`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} students failed to import`);
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}

/**
 * School Export Hooks
 * 
 * React hooks for managing school data exports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ExportLevel,
  ExportJob,
  canRequestExport,
  requestExport,
  getExportJobs,
  EXPORT_LEVEL_TABLES,
  generateCSV,
  generateJSON,
  downloadFile,
  createExportManifest,
} from '@/lib/school-data-export';

/**
 * Hook to fetch export jobs for a school
 */
export function useExportJobs(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['export-jobs', schoolId],
    queryFn: () => schoolId ? getExportJobs(schoolId) : [],
    enabled: !!schoolId,
  });
}

/**
 * Hook to check if export can be requested
 */
export function useCanRequestExport(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['can-request-export', schoolId],
    queryFn: () => schoolId ? canRequestExport(schoolId) : { allowed: false },
    enabled: !!schoolId,
  });
}

/**
 * Hook to request a new export
 */
export function useRequestExport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, exportLevel, requestedBy }: {
      schoolId: string;
      exportLevel: ExportLevel;
      requestedBy: string;
    }) => {
      const result = await requestExport(schoolId, exportLevel, requestedBy);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.jobId!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['can-request-export', variables.schoolId] });
      toast({
        title: 'Export requested',
        description: 'Your export is being prepared. This may take a few minutes.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate and download export data client-side
 * This is a simplified version - in production, use server-side processing
 */
export function useGenerateExport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, schoolName, exportLevel, format }: {
      schoolId: string;
      schoolName: string;
      exportLevel: ExportLevel;
      format: 'csv' | 'json';
    }) => {
      const tables = EXPORT_LEVEL_TABLES[exportLevel];
      const recordCounts: Record<string, number> = {};
      const allData: Record<string, unknown[]> = {};

      // Fetch data from each table
      for (const table of tables) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const query = supabase.from(table as any).select('*');
          
          // Add school_id filter if table has it
          if (['students', 'classes', 'fee_payments', 'fee_receipts'].includes(table)) {
            query.eq('school_id', schoolId);
          }
          
          const { data, error } = await query.limit(10000);
          
          if (error) {
            console.warn(`Failed to fetch ${table}:`, error.message);
            allData[table] = [];
            recordCounts[table] = 0;
          } else {
            allData[table] = data || [];
            recordCounts[table] = data?.length || 0;
          }
        } catch (e) {
          console.warn(`Error fetching ${table}:`, e);
          allData[table] = [];
          recordCounts[table] = 0;
        }
      }

      // Create manifest
      const manifest = createExportManifest(schoolId, schoolName, exportLevel, recordCounts);

      // Generate files based on format
      if (format === 'json') {
        const exportData = {
          manifest,
          data: allData,
        };
        downloadFile(
          JSON.stringify(exportData, null, 2),
          `${schoolName.replace(/\s+/g, '-')}-export-${exportLevel}-${new Date().toISOString().split('T')[0]}.json`,
          'application/json'
        );
      } else {
        // For CSV, download each table separately
        for (const [table, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const csv = generateCSV(data as Record<string, unknown>[], table);
            downloadFile(
              csv,
              `${schoolName.replace(/\s+/g, '-')}-${table}-${new Date().toISOString().split('T')[0]}.csv`,
              'text/csv'
            );
          }
        }
        // Also download manifest
        downloadFile(
          JSON.stringify(manifest, null, 2),
          `${schoolName.replace(/\s+/g, '-')}-manifest-${new Date().toISOString().split('T')[0]}.json`,
          'application/json'
        );
      }

      return { recordCounts, manifest };
    },
    onSuccess: () => {
      toast({
        title: 'Export complete',
        description: 'Your data has been downloaded. Store it securely.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

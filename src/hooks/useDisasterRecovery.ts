/**
 * Disaster Recovery Hooks
 * 
 * React hooks for backup management and restore operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getBackupSnapshots,
  getBackupScheduleConfig,
  updateBackupScheduleConfig,
  requestRestore,
  confirmRestore,
  cancelRestore,
  getRestoreRequests,
  BackupSnapshot,
  BackupScheduleConfig,
  RestoreRequest,
  RestoreScope,
} from '@/lib/disaster-recovery';

/**
 * Hook to fetch backup snapshots
 */
export function useBackupSnapshots(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['backup-snapshots', schoolId],
    queryFn: () => schoolId ? getBackupSnapshots(schoolId) : [],
    enabled: !!schoolId,
  });
}

/**
 * Hook to fetch backup schedule configuration
 */
export function useBackupScheduleConfig(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['backup-schedule-config', schoolId],
    queryFn: () => schoolId ? getBackupScheduleConfig(schoolId) : null,
    enabled: !!schoolId,
  });
}

/**
 * Hook to update backup schedule configuration
 */
export function useUpdateBackupScheduleConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, config }: {
      schoolId: string;
      config: Partial<BackupScheduleConfig>;
    }) => {
      const result = await updateBackupScheduleConfig(schoolId, config);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedule-config', variables.schoolId] });
      toast({
        title: 'Backup schedule updated',
        description: 'Your backup settings have been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update backup schedule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch restore requests
 */
export function useRestoreRequests(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['restore-requests', schoolId],
    queryFn: () => schoolId ? getRestoreRequests(schoolId) : [],
    enabled: !!schoolId,
  });
}

/**
 * Hook to request a restore
 */
export function useRequestRestore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, requestedBy, restorePoint, scope, snapshotId, isDryRun }: {
      schoolId: string;
      requestedBy: string;
      restorePoint: Date;
      scope: RestoreScope;
      snapshotId?: string;
      isDryRun?: boolean;
    }) => {
      const result = await requestRestore(schoolId, requestedBy, restorePoint, scope, snapshotId, isDryRun);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.requestId!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restore-requests', variables.schoolId] });
      toast({
        title: variables.isDryRun ? 'Dry run requested' : 'Restore requested',
        description: variables.isDryRun 
          ? 'The simulation will show what would be restored.'
          : 'Please confirm the restore to proceed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to request restore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to confirm a restore
 */
export function useConfirmRestore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, confirmedBy, schoolId }: {
      requestId: string;
      confirmedBy: string;
      schoolId: string;
    }) => {
      const result = await confirmRestore(requestId, confirmedBy);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restore-requests', variables.schoolId] });
      toast({
        title: 'Restore confirmed',
        description: 'The restore operation will begin shortly.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to confirm restore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to cancel a restore
 */
export function useCancelRestore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, schoolId }: {
      requestId: string;
      schoolId: string;
    }) => {
      const result = await cancelRestore(requestId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restore-requests', variables.schoolId] });
      toast({
        title: 'Restore cancelled',
        description: 'The restore request has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel restore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

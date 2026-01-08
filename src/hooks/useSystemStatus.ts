/**
 * System Status Hooks
 * 
 * React hooks for monitoring system health and read-only mode
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getSystemStatus,
  isSystemReadOnly,
  enterReadOnlyMode,
  exitReadOnlyMode,
  getActiveIncidents,
  getIncidentHistory,
  createIncident,
  resolveIncident,
  acknowledgeIncident,
  SystemStatus,
  SystemIncident,
  IncidentType,
  IncidentSeverity,
} from '@/lib/system-status';

/**
 * Hook to fetch current system status
 */
export function useSystemStatus(schoolId?: string) {
  return useQuery({
    queryKey: ['system-status', schoolId],
    queryFn: () => getSystemStatus(schoolId),
    refetchInterval: 30000, // Check every 30 seconds
  });
}

/**
 * Hook to check if system is read-only
 */
export function useIsReadOnly(schoolId?: string) {
  return useQuery({
    queryKey: ['is-read-only', schoolId],
    queryFn: () => isSystemReadOnly(schoolId),
    refetchInterval: 30000,
  });
}

/**
 * Hook to enter read-only mode
 */
export function useEnterReadOnlyMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, reason, isAuto }: {
      schoolId: string;
      reason: string;
      isAuto?: boolean;
    }) => {
      const result = await enterReadOnlyMode(schoolId, reason, isAuto);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
      queryClient.invalidateQueries({ queryKey: ['is-read-only'] });
      toast({
        title: 'Read-only mode enabled',
        description: 'The system is now in read-only mode.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to enter read-only mode',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to exit read-only mode
 */
export function useExitReadOnlyMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const result = await exitReadOnlyMode(schoolId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
      queryClient.invalidateQueries({ queryKey: ['is-read-only'] });
      toast({
        title: 'Read-only mode disabled',
        description: 'The system is now fully operational.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to exit read-only mode',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch active incidents
 */
export function useActiveIncidents(schoolId?: string) {
  return useQuery({
    queryKey: ['active-incidents', schoolId],
    queryFn: () => getActiveIncidents(schoolId),
    refetchInterval: 60000, // Check every minute
  });
}

/**
 * Hook to fetch incident history
 */
export function useIncidentHistory(schoolId?: string, limit: number = 50) {
  return useQuery({
    queryKey: ['incident-history', schoolId, limit],
    queryFn: () => getIncidentHistory(schoolId, limit),
  });
}

/**
 * Hook to create an incident
 */
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentType, severity, affectedServices, schoolId, internalDetails }: {
      incidentType: IncidentType;
      severity: IncidentSeverity;
      affectedServices: string[];
      schoolId?: string;
      internalDetails?: Record<string, unknown>;
    }) => {
      const result = await createIncident(incidentType, severity, affectedServices, schoolId, internalDetails);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.incidentId!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-incidents', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['incident-history', variables.schoolId] });
    },
  });
}

/**
 * Hook to resolve an incident
 */
export function useResolveIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ incidentId, resolutionAction, schoolId }: {
      incidentId: string;
      resolutionAction: string;
      schoolId?: string;
    }) => {
      const result = await resolveIncident(incidentId, resolutionAction);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-incidents', variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['incident-history', variables.schoolId] });
      toast({
        title: 'Incident resolved',
        description: 'The incident has been marked as resolved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resolve incident',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to acknowledge an incident
 */
export function useAcknowledgeIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentId, acknowledgedBy, schoolId }: {
      incidentId: string;
      acknowledgedBy: string;
      schoolId?: string;
    }) => {
      const result = await acknowledgeIncident(incidentId, acknowledgedBy);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-incidents', variables.schoolId] });
    },
  });
}

/**
 * Hook to monitor online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

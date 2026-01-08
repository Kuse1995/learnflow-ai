/**
 * School Offboarding Hooks
 * 
 * React hooks for managing school offboarding process
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getOffboardingStatus,
  initiateOffboarding,
  cancelOffboarding,
  completeOffboardingExport,
  OffboardingRequest,
} from '@/lib/school-offboarding';

/**
 * Hook to fetch current offboarding status
 */
export function useOffboardingStatus(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['offboarding-status', schoolId],
    queryFn: () => schoolId ? getOffboardingStatus(schoolId) : null,
    enabled: !!schoolId,
  });
}

/**
 * Hook to initiate offboarding
 */
export function useInitiateOffboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ schoolId, requestedBy, reason }: {
      schoolId: string;
      requestedBy: string;
      reason?: string;
    }) => {
      const result = await initiateOffboarding(schoolId, requestedBy, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.requestId!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboarding-status', variables.schoolId] });
      toast({
        title: 'Offboarding initiated',
        description: 'Please complete the mandatory data export to proceed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to initiate offboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to complete mandatory export
 */
export function useCompleteOffboardingExport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, exportJobId }: {
      requestId: string;
      exportJobId: string;
      schoolId: string;
    }) => {
      const result = await completeOffboardingExport(requestId, exportJobId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboarding-status', variables.schoolId] });
      toast({
        title: 'Export complete',
        description: 'The 14-day cooling period has begun. All users will see a notice.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to complete export',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to cancel offboarding
 */
export function useCancelOffboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, cancelledBy, schoolId }: {
      requestId: string;
      cancelledBy: string;
      schoolId: string;
    }) => {
      const result = await cancelOffboarding(requestId, cancelledBy);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboarding-status', variables.schoolId] });
      toast({
        title: 'Offboarding cancelled',
        description: 'The school will continue operating normally.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel offboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * School Offboarding System
 * 
 * Manages the controlled offboarding process:
 * 1. Request offboarding
 * 2. Mandatory full export
 * 3. 14-day cooling period (read-only)
 * 4. Deactivation
 */

import { supabase } from '@/integrations/supabase/client';

export type OffboardingStatus = 'requested' | 'export_pending' | 'cooling_period' | 'deactivated' | 'cancelled';

export interface OffboardingRequest {
  id: string;
  school_id: string;
  requested_by: string;
  requested_at: string;
  reason: string | null;
  status: OffboardingStatus;
  export_job_id: string | null;
  cooling_period_ends_at: string | null;
  deactivated_at: string | null;
  retention_expires_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
}

export const OFFBOARDING_STATUS_LABELS: Record<OffboardingStatus, string> = {
  requested: 'Requested',
  export_pending: 'Export Required',
  cooling_period: 'Cooling Period',
  deactivated: 'Deactivated',
  cancelled: 'Cancelled',
};

export const OFFBOARDING_STATUS_DESCRIPTIONS: Record<OffboardingStatus, string> = {
  requested: 'Offboarding has been requested',
  export_pending: 'A full data export must be completed before proceeding',
  cooling_period: '14-day read-only period - all staff can see the offboarding notice',
  deactivated: 'School has been deactivated - logins disabled, data retained',
  cancelled: 'Offboarding was cancelled',
};

/**
 * Check if school has active offboarding request
 */
export async function getOffboardingStatus(schoolId: string): Promise<OffboardingRequest | null> {
  const { data, error } = await supabase
    .from('school_offboarding_requests')
    .select('*')
    .eq('school_id', schoolId)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Failed to fetch offboarding status:', error);
    return null;
  }

  return (data?.[0] as unknown as OffboardingRequest) || null;
}

/**
 * Initiate offboarding process
 */
export async function initiateOffboarding(
  schoolId: string,
  requestedBy: string,
  reason?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('initiate_offboarding', {
    p_school_id: schoolId,
    p_requested_by: requestedBy,
    p_reason: reason || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, requestId: data as string };
}

/**
 * Complete the mandatory export and start cooling period
 */
export async function completeOffboardingExport(
  requestId: string,
  exportJobId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('complete_offboarding_export', {
    p_request_id: requestId,
    p_export_job_id: exportJobId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel offboarding request
 */
export async function cancelOffboarding(
  requestId: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('school_offboarding_requests')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('status', ['requested', 'export_pending', 'cooling_period']);

  if (error) {
    return { success: false, error: error.message };
  }

  // Also clear school offboarding status
  await supabase
    .from('schools')
    .update({ offboarding_status: null })
    .eq('id', requestId);

  return { success: true };
}

/**
 * Calculate days remaining in cooling period
 */
export function getCoolingPeriodDaysRemaining(coolingEndsAt: string | null): number {
  if (!coolingEndsAt) return 0;
  const endDate = new Date(coolingEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Check if school is in read-only mode
 */
export function isSchoolReadOnly(offboardingStatus: string | null): boolean {
  return offboardingStatus === 'cooling_period' || offboardingStatus === 'deactivated';
}

/**
 * Get retention expiry date (12 months after deactivation)
 */
export function getRetentionExpiryDate(deactivatedAt: string): Date {
  const date = new Date(deactivatedAt);
  date.setMonth(date.getMonth() + 12);
  return date;
}

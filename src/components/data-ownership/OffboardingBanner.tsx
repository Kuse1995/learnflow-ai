/**
 * Offboarding Banner
 * 
 * Displays a prominent banner when school is in offboarding/cooling period
 * Shown to all staff members
 */

import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, Lock } from 'lucide-react';
import { getCoolingPeriodDaysRemaining } from '@/lib/school-offboarding';

interface OffboardingBannerProps {
  status: 'cooling_period' | 'deactivated';
  coolingPeriodEndsAt?: string | null;
  deactivatedAt?: string | null;
}

export function OffboardingBanner({ 
  status, 
  coolingPeriodEndsAt,
  deactivatedAt 
}: OffboardingBannerProps) {
  if (status === 'cooling_period') {
    const daysRemaining = getCoolingPeriodDaysRemaining(coolingPeriodEndsAt);
    
    return (
      <Alert variant="destructive" className="mb-4 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          School Offboarding in Progress
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" />
            <span>
              This school is in read-only mode. {daysRemaining} days remaining until deactivation.
            </span>
          </div>
          <p className="mt-2 text-sm">
            All data is being preserved. Please ensure you have downloaded any necessary exports.
            Contact your administrator for more information.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'deactivated') {
    return (
      <Alert variant="destructive" className="mb-4">
        <Lock className="h-4 w-4" />
        <AlertTitle>School Deactivated</AlertTitle>
        <AlertDescription>
          <p>
            This school was deactivated{' '}
            {deactivatedAt && formatDistanceToNow(new Date(deactivatedAt))} ago.
          </p>
          <p className="mt-2 text-sm">
            Data is retained for 12 months. Contact support if you need to reactivate.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

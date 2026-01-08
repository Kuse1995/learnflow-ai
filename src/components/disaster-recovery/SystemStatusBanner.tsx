/**
 * System Status Banner
 * 
 * Displays prominent banner when system is in degraded/read-only/maintenance mode
 * Uses non-panic, user-friendly language
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  WifiOff,
  Eye,
  Wrench,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useSystemStatus, useOnlineStatus } from '@/hooks/useSystemStatus';
import { useOfflineQueueStats, useSyncPending } from '@/hooks/useOfflineSync';
import { STATUS_LABELS, STATUS_DESCRIPTIONS, SystemStatusType } from '@/lib/system-status';

interface SystemStatusBannerProps {
  schoolId?: string;
  showSyncButton?: boolean;
}

const STATUS_CONFIG: Record<SystemStatusType, {
  icon: React.ReactNode;
  variant: 'default' | 'destructive';
  bgClass: string;
}> = {
  operational: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: 'default',
    bgClass: '',
  },
  degraded: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: 'default',
    bgClass: 'border-amber-500 bg-amber-500/10',
  },
  read_only: {
    icon: <Eye className="h-4 w-4" />,
    variant: 'destructive',
    bgClass: 'border-amber-500 bg-amber-500/10',
  },
  maintenance: {
    icon: <Wrench className="h-4 w-4" />,
    variant: 'default',
    bgClass: 'border-blue-500 bg-blue-500/10',
  },
};

export function SystemStatusBanner({ schoolId, showSyncButton = true }: SystemStatusBannerProps) {
  const { data: systemStatus, isLoading } = useSystemStatus(schoolId);
  const isOnline = useOnlineStatus();
  const { stats } = useOfflineQueueStats();
  const syncPending = useSyncPending();

  // Don't show anything while loading or if operational
  if (isLoading) return null;

  // Offline banner takes priority
  if (!isOnline) {
    return (
      <Alert className="mb-4 border-amber-500 bg-amber-500/10">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          You're offline
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p>Your changes are being saved locally. They will sync when connection is restored.</p>
          {stats.pending > 0 && (
            <p className="mt-2 text-sm font-medium">
              {stats.pending} item{stats.pending !== 1 ? 's' : ''} waiting to sync
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show pending sync banner if online with pending items
  if (isOnline && stats.pending > 0 && showSyncButton) {
    return (
      <Alert className="mb-4 border-blue-500 bg-blue-500/10">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Items ready to sync
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 flex items-center justify-between">
          <span>
            {stats.pending} item{stats.pending !== 1 ? 's' : ''} saved offline are ready to sync.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncPending.mutate()}
            disabled={syncPending.isPending}
          >
            {syncPending.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // System status banner
  if (!systemStatus || systemStatus.status === 'operational') return null;

  const config = STATUS_CONFIG[systemStatus.status];

  return (
    <Alert className={`mb-4 ${config.bgClass}`} variant={config.variant}>
      {config.icon}
      <AlertTitle>{STATUS_LABELS[systemStatus.status]}</AlertTitle>
      <AlertDescription>
        <p>{systemStatus.status_message || STATUS_DESCRIPTIONS[systemStatus.status]}</p>
        {systemStatus.affected_features && systemStatus.affected_features.length > 0 && (
          <p className="mt-1 text-sm">
            Affected: {systemStatus.affected_features.join(', ')}
          </p>
        )}
        {systemStatus.expected_resolution && (
          <p className="mt-1 text-sm">
            Expected resolution: {new Date(systemStatus.expected_resolution).toLocaleString()}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

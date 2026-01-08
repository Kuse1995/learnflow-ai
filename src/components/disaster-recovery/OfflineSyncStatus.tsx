/**
 * Offline Sync Status
 * 
 * Shows sync queue status and allows manual sync trigger
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
} from 'lucide-react';
import {
  useOfflineQueueStats,
  useSyncPending,
  useClearSyncedItems,
  useConnectivityStatus,
} from '@/hooks/useOfflineSync';

interface OfflineSyncStatusProps {
  compact?: boolean;
}

export function OfflineSyncStatus({ compact = false }: OfflineSyncStatusProps) {
  const { stats, refresh } = useOfflineQueueStats();
  const syncPending = useSyncPending();
  const clearSynced = useClearSyncedItems();
  const isOnline = useConnectivityStatus();

  const totalItems = stats.pending + stats.syncing + stats.conflicts + stats.failed + stats.synced;
  const needsAttention = stats.pending > 0 || stats.conflicts > 0 || stats.failed > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-500" />
        )}
        {stats.pending > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {stats.pending} pending
          </Badge>
        )}
        {stats.conflicts > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {stats.conflicts} conflicts
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-amber-500" />
              )}
              Offline Sync
            </CardTitle>
            <CardDescription>
              {isOnline ? 'Connected - data syncs automatically' : 'Offline - changes saved locally'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Stats */}
        {totalItems > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Clock className="h-4 w-4" />}
              variant={stats.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Syncing"
              value={stats.syncing}
              icon={<RefreshCw className="h-4 w-4 animate-spin" />}
              variant="default"
            />
            <StatCard
              label="Conflicts"
              value={stats.conflicts}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant={stats.conflicts > 0 ? 'destructive' : 'default'}
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant={stats.failed > 0 ? 'destructive' : 'default'}
            />
            <StatCard
              label="Synced"
              value={stats.synced}
              icon={<CheckCircle2 className="h-4 w-4" />}
              variant="success"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in sync queue
          </p>
        )}

        {/* Actions */}
        {needsAttention && (
          <div className="flex gap-2">
            {stats.pending > 0 && isOnline && (
              <Button
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
            )}
            {stats.synced > 0 && (
              <Button variant="outline" onClick={clearSynced}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Synced
              </Button>
            )}
          </div>
        )}

        {/* Conflict Warning */}
        {stats.conflicts > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm font-medium text-destructive">
              {stats.conflicts} conflict{stats.conflicts !== 1 ? 's' : ''} need{stats.conflicts === 1 ? 's' : ''} review
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              These items were modified both locally and on the server. Admin review required.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: 'default' | 'warning' | 'destructive' | 'success';
}) {
  const bgClass = {
    default: 'bg-muted/50',
    warning: 'bg-amber-500/10',
    destructive: 'bg-destructive/10',
    success: 'bg-green-500/10',
  }[variant];

  const textClass = {
    default: 'text-muted-foreground',
    warning: 'text-amber-600',
    destructive: 'text-destructive',
    success: 'text-green-600',
  }[variant];

  return (
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <div className={`flex items-center gap-2 ${textClass}`}>
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

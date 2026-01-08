/**
 * Backup Schedule Panel
 * 
 * Admin interface for viewing and configuring backup schedules
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  Calendar,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { useBackupSnapshots, useBackupScheduleConfig, useUpdateBackupScheduleConfig } from '@/hooks/useDisasterRecovery';
import { BackupSnapshot, formatBackupSize } from '@/lib/disaster-recovery';

interface BackupSchedulePanelProps {
  schoolId: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  expired: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function BackupSchedulePanel({ schoolId }: BackupSchedulePanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { data: snapshots, isLoading: loadingSnapshots } = useBackupSnapshots(schoolId);
  const { data: config, isLoading: loadingConfig } = useBackupScheduleConfig(schoolId);
  const updateConfig = useUpdateBackupScheduleConfig();

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig.mutate({
      schoolId,
      config: { enabled },
    });
  };

  const handleUpdateTime = (time: string) => {
    updateConfig.mutate({
      schoolId,
      config: { snapshot_time: time },
    });
  };

  if (loadingSnapshots || loadingConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Automatic Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Automatic Backups
              </CardTitle>
              <CardDescription>
                Daily encrypted backups to ensure data safety
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={config?.enabled ? 'default' : 'secondary'}>
                {config?.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            {config?.last_snapshot_at && (
              <span className="text-sm text-muted-foreground">
                Last backup: {format(new Date(config.last_snapshot_at), 'MMM d, h:mm a')}
              </span>
            )}
            {config?.next_snapshot_at && (
              <span className="text-sm text-muted-foreground">
                Next: {format(new Date(config.next_snapshot_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable automatic backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily snapshots at scheduled time
                  </p>
                </div>
                <Switch
                  checked={config?.enabled ?? true}
                  onCheckedChange={handleToggleEnabled}
                  disabled={updateConfig.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Backup Time</Label>
                  <Input
                    type="time"
                    value={config?.snapshot_time?.slice(0, 5) || '02:00'}
                    onChange={(e) => handleUpdateTime(e.target.value + ':00')}
                    disabled={updateConfig.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={config?.snapshot_timezone || 'Africa/Lusaka'} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lusaka">Africa/Lusaka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Snapshot retention:</span>{' '}
                  <span className="font-medium">{config?.snapshot_retention_days || 30} days</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Incremental retention:</span>{' '}
                  <span className="font-medium">{config?.incremental_retention_days || 14} days</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Backups
          </CardTitle>
          <CardDescription>
            Last 30 days of backup history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots.slice(0, 10).map((snapshot) => (
                <BackupSnapshotRow key={snapshot.id} snapshot={snapshot} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No backups yet. Backups will run automatically based on your schedule.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackupSnapshotRow({ snapshot }: { snapshot: BackupSnapshot }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {STATUS_ICONS[snapshot.status]}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{snapshot.backup_type}</span>
            <Badge variant={snapshot.encrypted ? 'default' : 'outline'} className="text-xs">
              {snapshot.encrypted ? '🔒 Encrypted' : 'Unencrypted'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {snapshot.completed_at 
              ? format(new Date(snapshot.completed_at), 'MMM d, yyyy h:mm a')
              : format(new Date(snapshot.scheduled_at), 'Scheduled: MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {snapshot.file_size_bytes && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatBackupSize(snapshot.file_size_bytes)}
          </span>
        )}
        {snapshot.record_counts && Object.keys(snapshot.record_counts).length > 0 && (
          <span className="text-sm text-muted-foreground">
            {Object.values(snapshot.record_counts).reduce((a, b) => a + b, 0).toLocaleString()} records
          </span>
        )}
      </div>
    </div>
  );
}

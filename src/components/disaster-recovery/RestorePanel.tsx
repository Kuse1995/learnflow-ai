/**
 * Restore Panel
 * 
 * Admin interface for requesting and managing restore operations
 */

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RotateCcw,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  useBackupSnapshots,
  useRestoreRequests,
  useRequestRestore,
  useConfirmRestore,
  useCancelRestore,
} from '@/hooks/useDisasterRecovery';
import {
  RestoreScope,
  RestoreRequest,
  RESTORE_SCOPE_LABELS,
  RESTORE_SCOPE_DESCRIPTIONS,
  calculateDataLossWindow,
  getAffectedModules,
} from '@/lib/disaster-recovery';
import { cn } from '@/lib/utils';

interface RestorePanelProps {
  schoolId: string;
  userId: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: 'secondary' },
  confirmed: { icon: <Play className="h-3 w-3" />, variant: 'default' },
  in_progress: { icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: 'default' },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default' },
  failed: { icon: <XCircle className="h-3 w-3" />, variant: 'destructive' },
  cancelled: { icon: <XCircle className="h-3 w-3" />, variant: 'outline' },
};

export function RestorePanel({ schoolId, userId }: RestorePanelProps) {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [scope, setScope] = useState<RestoreScope>('full');
  const [restoreDate, setRestoreDate] = useState<Date | undefined>(undefined);
  const [isDryRun, setIsDryRun] = useState(true);

  const { data: snapshots, isLoading: loadingSnapshots } = useBackupSnapshots(schoolId);
  const { data: restoreRequests, isLoading: loadingRequests } = useRestoreRequests(schoolId);
  const requestRestore = useRequestRestore();
  const confirmRestore = useConfirmRestore();
  const cancelRestore = useCancelRestore();

  const dataLossHours = restoreDate ? calculateDataLossWindow(restoreDate) : 0;
  const affectedModules = getAffectedModules(scope);

  const handleRequestRestore = () => {
    if (!restoreDate) return;
    
    requestRestore.mutate({
      schoolId,
      requestedBy: userId,
      restorePoint: restoreDate,
      scope,
      isDryRun,
    });
    setRestoreOpen(false);
    setRestoreDate(undefined);
  };

  const handleConfirm = (request: RestoreRequest) => {
    confirmRestore.mutate({
      requestId: request.id,
      confirmedBy: userId,
      schoolId,
    });
  };

  const handleCancel = (request: RestoreRequest) => {
    cancelRestore.mutate({
      requestId: request.id,
      schoolId,
    });
  };

  if (loadingSnapshots || loadingRequests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restore Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restore Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restore Data
          </CardTitle>
          <CardDescription>
            Restore your school data to a previous point in time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Restore Safeguards</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                <li>Always run a dry-run first to preview what will be restored</li>
                <li>Restoration requires explicit confirmation</li>
                <li>All restore actions are logged in the audit trail</li>
                <li>Integrity checks run automatically after restore</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <DialogTrigger asChild>
              <Button>
                <RotateCcw className="mr-2 h-4 w-4" />
                Request Restore
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Data Restore</DialogTitle>
                <DialogDescription>
                  Select a restore point and scope. We recommend running a dry-run first.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Restore Date */}
                <div className="space-y-2">
                  <Label>Restore Point</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !restoreDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {restoreDate ? format(restoreDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={restoreDate}
                        onSelect={setRestoreDate}
                        disabled={(date) => date > new Date() || date < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Restore Scope */}
                <div className="space-y-2">
                  <Label>Restore Scope</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as RestoreScope)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RESTORE_SCOPE_LABELS) as RestoreScope[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {RESTORE_SCOPE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {RESTORE_SCOPE_DESCRIPTIONS[scope]}
                  </p>
                </div>

                {/* Dry Run Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRun"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="dryRun">
                    Dry run (simulation only - no actual changes)
                  </Label>
                </div>

                {/* Warning */}
                {restoreDate && (
                  <Alert variant="destructive" className="bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <p>
                        <strong>Data loss window:</strong> {dataLossHours} hours
                      </p>
                      <p className="text-sm mt-1">
                        Changes made after {format(restoreDate, 'PPP')} will be lost.
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Affected modules:</strong> {affectedModules.join(', ')}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRestoreOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestRestore}
                  disabled={!restoreDate || requestRestore.isPending}
                >
                  {isDryRun ? 'Run Simulation' : 'Request Restore'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Restore History */}
      <Card>
        <CardHeader>
          <CardTitle>Restore History</CardTitle>
          <CardDescription>
            Recent restore requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restoreRequests && restoreRequests.length > 0 ? (
            <div className="space-y-3">
              {restoreRequests.map((request) => (
                <RestoreRequestRow
                  key={request.id}
                  request={request}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  isPending={confirmRestore.isPending || cancelRestore.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No restore requests yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RestoreRequestRow({ 
  request, 
  onConfirm, 
  onCancel,
  isPending,
}: { 
  request: RestoreRequest;
  onConfirm: (r: RestoreRequest) => void;
  onCancel: (r: RestoreRequest) => void;
  isPending: boolean;
}) {
  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{RESTORE_SCOPE_LABELS[request.restore_scope]}</span>
          <Badge variant={config.variant} className="gap-1">
            {config.icon}
            {request.status}
          </Badge>
          {request.dry_run && (
            <Badge variant="outline">Dry Run</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Restore to: {format(new Date(request.restore_point), 'MMM d, yyyy')}
        </p>
        <p className="text-xs text-muted-foreground">
          Requested {formatDistanceToNow(new Date(request.requested_at))} ago
          {request.data_loss_window_hours && ` • ${request.data_loss_window_hours}h data loss window`}
        </p>
        {request.integrity_check_passed !== null && (
          <p className="text-xs">
            Integrity check: {request.integrity_check_passed 
              ? <span className="text-green-600">Passed</span> 
              : <span className="text-destructive">Failed</span>}
          </p>
        )}
      </div>
      
      <div className="flex gap-2">
        {request.status === 'pending' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(request)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onConfirm(request)}
              disabled={isPending}
            >
              Confirm
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

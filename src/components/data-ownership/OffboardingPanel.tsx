/**
 * Offboarding Panel
 * 
 * Admin interface for initiating and managing school offboarding
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
import { Textarea } from '@/components/ui/textarea';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  LogOut,
  AlertTriangle,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  FileArchive,
} from 'lucide-react';
import { useOffboardingStatus, useInitiateOffboarding, useCancelOffboarding } from '@/hooks/useSchoolOffboarding';
import {
  OFFBOARDING_STATUS_LABELS,
  OFFBOARDING_STATUS_DESCRIPTIONS,
  getCoolingPeriodDaysRemaining,
} from '@/lib/school-offboarding';

interface OffboardingPanelProps {
  schoolId: string;
  schoolName: string;
  userId: string;
}

export function OffboardingPanel({ schoolId, schoolName, userId }: OffboardingPanelProps) {
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: offboardingStatus, isLoading } = useOffboardingStatus(schoolId);
  const initiateOffboarding = useInitiateOffboarding();
  const cancelOffboarding = useCancelOffboarding();

  const handleInitiate = () => {
    initiateOffboarding.mutate({
      schoolId,
      requestedBy: userId,
      reason: reason || undefined,
    });
    setConfirmOpen(false);
    setReason('');
  };

  const handleCancel = () => {
    if (!offboardingStatus) return;
    cancelOffboarding.mutate({
      requestId: offboardingStatus.id,
      cancelledBy: userId,
      schoolId,
    });
    setCancelOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            School Offboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active offboarding in progress
  if (offboardingStatus && offboardingStatus.status !== 'cancelled') {
    const daysRemaining = getCoolingPeriodDaysRemaining(offboardingStatus.cooling_period_ends_at);
    const progressPercent = offboardingStatus.status === 'cooling_period' 
      ? ((14 - daysRemaining) / 14) * 100 
      : 0;

    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Offboarding in Progress
          </CardTitle>
          <CardDescription>
            {OFFBOARDING_STATUS_DESCRIPTIONS[offboardingStatus.status]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-4">
            <Badge variant="destructive">
              {OFFBOARDING_STATUS_LABELS[offboardingStatus.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Initiated {formatDistanceToNow(new Date(offboardingStatus.requested_at))} ago
            </span>
          </div>

          {/* Cooling Period Progress */}
          {offboardingStatus.status === 'cooling_period' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cooling Period</span>
                <span className="font-medium">{daysRemaining} days remaining</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Ends {offboardingStatus.cooling_period_ends_at && 
                  format(new Date(offboardingStatus.cooling_period_ends_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Export Required */}
          {offboardingStatus.status === 'export_pending' && (
            <Alert>
              <FileArchive className="h-4 w-4" />
              <AlertTitle>Mandatory Export Required</AlertTitle>
              <AlertDescription>
                You must complete a full data export before the offboarding can proceed.
                This ensures you have a complete copy of all school data.
              </AlertDescription>
            </Alert>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Offboarding Timeline</h4>
            <div className="space-y-2 text-sm">
              <TimelineStep 
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                label="Request submitted"
                date={offboardingStatus.requested_at}
                completed
              />
              <TimelineStep 
                icon={offboardingStatus.export_job_id 
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <Clock className="h-4 w-4 text-muted-foreground" />}
                label="Full data export"
                completed={!!offboardingStatus.export_job_id}
              />
              <TimelineStep 
                icon={offboardingStatus.status === 'cooling_period'
                  ? <Clock className="h-4 w-4 text-amber-500" />
                  : <Clock className="h-4 w-4 text-muted-foreground" />}
                label="14-day cooling period"
                completed={false}
                active={offboardingStatus.status === 'cooling_period'}
              />
              <TimelineStep 
                icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
                label="Account deactivation"
                completed={false}
              />
            </div>
          </div>

          {/* Reason */}
          {offboardingStatus.reason && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Reason provided</h4>
              <p className="text-sm text-muted-foreground">{offboardingStatus.reason}</p>
            </div>
          )}

          {/* Cancel Button */}
          {['requested', 'export_pending', 'cooling_period'].includes(offboardingStatus.status) && (
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Cancel Offboarding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Offboarding?</DialogTitle>
                  <DialogDescription>
                    This will cancel the offboarding process and the school will continue
                    operating normally. You can restart offboarding later if needed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelOpen(false)}>
                    Keep Offboarding
                  </Button>
                  <Button onClick={handleCancel}>
                    Yes, Cancel Offboarding
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    );
  }

  // No active offboarding - show initiate option
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Right to Leave
        </CardTitle>
        <CardDescription>
          Your school owns its data. You can leave the platform at any time with a full export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Ownership Statement */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Data Ownership Guarantee</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Your school owns all data stored in the platform</li>
              <li>We are a data processor, not a data owner</li>
              <li>You can export all data at any time</li>
              <li>Data is retained for 12 months after deactivation</li>
              <li>No vendor lock-in - your data is portable</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Offboarding Process */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Offboarding Process</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Request offboarding (optional reason)</li>
            <li>Complete mandatory full data export</li>
            <li>14-day cooling period (read-only mode)</li>
            <li>Account deactivation</li>
          </ol>
        </div>

        {/* Initiate Button */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Initiate Offboarding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate School Offboarding</DialogTitle>
              <DialogDescription>
                This will begin the offboarding process for <strong>{schoolName}</strong>.
                You will need to complete a full data export before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  placeholder="Why is the school leaving the platform?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  After the 14-day cooling period, all users will be logged out and
                  the school will be deactivated. This action can be cancelled during
                  the cooling period.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleInitiate}>
                Begin Offboarding
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function TimelineStep({ 
  icon, 
  label, 
  date, 
  completed, 
  active 
}: { 
  icon: React.ReactNode;
  label: string;
  date?: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${active ? 'font-medium' : ''}`}>
      {icon}
      <span className={completed ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      {date && (
        <span className="text-xs text-muted-foreground">
          {format(new Date(date), 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
}

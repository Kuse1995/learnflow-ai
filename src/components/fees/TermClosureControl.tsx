import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock, 
  Unlock,
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import {
  useTermClosure,
  useTermSummary,
  useCloseTerm,
  getTermLabel,
  formatClosureDate,
} from '@/hooks/useTermClosure';
import { formatZMW } from '@/lib/school-fees-system';

interface TermClosureControlProps {
  schoolId: string;
  academicYear: number;
  term: number;
  canCloseTerm?: boolean;
}

export function TermClosureControl({
  schoolId,
  academicYear,
  term,
  canCloseTerm = false,
}: TermClosureControlProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [approverName, setApproverName] = useState('');
  
  const { data: closure, isLoading: isLoadingClosure } = useTermClosure(
    schoolId,
    academicYear,
    term
  );
  const { data: summary, isLoading: isLoadingSummary } = useTermSummary(
    schoolId,
    academicYear,
    term
  );
  const closeTerm = useCloseTerm();

  const isClosed = closure?.isClosed ?? false;

  const handleCloseTerm = async () => {
    if (!approverName.trim()) return;

    await closeTerm.mutateAsync({
      schoolId,
      academicYear,
      term,
      closedBy: approverName.trim(),
    });

    setIsConfirmOpen(false);
    setApproverName('');
  };

  if (isLoadingClosure || isLoadingSummary) {
    return <TermClosureControlSkeleton />;
  }

  return (
    <>
      <Card className={isClosed ? 'border-muted' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isClosed ? (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">
                  {getTermLabel(term)} {academicYear}
                </CardTitle>
                <CardDescription>
                  {isClosed ? 'Financial records finalized' : 'Currently active'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isClosed ? 'secondary' : 'default'}>
              {isClosed ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Term Closed
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Open
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Total Fees
              </div>
              <p className="text-lg font-semibold">
                {formatZMW(
                  isClosed 
                    ? (closure?.totalFeesCharged || 0)
                    : (summary?.totalFees || 0)
                )}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Collected
              </div>
              <p className="text-lg font-semibold text-emerald-600">
                {formatZMW(
                  isClosed
                    ? (closure?.totalPaymentsReceived || 0)
                    : (summary?.totalPayments || 0)
                )}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Outstanding
              </div>
              <p className="text-lg font-semibold text-amber-600">
                {formatZMW(
                  isClosed
                    ? (closure?.outstandingBalance || 0)
                    : (summary?.outstandingBalance || 0)
                )}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                Students
              </div>
              <p className="text-lg font-semibold">
                {isClosed ? (closure?.studentCount || 0) : (summary?.studentCount || 0)}
              </p>
            </div>
          </div>

          {/* Closure Info */}
          {isClosed && closure && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Closed on {formatClosureDate(closure.closedAt)} by {closure.closedBy}
                </span>
              </div>
            </div>
          )}

          {/* Close Term Action */}
          {!isClosed && canCloseTerm && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(true)}
                className="w-full"
              >
                <Lock className="h-4 w-4 mr-2" />
                Close {getTermLabel(term)}
              </Button>
            </div>
          )}

          {/* Closed Term Message */}
          {isClosed && (
            <div className="pt-3 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <p className="text-sm text-muted-foreground">
                This term's fee records have been finalized. No new fees, payments, 
                or adjustments can be added. Post-term corrections must be recorded 
                in a subsequent term.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Close {getTermLabel(term)} {academicYear}?
            </DialogTitle>
            <DialogDescription>
              Closing a term locks all financial records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Fees Charged:</span>
                <span className="font-medium">
                  {formatZMW(summary?.totalFees || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Payments Received:</span>
                <span className="font-medium text-emerald-600">
                  {formatZMW(summary?.totalPayments || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Adjustments:</span>
                <span className="font-medium">
                  {formatZMW(summary?.totalAdjustments || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Outstanding Balance:</span>
                <span className="font-bold text-amber-600">
                  {formatZMW(summary?.outstandingBalance || 0)}
                </span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800 dark:text-amber-200">
                <p className="font-medium">After closing:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                  <li>No new fees can be added to this term</li>
                  <li>No new payments can be recorded for this term</li>
                  <li>No new adjustments can be made for this term</li>
                  <li>Corrections require a new entry in the next term</li>
                </ul>
              </div>
            </div>

            {/* Approver Name */}
            <div>
              <Label htmlFor="approver">Your Name (for records)</Label>
              <Input
                id="approver"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseTerm}
              disabled={!approverName.trim() || closeTerm.isPending}
            >
              {closeTerm.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Close Term
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TermClosureControlSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

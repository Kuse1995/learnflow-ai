import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import {
  useStudentLedger,
  useStudentBalance,
  useFormatBalance,
} from '@/hooks/useStudentFees';
import { RecordPaymentForm } from './RecordPaymentForm';

interface StudentFeesTabProps {
  studentId: string;
  studentName: string;
  schoolId: string;
  academicYear?: number;
  term?: number;
  canRecordPayment?: boolean;
}

/**
 * Student Fees Tab Component
 * 
 * Shows fee summary, ledger entries, and payment history.
 * Read-only for most users, with optional payment recording for authorized staff.
 */
export function StudentFeesTab({
  studentId,
  studentName,
  schoolId,
  academicYear = new Date().getFullYear(),
  term,
  canRecordPayment = false,
}: StudentFeesTabProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const { data: balance, isLoading: isLoadingBalance } = useStudentBalance(studentId);
  const { data: ledger, isLoading: isLoadingLedger } = useStudentLedger(
    studentId,
    academicYear,
    term
  );
  const { formatAmount, getStatusLabel, getStatusColor } = useFormatBalance();

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
  };

  if (isLoadingBalance) {
    return <StudentFeesTabSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Balance Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Fee Summary</CardTitle>
              <CardDescription>
                {academicYear} {term ? `Term ${term}` : 'Full Year'}
              </CardDescription>
            </div>
            {balance && (
              <Badge className={getStatusColor(balance.status)}>
                {getStatusLabel(balance.status)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Fees</p>
              <p className="text-xl font-semibold">
                {balance ? formatAmount(balance.totalCharges) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-xl font-semibold text-emerald-600">
                {balance ? formatAmount(balance.totalPayments) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl font-semibold text-amber-600">
                {balance ? formatAmount(balance.currentBalance) : '-'}
              </p>
            </div>
          </div>

          {canRecordPayment && (
            <div className="mt-4 pt-4 border-t">
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Record a payment for {studentName}
                    </DialogDescription>
                  </DialogHeader>
                  <RecordPaymentForm
                    studentId={studentId}
                    studentName={studentName}
                    schoolId={schoolId}
                    academicYear={academicYear}
                    term={term ?? null}
                    currentBalance={balance?.currentBalance || 0}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setIsPaymentDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger / Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>
            All fee charges and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLedger ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ledger && ledger.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.entryDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.entryType === 'charge' || entry.entryType === 'adjustment_debit' ? (
                          <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          {entry.referenceNumber && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {entry.referenceNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {entry.debitAmount > 0 ? formatAmount(entry.debitAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {entry.creditAmount > 0 ? formatAmount(entry.creditAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(entry.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No transactions recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentFeesTabSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

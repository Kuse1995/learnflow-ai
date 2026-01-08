import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  User,
  FileText,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePaymentPlan, useUpdatePaymentPlanStatus } from '@/hooks/usePaymentPlans';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { useAuthContext } from '@/contexts/AuthContext';
import { 
  PLAN_STATUS_CONFIG, 
  INSTALLMENT_STATUS_CONFIG,
  type PaymentPlanStatus,
  type InstallmentStatus,
} from '@/lib/payment-plan-system';

interface PaymentPlanDetailsProps {
  planId: string;
  onClose: () => void;
}

export function PaymentPlanDetails({ planId, onClose }: PaymentPlanDetailsProps) {
  const { user } = useAuthContext();
  const { data: plan, isLoading } = usePaymentPlan(planId);
  const { formatAmount } = useFormatBalance();
  const updateStatus = useUpdatePaymentPlanStatus();

  if (isLoading) {
    return <PaymentPlanDetailsSkeleton />;
  }

  if (!plan) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Payment plan not found.
      </div>
    );
  }

  const statusConfig = PLAN_STATUS_CONFIG[plan.status];
  const progressPercent = plan.totalAmount > 0
    ? Math.round((plan.totalPaid / plan.totalAmount) * 100)
    : 0;

  const handleApprove = () => {
    if (user?.id) {
      updateStatus.mutate({
        planId: plan.id,
        status: 'approved',
        approvedBy: user.id,
      });
    }
  };

  const handleActivate = () => {
    updateStatus.mutate({
      planId: plan.id,
      status: 'active',
    });
  };

  const handleCancel = () => {
    updateStatus.mutate({
      planId: plan.id,
      status: 'cancelled',
      notes: 'Cancelled by admin',
    });
  };

  const getInstallmentStatusIcon = (status: InstallmentStatus) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'partial': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'waived': return <Check className="h-4 w-4 text-purple-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            {plan.planName || 'Payment Plan'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {plan.academicYear} Term {plan.term}
          </p>
        </div>
        <Badge className={`${statusConfig?.bgColor} ${statusConfig?.color}`}>
          {statusConfig?.label || plan.status}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Payment Progress</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Paid: {formatAmount(plan.totalPaid)}</span>
          <span>Remaining: {formatAmount(plan.remainingAmount)}</span>
        </div>
      </div>

      {/* Plan Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Total Amount</p>
          <p className="font-medium">{formatAmount(plan.totalAmount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Installments</p>
          <p className="font-medium">{plan.installmentCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Start Date</p>
          <p className="font-medium">{format(new Date(plan.startDate), 'dd MMM yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Created</p>
          <p className="font-medium">{format(new Date(plan.createdAt), 'dd MMM yyyy')}</p>
        </div>
      </div>

      {plan.notes && (
        <div className="text-sm">
          <p className="text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Notes
          </p>
          <p className="mt-1">{plan.notes}</p>
        </div>
      )}

      <Separator />

      {/* Installments Table */}
      <div>
        <h4 className="font-medium mb-3">Installment Schedule</h4>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.installments?.map((inst) => {
                const instStatusConfig = INSTALLMENT_STATUS_CONFIG[inst.status];
                return (
                  <TableRow key={inst.id}>
                    <TableCell>{inst.installmentNumber}</TableCell>
                    <TableCell>
                      {format(new Date(inst.dueDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(inst.amount)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {inst.amountPaid > 0 ? formatAmount(inst.amountPaid) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${instStatusConfig?.bgColor} ${instStatusConfig?.color} flex items-center gap-1 w-fit`}
                      >
                        {getInstallmentStatusIcon(inst.status)}
                        {instStatusConfig?.label || inst.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        {plan.status === 'draft' && (
          <Button onClick={handleApprove} disabled={updateStatus.isPending}>
            <Check className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        )}
        {plan.status === 'pending_approval' && (
          <Button onClick={handleApprove} disabled={updateStatus.isPending}>
            <Check className="h-4 w-4 mr-2" />
            Approve Plan
          </Button>
        )}
        {plan.status === 'approved' && (
          <Button onClick={handleActivate} disabled={updateStatus.isPending}>
            <Check className="h-4 w-4 mr-2" />
            Activate Plan
          </Button>
        )}
        {['draft', 'pending_approval', 'approved', 'active'].includes(plan.status) && (
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={updateStatus.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Plan
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function PaymentPlanDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

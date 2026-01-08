import { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { useSchoolPaymentPlans } from '@/hooks/usePaymentPlans';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { PLAN_STATUS_CONFIG, type PaymentPlanStatus } from '@/lib/payment-plan-system';
import { CreatePaymentPlanDialog } from './CreatePaymentPlanDialog';
import { PaymentPlanDetails } from './PaymentPlanDetails';

interface PaymentPlanManagerProps {
  schoolId: string;
  academicYear?: number;
  term?: number;
}

/**
 * Payment Plan Manager
 * 
 * Lists all payment plans with filtering, and allows creating new plans.
 */
export function PaymentPlanManager({
  schoolId,
  academicYear = new Date().getFullYear(),
  term,
}: PaymentPlanManagerProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans, isLoading } = useSchoolPaymentPlans(schoolId, academicYear, term);
  const { formatAmount } = useFormatBalance();

  // Filter plans
  const filteredPlans = plans?.filter(plan => {
    return statusFilter === 'all' || plan.status === statusFilter;
  }) || [];

  // Get status icon
  const getStatusIcon = (status: PaymentPlanStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'active': 
      case 'approved': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'defaulted': return <AlertTriangle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <PaymentPlanSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Payment Plans</CardTitle>
              <CardDescription>
                {filteredPlans.length} plans for {academicYear} {term ? `Term ${term}` : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPlans.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Plan Amount</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Installments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => {
                    const statusConfig = PLAN_STATUS_CONFIG[plan.status as PaymentPlanStatus];
                    const progressPercent = plan.totalAmount > 0
                      ? Math.round((plan.totalPaid / plan.totalAmount) * 100)
                      : 0;

                    return (
                      <TableRow 
                        key={plan.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        <TableCell className="font-medium">
                          {plan.studentName || 'Unknown Student'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatAmount(plan.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              Paid: {formatAmount(plan.totalPaid)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={progressPercent} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {progressPercent}% complete
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan.installmentCount} installments
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig?.bgColor} ${statusConfig?.color} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(plan.status as PaymentPlanStatus)}
                            {statusConfig?.label || plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(plan.createdAt), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No payment plans found</p>
              <p className="text-sm">Create a payment plan for students who need flexible payment options.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <CreatePaymentPlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        schoolId={schoolId}
        academicYear={academicYear}
        term={term}
      />

      {/* Plan Details Dialog */}
      <Dialog open={!!selectedPlanId} onOpenChange={(open) => !open && setSelectedPlanId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Plan Details</DialogTitle>
            <DialogDescription>
              View and manage payment plan installments
            </DialogDescription>
          </DialogHeader>
          {selectedPlanId && (
            <PaymentPlanDetails 
              planId={selectedPlanId} 
              onClose={() => setSelectedPlanId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentPlanSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

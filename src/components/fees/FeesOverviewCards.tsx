import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { useSchoolFeeMetrics } from '@/hooks/useSchoolFeeMetrics';
import { useFormatBalance } from '@/hooks/useStudentFees';

interface FeesOverviewCardsProps {
  schoolId: string;
  academicYear?: number;
  term?: number;
}

/**
 * Fees Overview Cards
 * 
 * Shows key financial metrics for the school:
 * - Total expected fees
 * - Total collected
 * - Outstanding balance
 * - Student payment status breakdown
 */
export function FeesOverviewCards({ 
  schoolId, 
  academicYear = new Date().getFullYear(),
  term 
}: FeesOverviewCardsProps) {
  const { data: metrics, isLoading } = useSchoolFeeMetrics(schoolId, academicYear, term);
  const { formatAmount } = useFormatBalance();

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No fee data available for this period.
        </CardContent>
      </Card>
    );
  }

  const collectionRate = metrics.expectedTotal > 0 
    ? Math.round((metrics.collectedTotal / metrics.expectedTotal) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Expected Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Fees</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(metrics.expectedTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {academicYear} {term ? `Term ${term}` : 'Full Year'}
            </p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatAmount(metrics.collectedTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {collectionRate}% collection rate
            </p>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatAmount(metrics.outstandingTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics.studentsWithBalance} students
            </p>
          </CardContent>
        </Card>

        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              With fee assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Status Breakdown</CardTitle>
          <CardDescription>
            Student payment status for {academicYear} {term ? `Term ${term}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Fully Paid */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{metrics.paidCount}</p>
                <p className="text-sm text-muted-foreground">Fully Paid</p>
              </div>
              <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">
                {metrics.totalStudents > 0 
                  ? Math.round((metrics.paidCount / metrics.totalStudents) * 100) 
                  : 0}%
              </Badge>
            </div>

            {/* Partial */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{metrics.partialCount}</p>
                <p className="text-sm text-muted-foreground">Partial Payment</p>
              </div>
              <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                {metrics.totalStudents > 0 
                  ? Math.round((metrics.partialCount / metrics.totalStudents) * 100) 
                  : 0}%
              </Badge>
            </div>

            {/* Unpaid */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{metrics.unpaidCount}</p>
                <p className="text-sm text-muted-foreground">No Payment</p>
              </div>
              <Badge variant="secondary" className="ml-auto bg-red-100 text-red-700">
                {metrics.totalStudents > 0 
                  ? Math.round((metrics.unpaidCount / metrics.totalStudents) * 100) 
                  : 0}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
